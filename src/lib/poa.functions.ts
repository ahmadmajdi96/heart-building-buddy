import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveOrgId } from "./active-org.server";

const PoaInput = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid().nullable().optional(),
  case_id: z.string().uuid().nullable().optional(),
  reference: z.string().optional(),
  scope: z.enum(["general", "litigation", "execution", "sale", "company", "sharia", "banking"]).default("litigation"),
  principal_name: z.string().min(1),
  principal_id_number: z.string().optional(),
  principal_address: z.string().optional(),
  agent_name: z.string().min(1),
  agent_bar_number: z.string().optional(),
  powers: z.array(z.string()).default([]),
  notary_office: z.string().optional(),
  notarised_on: z.string().nullable().optional(),
  starts_on: z.string().nullable().optional(),
  expires_on: z.string().nullable().optional(),
  status: z.enum(["draft", "active", "revoked", "expired"]).default("active"),
  notes: z.string().optional(),
});

export const listPowersOfAttorney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await getActiveOrgId(context);
    if (!orgId) return [];
    const { data, error } = await context.supabase
      .from("powers_of_attorney")
      .select("*, clients(id, name), cases(id, title, case_number)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const savePowerOfAttorney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PoaInput.parse(d))
  .handler(async ({ data, context }) => {
    const orgId = await getActiveOrgId(context);
    if (!orgId) throw new Error("No active workspace.");
    const payload = {
      ...data,
      client_id: data.client_id || null,
      case_id: data.case_id || null,
      notarised_on: data.notarised_on || null,
      starts_on: data.starts_on || null,
      expires_on: data.expires_on || null,
      org_id: orgId,
      owner_id: context.userId,
    };
    if (data.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await context.supabase
        .from("powers_of_attorney").update(rest).eq("id", id!).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("powers_of_attorney").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePowerOfAttorney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("powers_of_attorney").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Revoke a PoA and record when. */
export const revokePowerOfAttorney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), note: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("powers_of_attorney")
      .update({ status: "revoked", notes: data.note ?? null })
      .eq("id", data.id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
