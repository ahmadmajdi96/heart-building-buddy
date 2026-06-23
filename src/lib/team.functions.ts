import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Role = "owner" | "partner" | "associate" | "paralegal" | "accountant" | "assistant";

async function getCallerOrg(ctx: { supabase: any; userId: string }) {
  const { data: mem, error } = await ctx.supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!mem) throw new Error("No active organization");
  return mem as { org_id: string; role: Role };
}

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const mem = await getCallerOrg(context);
    const { data: rows, error } = await context.supabase
      .from("organization_members")
      .select("id, user_id, invited_email, role, status, created_at")
      .eq("org_id", mem.org_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const userIds = (rows ?? []).map((r: any) => r.user_id).filter(Boolean);
    const profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.length) {
      try {
        const { data: profs } = await context.supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        for (const p of profs ?? []) profilesMap[p.id] = { full_name: p.full_name, email: null };
      } catch { /* ignore */ }
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results = await Promise.allSettled(
          userIds.map((uid: string) => supabaseAdmin.auth.admin.getUserById(uid))
        );
        results.forEach((res, i) => {
          const uid = userIds[i];
          if (res.status === "fulfilled" && res.value.data?.user) {
            profilesMap[uid] = {
              full_name: profilesMap[uid]?.full_name ?? null,
              email: res.value.data.user.email ?? null,
            };
          }
        });
      } catch { /* ignore */ }
    }

    return (rows ?? []).map((r: any) => ({
      ...r,
      name: r.user_id ? profilesMap[r.user_id]?.full_name ?? null : null,
      email: r.user_id ? profilesMap[r.user_id]?.email ?? r.invited_email : r.invited_email,
    }));
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: Role; redirectTo?: string }) =>
    z.object({
      email: z.string().email(),
      role: z.enum(["owner","partner","associate","paralegal","accountant","assistant"]),
      redirectTo: z.string().url().optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    if (mem.role !== "owner" && mem.role !== "partner") throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase().trim();
    const redirectTo = data.redirectTo;

    // Try to invite — creates user + emails them. If user already exists, fall back to generateLink recovery.
    let userId: string | null = null;
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
    if (inviteErr) {
      // User likely already exists — look them up
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!existing) throw new Error(inviteErr.message);
      userId = existing.id;
      // Send a magic link so they can sign in & set/keep their password
      if (redirectTo) {
        await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
      }
    } else {
      userId = invited.user?.id ?? null;
    }
    if (!userId) throw new Error("Failed to create user");

    // Upsert membership
    const { data: existingMem } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("org_id", mem.org_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMem) {
      await supabaseAdmin.from("organization_members")
        .update({ role: data.role, status: "active", invited_email: email })
        .eq("id", existingMem.id);
    } else {
      const { error: insErr } = await supabaseAdmin.from("organization_members").insert({
        org_id: mem.org_id, user_id: userId, invited_email: email, role: data.role, status: "active",
      });
      if (insErr) throw new Error(insErr.message);
    }
    return { ok: true, userId };
  });

export const updateTeamMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; role: Role }) =>
    z.object({ id: z.string().uuid(), role: z.enum(["owner","partner","associate","paralegal","accountant","assistant"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    if (mem.role !== "owner" && mem.role !== "partner") throw new Error("Forbidden");
    const { error } = await context.supabase.from("organization_members").update({ role: data.role }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    if (mem.role !== "owner" && mem.role !== "partner") throw new Error("Forbidden");
    const { error } = await context.supabase.from("organization_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
