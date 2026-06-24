import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCallerOrgId(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.org_id as string | undefined) ?? null;
}

export const listCaseMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ case_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("case_members")
      .select("id, user_id, role, created_at, profiles:user_id(full_name)")
      .eq("case_id", data.case_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addCaseMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      case_id: z.string().uuid(),
      user_id: z.string().uuid(),
      role: z.enum(["lead", "co_counsel", "associate", "paralegal", "support"]).default("associate"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("case_members")
      .insert({
        case_id: data.case_id,
        user_id: data.user_id,
        role: data.role,
        added_by: context.userId,
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCaseMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      role: z.enum(["lead", "co_counsel", "associate", "paralegal", "support"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("case_members")
      .update({ role: data.role })
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const removeCaseMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("case_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// List organization teammates the caller can invite onto a case
export const listAssignableUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await getCallerOrgId(context);
    if (!orgId) return [];
    const { data: members, error } = await context.supabase
      .from("organization_members")
      .select("user_id, role, status")
      .eq("org_id", orgId)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    const ids = (members ?? []).map((m: any) => m.user_id).filter(Boolean);
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const nameById: Record<string, string | null> = {};
    for (const p of profs ?? []) nameById[p.id] = p.full_name;
    return ids.map((id: string) => ({ user_id: id, full_name: nameById[id] ?? null }));
  });
