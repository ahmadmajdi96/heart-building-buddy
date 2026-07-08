import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCallerOrg(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No active organization");
  return data as { org_id: string; role: string };
}

/* ============================ Cases ============================ */

const optUuid = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable().optional());

const CaseInput = z.object({
  id: z.string().uuid().optional(),
  client_id: optUuid,
  title: z.string().min(1),
  description: z.string().optional(),
  debt_type: z.enum(["rent", "loan", "service", "installment", "other"]).default("other"),
  total_amount: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  service_fee_type: z.enum(["percent", "fixed"]).default("percent"),
  service_fee_value: z.number().min(0).default(0),
  due_date: z.string().nullable().optional(),
  forwarder_name: z.string().optional(),
  forwarder_contact: z.string().optional(),
  reference: z.string().optional(),
  status: z.enum(["active", "paid", "partial", "overdue", "cancelled"]).default("active"),
  recurrence: z.enum(["none", "weekly", "monthly", "yearly"]).default("none").optional(),
  recurrence_interval: z.number().int().min(1).optional(),
  next_recur_at: z.string().nullable().optional(),
});

export const listDebtCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const mem = await getCallerOrg(context);
    const { data, error } = await context.supabase
      .from("debt_cases")
      .select("*, clients(id,name), debt_case_payers(id,amount_due,amount_paid,status), debt_collection_payments(amount_received,service_fee,amount_forwarded)")
      .eq("org_id", mem.org_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => {
      const payers = c.debt_case_payers ?? [];
      const pmts = c.debt_collection_payments ?? [];
      const collected = pmts.reduce((a: number, p: any) => a + Number(p.amount_received || 0), 0);
      const fees = pmts.reduce((a: number, p: any) => a + Number(p.service_fee || 0), 0);
      const forwarded = pmts.reduce((a: number, p: any) => a + Number(p.amount_forwarded || 0), 0);
      const { debt_case_payers: _p, debt_collection_payments: _pm, ...rest } = c;
      return { ...rest, _payer_count: payers.length, _collected: collected, _fees: fees, _forwarded: forwarded };
    });
  });

export const getDebtCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [c, payers, assignees, payments, sms] = await Promise.all([
      context.supabase.from("debt_cases").select("*, clients(id,name,phone,email)").eq("id", data.id).maybeSingle(),
      context.supabase.from("debt_case_payers").select("*, clients(id,name)").eq("case_id", data.id).order("created_at", { ascending: true }),
      context.supabase.from("debt_case_assignees").select("*").eq("case_id", data.id),
      context.supabase.from("debt_collection_payments").select("*").eq("case_id", data.id).order("paid_at", { ascending: false }),
      context.supabase.from("debt_sms_log").select("*").eq("case_id", data.id).order("sent_at", { ascending: false }).limit(50),
    ]);
    if (c.error) throw new Error(c.error.message);
    // Fetch profiles for assignees
    const uids = (assignees.data ?? []).map((a: any) => a.user_id);
    let profiles: any[] = [];
    if (uids.length > 0) {
      const { data: pdata } = await context.supabase.from("profiles").select("id, full_name").in("id", uids);
      profiles = pdata ?? [];
    }
    const enrichedAssignees = (assignees.data ?? []).map((a: any) => {
      const p = profiles.find((pr) => pr.id === a.user_id);
      return { ...a, _name: p?.full_name ?? "Team member", _profile_phone: null as string | null };
    });
    return {
      case: c.data,
      payers: payers.data ?? [],
      assignees: enrichedAssignees,
      payments: payments.data ?? [],
      sms: sms.data ?? [],
    };
  });

