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
    if (mem.role !== "owner" && mem.role !== "partner") {
      throw new Error("Forbidden / ممنوع: لا تملك صلاحية دعوة أعضاء الفريق.");
    }

    const email = data.email.toLowerCase().trim();

    // Check for an existing (active or pending) membership tied to this email within the org.
    const { data: existingMem, error: lookupErr } = await context.supabase
      .from("organization_members")
      .select("id, status, user_id")
      .eq("org_id", mem.org_id)
      .eq("invited_email", email)
      .maybeSingle();
    if (lookupErr) {
      throw new Error(
        "Failed to check existing membership / تعذّر التحقق من العضوية الحالية.",
      );
    }

    if (existingMem) {
      if (existingMem.status === "active") {
        throw new Error(
          "This person is already an active team member / هذا الشخص عضو نشط بالفعل في الفريق.",
        );
      }
      // Re-invite: refresh role and keep status pending.
      const { error: updErr } = await context.supabase
        .from("organization_members")
        .update({ role: data.role, status: "invited" })
        .eq("id", existingMem.id);
      if (updErr) {
        throw new Error(
          "Failed to update the invitation / تعذّر تحديث الدعوة.",
        );
      }
      return { ok: true, id: existingMem.id, status: "invited" as const };
    }

    // Insert a pending invitation row scoped by the caller's RLS session (no service-role required).
    const { data: inserted, error: insErr } = await context.supabase
      .from("organization_members")
      .insert({
        org_id: mem.org_id,
        user_id: null,
        invited_email: email,
        role: data.role,
        status: "invited",
      })
      .select("id")
      .single();
    if (insErr) {
      throw new Error(
        "Failed to create the invitation. Please try again / تعذّر إنشاء الدعوة، حاول مرة أخرى.",
      );
    }

    return { ok: true, id: inserted.id, status: "invited" as const };
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
