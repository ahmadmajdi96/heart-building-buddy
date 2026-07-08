import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveOrgId } from "./active-org.server";

const CaseInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  case_number: z.string().optional(),
  court: z.string().optional(),
  court_room: z.string().optional(),
  jurisdiction: z.string().optional(),
  status: z.enum(["open", "pending", "closed", "won", "lost"]).default("open"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  description: z.string().optional(),
  client_id: z.string().uuid().nullable().optional(),
  judge: z.string().optional(),
  opposing_party: z.string().optional(),
  opposing_counsel: z.string().optional(),
  responsible_lawyer: z.string().uuid().nullable().optional(),
  agreed_fee: z.number().nullable().optional(),
  retainer_amount: z.number().nullable().optional(),
  hourly_rate: z.number().nullable().optional(),
  fee_currency: z.string().optional(),
  locale: z.enum(["ar", "en"]).optional(),
});



export const listCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await getActiveOrgId(context);
    let query = context.supabase
      .from("cases")
      .select("*, clients(id, name)")
      .order("opened_at", { ascending: false });
    // Scope to active workspace when the user has one. Also include any
    // legacy cases the user owns that have no org yet (won't leak across).
    if (orgId) {
      query = query.or(`org_id.eq.${orgId},and(org_id.is.null,owner_id.eq.${context.userId})`);
    } else {
      query = query.eq("owner_id", context.userId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [caseRes, events, docs, appts, invoices, timeEntries] = await Promise.all([
      context.supabase.from("cases").select("*, clients(id, name, email, phone)").eq("id", data.id).maybeSingle(),
      context.supabase.from("case_events").select("*").eq("case_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("documents").select("*").eq("case_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("appointments").select("*").eq("case_id", data.id).order("starts_at", { ascending: true }),
      context.supabase.from("tax_invoices").select("id, number, issue_date, due_date, status, total, amount_paid, currency").eq("case_id", data.id).order("issue_date", { ascending: false }),
      context.supabase.from("time_entries").select("id, description, duration_seconds, hourly_rate, billable, status, started_at").eq("case_id", data.id).order("started_at", { ascending: false }),
    ]);
    if (caseRes.error) throw new Error(caseRes.error.message);
    return {
      case: caseRes.data,
      events: events.data ?? [],
      documents: docs.data ?? [],
      appointments: appts.data ?? [],
      invoices: invoices.data ?? [],
      timeEntries: timeEntries.data ?? [],
    };
  });

export const saveCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CaseInput.parse(d))
  .handler(async ({ data, context }) => {
    const { locale = "en", ...caseData } = data;
    const orgId = await getActiveOrgId(context);
    const payload: any = {
      ...caseData,
      client_id: caseData.client_id || null,
      responsible_lawyer: caseData.responsible_lawyer || null,
      owner_id: context.userId,
      org_id: orgId,
    };
    if (caseData.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await context.supabase.from("cases").update(rest).eq("id", id!).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("cases").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    // Notify client via SMS when a case is assigned (awaited so the Worker doesn't kill the request).
    if (row?.client_id) {
      const { data: client } = await context.supabase
        .from("clients").select("name, phone").eq("id", row.client_id).maybeSingle();
      if (client?.phone) {
        try {
          const [{ sendSms }, { resolveSenderName }] = await Promise.all([
            import("./whatsapp.server"),
            import("./sender-name.server"),
          ]);
          const sender = await resolveSenderName(context.supabase as any, context.userId, locale);
          const name = client.name || "";
          const body = locale === "ar"
            ? `مرحباً ${name}، تم إسناد قضية جديدة إليك: «${row.title}»${row.case_number ? ` (رقم: ${row.case_number})` : ""}. سنبقيك على اطلاع بمستجداتها. — ${sender}`
            : `Hello ${name}, a new case has been assigned to you: "${row.title}"${row.case_number ? ` (Ref: ${row.case_number})` : ""}. We will keep you updated on its progress. — ${sender}`;
          await sendSms(client.phone, body, {
            owner_id: context.userId, client_id: row.client_id, case_id: row.id, context: "case_assignment",
          });
        } catch (e) {
          console.warn("[cases.saveCase] assignment SMS failed:", (e as any)?.message);
        }
      }
    }
    return row;
  });


export const deleteCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cases").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const closeCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    result: z.enum(["won", "lost", "settled", "withdrawn", "other"]),
    note: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // Map to existing status enum where possible; store the granular result in close_result.
    const statusMap: Record<string, string> = { won: "won", lost: "lost", settled: "closed", withdrawn: "closed", other: "closed" };
    const { data: row, error } = await (context.supabase as any).from("cases").update({
      status: statusMap[data.result],
      close_result: data.result,
      close_note: data.note ?? null,
      closed_at: new Date().toISOString(),
    }).eq("id", data.id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const EventInput = z.object({
  case_id: z.string().uuid(),
  kind: z.enum(["update", "feedback", "court_session", "appointment", "milestone"]).default("update"),
  title: z.string().min(1),
  body: z.string().optional(),
  scheduled_at: z.string().nullable().optional(),
});

export const addCaseEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EventInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("case_events").insert({
      ...data, owner_id: context.userId,
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCaseEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("case_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