export const saveDebtCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CaseInput.parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const payload: any = {
      ...data,
      client_id: data.client_id || null,
      due_date: data.due_date || null,
      next_recur_at: data.next_recur_at || null,
      org_id: mem.org_id,
      created_by: context.userId,
    };
    if (data.id) {
      const { id, ...rest } = payload;
      delete rest.org_id; delete rest.created_by;
      const { data: row, error } = await context.supabase.from("debt_cases").update(rest).eq("id", id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("debt_cases").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDebtCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("debt_cases").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================ Payers ============================ */

const PayerInput = z.object({
  id: z.string().uuid().optional(),
  case_id: z.string().uuid(),
  client_id: optUuid,
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  amount_due: z.number().min(0).default(0),
  due_date: z.string().nullable().optional(),
  status: z.enum(["pending", "partial", "paid", "overdue", "cancelled"]).default("pending"),
  notes: z.string().optional(),
});

export const savePayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PayerInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload: any = {
      ...data,
      client_id: data.client_id || null,
      email: data.email || null,
      due_date: data.due_date || null,
    };
    if (data.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await context.supabase.from("debt_case_payers").update(rest).eq("id", id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("debt_case_payers").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    // Auto-notify newly added payer
    if (row?.phone) {
      try {
        const { data: caseRow } = await context.supabase
          .from("debt_cases").select("title, currency, org_id").eq("id", data.case_id).maybeSingle();
        const { sendSms } = await import("./whatsapp.server");
        const amt = Number(data.amount_due || 0).toFixed(2);
        const ccy = caseRow?.currency ?? "";
        const dueStr = data.due_date ? ` due on ${data.due_date}` : "";
        const body = `Hello ${data.name}, you have been registered for the collection case "${caseRow?.title ?? ""}" with an amount of ${amt} ${ccy}${dueStr}. We will keep you updated with reminders.`;
        await sendSms(row.phone, body, {
          owner_id: context.userId, org_id: caseRow?.org_id ?? null,
          debt_case_id: data.case_id, client_id: row.client_id ?? null,
          context: "debt_reminder",
        });
      } catch (e) { console.warn("[savePayer] SMS failed:", (e as any)?.message); }
    }
    return row;
  });

export const deletePayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("debt_case_payers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================ Assignees ============================ */

export const listOrgMembersForAssignment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const mem = await getCallerOrg(context);
    const { data, error } = await context.supabase
      .from("organization_members").select("user_id, role").eq("org_id", mem.org_id).eq("status", "active");
    if (error) throw new Error(error.message);
    const uids = (data ?? []).map((r: any) => r.user_id);
    if (uids.length === 0) return [];
    const { data: profiles } = await context.supabase.from("profiles").select("id, full_name").in("id", uids);
    return (data ?? []).map((r: any) => {
      const p = (profiles ?? []).find((pr: any) => pr.id === r.user_id);
      return { user_id: r.user_id, role: r.role, full_name: p?.full_name ?? "Team member", phone: null as string | null };
    });
  });

export const addAssignee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    case_id: z.string().uuid(),
    user_id: z.string().uuid(),
    role: z.string().default("collector"),
    phone: z.string().optional(),
    notify_sms: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("debt_case_assignees")
      .upsert({ case_id: data.case_id, user_id: data.user_id, role: data.role, phone: data.phone || null, notify_sms: data.notify_sms })
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    // Auto-SMS the assigned lawyer if a phone was provided.
    if (data.notify_sms && data.phone) {
      try {
        const { data: caseRow } = await context.supabase
          .from("debt_cases").select("title, org_id").eq("id", data.case_id).maybeSingle();
        const { data: prof } = await context.supabase
          .from("profiles").select("full_name").eq("id", data.user_id).maybeSingle();
        const { sendSms } = await import("./whatsapp.server");
        const name = prof?.full_name ?? "Team member";
        const body = `Hello ${name}, you have been assigned to the collection case "${caseRow?.title ?? ""}" as ${data.role}. Please review it in the app.`;
        await sendSms(data.phone, body, {
          owner_id: context.userId, org_id: caseRow?.org_id ?? null,
          debt_case_id: data.case_id, context: "case_assignment",
        });
      } catch (e) { console.warn("[addAssignee] SMS failed:", (e as any)?.message); }
    }
    return row;
  });

export const removeAssignee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ case_id: z.string().uuid(), user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("debt_case_assignees")
      .delete().eq("case_id", data.case_id).eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================ Payments ============================ */

const PaymentInput = z.object({
  id: z.string().uuid().optional(),
  case_id: z.string().uuid(),
  payer_id: optUuid,
  amount_received: z.number().min(0),
  service_fee: z.number().min(0).default(0),
  amount_forwarded: z.number().min(0).default(0),
  forwarder_name: z.string().optional(),
  method: z.enum(["bank_transfer", "card", "cash", "cheque", "other"]).default("bank_transfer"),
  reference: z.string().optional(),
  paid_at: z.string().default(() => new Date().toISOString().slice(0, 10)),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
});

export const recordDebtPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PaymentInput.parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const payload: any = {
      ...data,
      payer_id: data.payer_id || null,
      org_id: mem.org_id,
      created_by: context.userId,
    };
    if (data.id) {
      const { id, ...rest } = payload;
      delete rest.org_id; delete rest.created_by;
      const { data: row, error } = await context.supabase.from("debt_collection_payments").update(rest).eq("id", id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("debt_collection_payments").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);

    // Update payer amount_paid and status
    if (data.payer_id) {
      const { data: payer } = await context.supabase
        .from("debt_case_payers").select("amount_due, amount_paid").eq("id", data.payer_id).maybeSingle();
      if (payer) {
        const newPaid = Number(payer.amount_paid || 0) + Number(data.amount_received || 0);
        const due = Number(payer.amount_due || 0);
        const status = newPaid >= due && due > 0 ? "paid" : newPaid > 0 ? "partial" : "pending";
        await context.supabase.from("debt_case_payers")
          .update({ amount_paid: newPaid, status }).eq("id", data.payer_id);
      }
    }
    return row;
  });

