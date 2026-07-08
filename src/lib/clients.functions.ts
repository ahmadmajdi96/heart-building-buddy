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
  locale: z.enum(["ar", "en"]).optional(),

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
    const sb = context.supabase as any;
    const [clientRes, interactions, cases] = await Promise.all([
      sb.from("clients").select("*").eq("id", data.id).maybeSingle(),
      sb.from("client_interactions").select("*").eq("client_id", data.id).order("occurred_at", { ascending: false }),
      sb.from("cases").select("id,title,case_number,status,priority,opened_at,agreed_fee,retainer_amount,hourly_rate,fee_currency").eq("client_id", data.id).order("opened_at", { ascending: false }),
    ]);
    if (clientRes.error) throw new Error(clientRes.error.message);
    const caseIds = (cases.data ?? []).map((c: any) => c.id);

    const [docs, appts, meetings, invoices, timeEntries] = await Promise.all([
      sb.from("documents").select("id,name,mime_type,size,case_id,client_id,created_at,cases(id,title)")
        .or(`client_id.eq.${data.id}${caseIds.length ? `,case_id.in.(${caseIds.join(",")})` : ""}`)
        .order("created_at", { ascending: false }),
      caseIds.length ? sb.from("appointments").select("*, cases(id,title)").in("case_id", caseIds).order("starts_at", { ascending: false }) : Promise.resolve({ data: [] }),
      caseIds.length ? sb.from("meetings").select("*, cases(id,title)").in("case_id", caseIds).order("starts_at", { ascending: false }) : Promise.resolve({ data: [] }),
      caseIds.length ? sb.from("tax_invoices").select("id, number, issue_date, due_date, status, total, amount_paid, currency, case_id, cases(id,title)").in("case_id", caseIds).order("issue_date", { ascending: false }) : Promise.resolve({ data: [] }),
      caseIds.length ? sb.from("time_entries").select("id, description, duration_seconds, hourly_rate, billable, status, started_at, case_id, cases(id,title)").in("case_id", caseIds).order("started_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);

    // Payments: fetch per invoice
    let payments: any[] = [];
    const invIds = (invoices.data ?? []).map((i: any) => i.id);
    if (invIds.length) {
      const { data: pdata } = await sb.from("payments").select("*, tax_invoices(id, number, case_id)").in("invoice_id", invIds).order("received_at", { ascending: false });
      payments = pdata ?? [];
    }

    return {
      client: clientRes.data,
      interactions: interactions.data ?? [],
      cases: cases.data ?? [],
      documents: docs.data ?? [],
      appointments: appts.data ?? [],
      meetings: meetings.data ?? [],
      invoices: invoices.data ?? [],
      payments,
      timeEntries: timeEntries.data ?? [],
    };
  });

export const attachCaseToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ client_id: z.string().uuid(), case_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("cases").update({ client_id: data.client_id }).eq("id", data.case_id).is("client_id", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listUnassignedCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("cases").select("id,title,case_number,opened_at").is("client_id", null).order("opened_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createInstallmentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    client_id: z.string().uuid(),
    title: z.string().min(1),
    total_amount: z.number().positive(),
    currency: z.string().default("JOD"),
    count: z.number().int().min(1).max(60),
    frequency: z.enum(["weekly", "monthly"]).default("monthly"),
    start_date: z.string(),
    reference: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: mem } = await sb.from("organization_members").select("org_id").eq("user_id", context.userId).eq("status", "active").order("created_at").limit(1).maybeSingle();
    const org_id = mem?.org_id;
    if (!org_id) throw new Error("No active organization");

    const per = Math.round((data.total_amount / data.count) * 100) / 100;
    const { data: debtCase, error } = await sb.from("debt_cases").insert({
      org_id, client_id: data.client_id, title: data.title, debt_type: "installment",
      total_amount: data.total_amount, currency: data.currency, status: "active",
      service_fee_type: "percent", service_fee_value: 0,
      reference: data.reference ?? null,
      created_by: context.userId,
    }).select().maybeSingle();
    if (error) throw new Error(error.message);

    const rows: any[] = [];
    const start = new Date(data.start_date);
    for (let i = 0; i < data.count; i++) {
      const due = new Date(start);
      if (data.frequency === "weekly") due.setDate(start.getDate() + i * 7);
      else due.setMonth(start.getMonth() + i);
      rows.push({
        org_id, client_id: data.client_id, debt_case_id: debtCase.id,
        installment_no: i + 1, total_installments: data.count,
        amount: i === data.count - 1 ? Math.round((data.total_amount - per * (data.count - 1)) * 100) / 100 : per,
        currency: data.currency, due_date: due.toISOString().slice(0, 10), status: "pending",
      });
    }
    const { error: e2 } = await sb.from("payment_schedules").insert(rows);
    if (e2) console.warn("[installments] scheduling failed:", e2.message);
    return { debt_case_id: debtCase.id };
  });

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClientInput.parse(d))
  .handler(async ({ data, context }) => {
    const { locale = "en", ...clientData } = data;
    const payload: any = { ...clientData, email: clientData.email || null, owner_id: context.userId };
    if (clientData.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await context.supabase.from("clients").update(rest).eq("id", id!).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("clients").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    // Send welcome SMS to new client (awaited so the Worker doesn't kill the request).
    if (row?.phone) {
      try {
        const [{ sendSms }, { resolveSenderName }] = await Promise.all([
          import("./whatsapp.server"),
          import("./sender-name.server"),
        ]);
        const sender = await resolveSenderName(context.supabase as any, context.userId, locale);
        const name = row.name || "";
        const body = locale === "ar"
          ? `مرحباً ${name}، تم إنشاء ملفك بنجاح. سنكون على تواصل بخصوص قضاياك. — ${sender}`
          : `Hello ${name}, your client profile has been created successfully. We will be in touch regarding your matters. — ${sender}`;
        await sendSms(row.phone, body, { owner_id: context.userId, client_id: row.id, context: "client_welcome" });
      } catch (e) {
        console.warn("[clients.saveClient] welcome SMS failed:", (e as any)?.message);
      }
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
