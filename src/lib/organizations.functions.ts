import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Every active membership of the caller, with its organization details. */
export const listMyOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("organization_members")
      .select("role, org_id, created_at, organizations(*)")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((m: any) => ({
      role: m.role as string,
      org: m.organizations,
    })).filter((r) => r.org);
  });

const CreateInput = z.object({
  legal_name: z.string().min(1),
  display_name: z.string().optional(),
  type: z.enum(["solo", "firm"]).default("solo"),
  currency: z.string().default("JOD"),
  preferred_language: z.enum(["ar", "en"]).default("en"),
});

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    // 1) Insert organization (RLS enforces created_by = auth.uid())
    const { data: org, error } = await context.supabase
      .from("organizations")
      .insert({
        legal_name: data.legal_name,
        display_name: data.display_name || data.legal_name,
        type: data.type,
        currency: data.currency,
        preferred_language: data.preferred_language,
        default_tax_rate: 0,
        invoice_prefix: "INV",
        quote_prefix: "QUO",
        created_by: context.userId,
      })
      .select()
      .maybeSingle();
    if (error || !org) throw new Error(error?.message ?? "Failed to create workspace");

    // 2) Insert owner membership for the current user
    const { error: memErr } = await context.supabase
      .from("organization_members")
      .insert({
        org_id: org.id,
        user_id: context.userId,
        role: "owner",
        status: "active",
      });
    if (memErr) throw new Error(memErr.message);

    return org;
  });

const RenameInput = z.object({
  id: z.string().uuid(),
  legal_name: z.string().min(1).optional(),
  display_name: z.string().optional(),
});

export const renameOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RenameInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: { legal_name?: string; display_name?: string | null } = {};
    if (data.legal_name !== undefined) patch.legal_name = data.legal_name;
    if (data.display_name !== undefined) patch.display_name = data.display_name || null;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase.from("organizations").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Owner-only delete. Will fail (FK) if the workspace has cases/clients/etc; that's on purpose. */
export const deleteOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Remove memberships first
    await context.supabase.from("organization_members").delete().eq("org_id", data.id);
    const { error } = await context.supabase.from("organizations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Leave the workspace (does not delete it). */
export const leaveOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("organization_members")
      .delete()
      .eq("org_id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