export const deleteDebtPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("debt_collection_payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOrgDebtPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const mem = await getCallerOrg(context);
    const { data, error } = await context.supabase
      .from("debt_collection_payments")
      .select("*, debt_cases(id,title,reference), debt_case_payers(id,name)")
      .eq("org_id", mem.org_id)
      .order("paid_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ============================ SMS ============================ */

const PROJECT_ID_FOR_SMS = "fb990850-3f8b-4251-83c6-f826e75969f7";
const SMS_STATUS_CALLBACK = `https://project--${PROJECT_ID_FOR_SMS}.lovable.app/api/public/hooks/twilio-status`;

async function sendTwilioSms(to: string, body: string, from: string): Promise<{ sid?: string; error?: string; status: string }> {
  const key = process.env.LOVABLE_API_KEY;
  const twKey = process.env.TWILIO_API_KEY;
  if (!key || !twKey) return { status: "failed", error: "Twilio not configured" };
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Connection-Api-Key": twKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: String(to).trim(), From: String(from).trim(), Body: body,
        StatusCallback: SMS_STATUS_CALLBACK,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", error: JSON.stringify(json).slice(0, 500) };
    return { status: (json as any).status ?? "sent", sid: (json as any).sid };
  } catch (e: any) {
    return { status: "failed", error: String(e?.message || e) };
  }
}

async function logSmsMessage(row: Record<string, any>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("sms_messages").insert(row);
  } catch {}
}


const SendSmsInput = z.object({
  case_id: z.string().uuid(),
  payer_ids: z.array(z.string().uuid()).optional().default([]),
  assignee_user_ids: z.array(z.string().uuid()).optional().default([]),
  message: z.string().min(1),
  from: z.string().min(1), // Twilio sender number, E.164
  kind: z.enum(["reminder_upcoming", "reminder_due", "reminder_overdue", "assignment", "manual"]).default("manual"),
});

export const sendDebtSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendSmsInput.parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const results: any[] = [];

    // Payers
    if (data.payer_ids.length > 0) {
      const { data: payers } = await context.supabase
        .from("debt_case_payers").select("id, name, phone").in("id", data.payer_ids);
      for (const p of payers ?? []) {
        if (!p.phone) { results.push({ payer_id: p.id, status: "failed", error: "No phone" }); continue; }
        const r = await sendTwilioSms(p.phone, data.message, data.from);
        await context.supabase.from("debt_sms_log").insert({
          org_id: mem.org_id, case_id: data.case_id, payer_id: p.id,
          phone: p.phone, message: data.message, kind: data.kind,
          status: r.status, twilio_sid: r.sid ?? null, error: r.error ?? null,
        });
        await logSmsMessage({
          owner_id: context.userId, org_id: mem.org_id, debt_case_id: data.case_id,
          context: "debt_reminder", to_number: p.phone, from_number: data.from,
          body: data.message, twilio_sid: r.sid ?? null, status: r.status,
          error_message: r.error ?? null,
        });
        if (r.status === "sent" || r.status === "queued") {
          await context.supabase.from("debt_case_payers")
            .update({ last_reminder_sent_at: new Date().toISOString(), last_reminder_kind: data.kind })
            .eq("id", p.id);
        }
        results.push({ payer_id: p.id, ...r });
      }
    }

    // Assignees
    if (data.assignee_user_ids.length > 0) {
      const { data: assignees } = await context.supabase
        .from("debt_case_assignees").select("user_id, phone").eq("case_id", data.case_id).in("user_id", data.assignee_user_ids);
      for (const a of assignees ?? []) {
        const phone = a.phone;
        if (!phone) { results.push({ user_id: a.user_id, status: "failed", error: "No phone on assignee" }); continue; }
        const r = await sendTwilioSms(phone, data.message, data.from);
        await context.supabase.from("debt_sms_log").insert({
          org_id: mem.org_id, case_id: data.case_id, assignee_user_id: a.user_id,
          phone, message: data.message, kind: data.kind,
          status: r.status, twilio_sid: r.sid ?? null, error: r.error ?? null,
        });
        await logSmsMessage({
          owner_id: context.userId, org_id: mem.org_id, debt_case_id: data.case_id,
          context: "debt_reminder", to_number: phone, from_number: data.from,
          body: data.message, twilio_sid: r.sid ?? null, status: r.status,
          error_message: r.error ?? null,
        });
        results.push({ user_id: a.user_id, ...r });
      }
    }
    return { results };
  });

/* ============================ Reminder rules ============================ */

const RuleInput = z.object({
  id: z.string().uuid().optional(),
  case_id: z.string().uuid(),
  label: z.string().min(1),
  offset_days: z.number().int(), // negative = before due, 0 = on due, positive = after due
  kind: z.enum(["reminder_upcoming", "reminder_due", "reminder_overdue", "manual"]).default("reminder_upcoming"),
  message_template: z.string().min(1),
  active: z.boolean().default(true),
});

export const listReminderRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ case_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("debt_reminder_rules")
      .select("*")
      .eq("case_id", data.case_id)
      .order("offset_days", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveReminderRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RuleInput.parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    if (data.id) {
      const { id, ...rest } = data;
      const { data: row, error } = await context.supabase
        .from("debt_reminder_rules").update(rest).eq("id", id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("debt_reminder_rules")
      .insert({ ...data, org_id: mem.org_id, created_by: context.userId })
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteReminderRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("debt_reminder_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
