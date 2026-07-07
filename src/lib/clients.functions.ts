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
    // Fire-and-forget SMS welcome to new client
    if (row?.phone) {
      const { fireSms } = await import("./whatsapp.server");
      const name = row.name || "";
      fireSms(
        row.phone,
        `Hello ${name}, your client profile has been created successfully. We will be in touch regarding your matters. — Legal Team`,
        { owner_id: context.userId, client_id: row.id, context: "client_welcome" },
      );
    }
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

/** Conflict check: fuzzy-match a name + optional national_id / tax_id / email / phone
 *  against existing clients and case parties. Returns categorized matches. */
export const conflictCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().min(2),
      national_id: z.string().optional(),
      tax_id: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;

    const cleanName = data.name.trim();
    const tokens = cleanName.split(/\s+/).filter((t) => t.length >= 2);
    const nameOr = tokens.length
      ? tokens.map((t) => `name.ilike.%${escapeIlike(t)}%`).join(",")
      : `name.ilike.%${escapeIlike(cleanName)}%`;

    // 1) Fuzzy name matches across clients + case parties
    const [clientsRes, partiesRes] = await Promise.all([
      sb.from("clients").select("id, name, email, phone, national_id, tax_id, type, company").or(nameOr),
      sb.from("case_parties").select("id, name, role, case_id, cases(id, title, case_number, status)").or(nameOr),
    ]);

    // 2) Exact identity matches — strongest signal
    const idMatches: any[] = [];
    if (data.national_id?.trim()) {
      const { data: byNid } = await sb.from("clients").select("id, name, national_id").eq("national_id", data.national_id.trim());
      idMatches.push(...(byNid ?? []).map((c: any) => ({ ...c, _match: "national_id" })));
    }
    if (data.tax_id?.trim()) {
      const { data: byTax } = await sb.from("clients").select("id, name, tax_id").eq("tax_id", data.tax_id.trim());
      idMatches.push(...(byTax ?? []).map((c: any) => ({ ...c, _match: "tax_id" })));
    }
    if (data.email?.trim()) {
      const { data: byEmail } = await sb.from("clients").select("id, name, email").ilike("email", data.email.trim());
      idMatches.push(...(byEmail ?? []).map((c: any) => ({ ...c, _match: "email" })));
    }
    if (data.phone?.trim()) {
      // Normalise: match on the last 8 digits of the phone (handles country-code differences)
      const digits = data.phone.replace(/\D/g, "");
      const last8 = digits.slice(-8);
      if (last8.length >= 6) {
        const { data: byPhone } = await sb.from("clients").select("id, name, phone").ilike("phone", `%${last8}%`);
        idMatches.push(...(byPhone ?? []).map((c: any) => ({ ...c, _match: "phone" })));
      }
    }

    // Deduplicate identity matches by (id + _match) so we don't repeat.
    const seen = new Set<string>();
    const dedupIdMatches = idMatches.filter((m) => {
      const k = `${m.id}:${m._match}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return {
      clients: (clientsRes.data ?? []) as any[],
      parties: (partiesRes.data ?? []) as any[],
      identityMatches: dedupIdMatches,
    };
  });

function escapeIlike(v: string) {
  return v.replace(/[%_,()]/g, (m) => `\\${m}`);
}
