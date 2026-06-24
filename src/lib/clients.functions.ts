import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ClientInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  national_id: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  type: z.enum(["individual", "company"]).default("individual"),
  country: z.string().optional(),
  tax_id: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("*, cases(id,status), client_interactions(id, occurred_at)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => {
      const active = (c.cases ?? []).filter((cs: any) => ["open", "pending"].includes(cs.status)).length;
      const total = (c.cases ?? []).length;
      const lastIntr = (c.client_interactions ?? []).map((i: any) => i.occurred_at).sort().pop() ?? null;
      const { cases: _c, client_interactions: _i, ...rest } = c;
      return { ...rest, _active_cases: active, _total_cases: total, _last_interaction: lastIntr };
    });
  });

export const getClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: client, error }, { data: interactions }, { data: cases }] = await Promise.all([
      context.supabase.from("clients").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("client_interactions").select("*").eq("client_id", data.id).order("occurred_at", { ascending: false }),
      context.supabase.from("cases").select("id,title,case_number,status,priority,opened_at").eq("client_id", data.id).order("opened_at", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);
    return { client, interactions: interactions ?? [], cases: cases ?? [] };
  });

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClientInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload: any = { ...data, email: data.email || null, owner_id: context.userId };
    if (data.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await context.supabase.from("clients").update(rest).eq("id", id!).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("clients").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const InteractionInput = z.object({
  client_id: z.string().uuid(),
  kind: z.enum(["call", "session", "note", "email"]).default("note"),
  title: z.string().optional(),
  body: z.string().optional(),
  occurred_at: z.string().optional(),
});

export const addInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InteractionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("client_interactions").insert({
      ...data, owner_id: context.userId,
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("client_interactions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Conflict check: fuzzy-match a name (and optional id numbers) against existing
 *  clients and case parties. Returns conflicting matches with the case context. */
export const conflictCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().min(2),
      national_id: z.string().optional(),
      tax_id: z.string().optional(),
      email: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const tokens = data.name.trim().split(/\s+/).filter((t) => t.length >= 2);
    const orFilter = tokens.map((t) => `name.ilike.%${t}%`).join(",");

    const [clientsRes, partiesRes] = await Promise.all([
      sb.from("clients").select("id, name, email, national_id, tax_id, type, company").or(orFilter || `name.ilike.%${data.name}%`),
      sb.from("case_parties").select("id, name, role, case_id, cases(id, title, case_number, status)").or(orFilter || `name.ilike.%${data.name}%`),
    ]);

    const idMatches: any[] = [];
    if (data.national_id) {
      const { data: byNid } = await sb.from("clients").select("id, name, national_id").eq("national_id", data.national_id);
      idMatches.push(...(byNid ?? []).map((c: any) => ({ ...c, _match: "national_id" })));
    }
    if (data.tax_id) {
      const { data: byTax } = await sb.from("clients").select("id, name, tax_id").eq("tax_id", data.tax_id);
      idMatches.push(...(byTax ?? []).map((c: any) => ({ ...c, _match: "tax_id" })));
    }
    if (data.email) {
      const { data: byEmail } = await sb.from("clients").select("id, name, email").eq("email", data.email);
      idMatches.push(...(byEmail ?? []).map((c: any) => ({ ...c, _match: "email" })));
    }

    return {
      clients: clientsRes.data ?? [],
      parties: partiesRes.data ?? [],
      identityMatches: idMatches,
    };
  });
