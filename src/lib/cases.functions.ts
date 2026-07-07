import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  locale: z.enum(["ar", "en"]).optional(),
});


export const listCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cases")
      .select("*, clients(id, name)")
      .order("opened_at", { ascending: false });
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
    const payload: any = {
      ...caseData,
      client_id: caseData.client_id || null,
      responsible_lawyer: caseData.responsible_lawyer || null,
      owner_id: context.userId,
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
