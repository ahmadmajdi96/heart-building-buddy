import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCallerOrg(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("organization_members")
    .select("org_id, role, organizations(currency)")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No active organization");
  return data as { org_id: string; role: string; organizations: { currency: string } | null };
}

/* -------- unpaid invoices for a client -------- */
export const listUnpaidInvoicesForClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ client_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const { data: rows, error } = await context.supabase
      .from("tax_invoices")
      .select("id, number, client_name, total, amount_paid, currency, status, issue_date, due_date")
      .eq("org_id", mem.org_id)
      .eq("client_id", data.client_id)
      .in("status", ["issued", "partial", "overdue"])
      .order("issue_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      ...r,
      _remaining: Number(r.total) - Number(r.amount_paid || 0),
    })).filter((r: any) => r._remaining > 0.001);
  });

/* -------- list all plans for the org -------- */
export const listPaymentPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const mem = await getCallerOrg(context);
    const { data, error } = await context.supabase
      .from("payment_schedules")
      .select("*, clients(id,name), tax_invoices(id,number,total,amount_paid,status)")
      .eq("org_id", mem.org_id)
      .not("plan_id", "is", null)
      .order("plan_id", { ascending: false })
      .order("installment_no", { ascending: true });
    if (error) throw new Error(error.message);
    const map = new Map<string, any>();
    for (const r of data ?? []) {
      const key = r.plan_id as string;
      if (!map.has(key)) {
        map.set(key, {
          plan_id: key,
          client_id: r.client_id,
          client_name: r.client_name,
          currency: r.currency,
          debt_case_id: r.debt_case_id,
          installments: [],
          invoice_ids: new Set<string>(),
          total: 0,
          paid: 0,
        });
      }
      const p = map.get(key);
      p.installments.push(r);
      if (r.invoice_id) p.invoice_ids.add(r.invoice_id);
      p.total += Number(r.amount);
      if (r.status === "paid") p.paid += Number(r.amount);
    }
    return Array.from(map.values()).map((p) => ({
      ...p,
      invoice_ids: Array.from(p.invoice_ids),
      count: p.installments.length,
    }));
  });

/* -------- create a payment plan -------- */
const PlanInput = z.object({
  client_id: z.string().uuid(),
  client_name: z.string().min(1),
  invoice_ids: z.array(z.string().uuid()).min(1),
  installments: z.union([z.literal(3), z.literal(6), z.literal(12)]),
  first_due_date: z.string().min(1),
  description: z.string().optional(),
  create_debt_case: z.boolean().default(true),
});

function addMonths(iso: string, months: number) {
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // handle month-end rollover
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export const createPaymentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PlanInput.parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const currency = mem.organizations?.currency ?? "USD";

    // Fetch invoices → compute total remaining
    const { data: invs, error: iErr } = await context.supabase
      .from("tax_invoices")
      .select("id, number, total, amount_paid, currency, client_id")
      .eq("org_id", mem.org_id)
      .in("id", data.invoice_ids);
    if (iErr) throw new Error(iErr.message);
    if (!invs || invs.length !== data.invoice_ids.length) throw new Error("Some invoices not found");

    const totalRemaining = invs.reduce(
      (a: number, r: any) => a + (Number(r.total) - Number(r.amount_paid || 0)),
      0,
    );
    if (totalRemaining <= 0) throw new Error("Selected invoices have no outstanding balance");

    const n = data.installments;
    const base = Math.floor((totalRemaining * 100) / n) / 100;
    const remainder = Number((totalRemaining - base * n).toFixed(2));

    // generate plan id (client-side uuid via crypto)
    const plan_id = crypto.randomUUID();

    // Allocate one schedule row per installment, spread across invoices proportionally
    // simple: first invoice_id used as anchor; UI shows plan grouping
    const primaryInvoiceId = invs[0].id;

    const rows: any[] = [];
    for (let i = 0; i < n; i++) {
      const amount = i === n - 1 ? Number((base + remainder).toFixed(2)) : base;
      rows.push({
        org_id: mem.org_id,
        created_by: context.userId,
        currency,
        client_id: data.client_id,
        client_name: data.client_name,
        description: data.description || `Installment ${i + 1} of ${n}`,
        due_date: addMonths(data.first_due_date, i),
        amount,
        status: "upcoming",
        plan_id,
        installment_no: i + 1,
        installment_count: n,
        invoice_id: primaryInvoiceId,
      });
    }

    // Optionally create debt case + payer + reminder rules
    let debt_case_id: string | null = null;
    if (data.create_debt_case) {
      // fetch client contact
      const { data: client } = await context.supabase
        .from("clients").select("phone, email").eq("id", data.client_id).maybeSingle();

      const invoiceNumbers = invs.map((r: any) => r.number).join(", ");
      const { data: dc, error: dcErr } = await context.supabase.from("debt_cases").insert({
        org_id: mem.org_id,
        created_by: context.userId,
        client_id: data.client_id,
        title: `Payment plan — ${data.client_name} (${invoiceNumbers})`,
        description: data.description || `Auto-generated from payment plan for invoices ${invoiceNumbers}`,
        debt_type: "installment",
        total_amount: Number(totalRemaining.toFixed(2)),
        currency,
        due_date: rows[rows.length - 1].due_date,
        status: "active",
      }).select().maybeSingle();
      if (dcErr) throw new Error(dcErr.message);
      debt_case_id = dc?.id ?? null;

      if (debt_case_id) {
        // add primary payer = the client, aggregate
        await context.supabase.from("debt_case_payers").insert({
          case_id: debt_case_id,
          client_id: data.client_id,
          name: data.client_name,
          phone: client?.phone ?? null,
          email: client?.email ?? null,
          amount_due: Number(totalRemaining.toFixed(2)),
          amount_paid: 0,
          due_date: rows[0].due_date,
          status: "pending",
        });

        // reminder rules: 3 days before + on due + on overdue
        await context.supabase.from("debt_reminder_rules").insert([
          {
            org_id: mem.org_id, case_id: debt_case_id, created_by: context.userId,
            label: "3 days before due", kind: "reminder_upcoming", offset_days: -3, active: true,
            message_template: "Hi {{name}}, this is a friendly reminder that your installment of {{amount_due}} for {{case_title}} is due on {{due_date}}.",
          },
          {
            org_id: mem.org_id, case_id: debt_case_id, created_by: context.userId,
            label: "On due date", kind: "reminder_due", offset_days: 0, active: true,
            message_template: "Hi {{name}}, your installment of {{amount_due}} for {{case_title}} is due today ({{due_date}}). Please arrange payment.",
          },
          {
            org_id: mem.org_id, case_id: debt_case_id, created_by: context.userId,
            label: "Overdue", kind: "reminder_overdue", offset_days: 3, active: true,
            message_template: "Hi {{name}}, your installment of {{amount_due}} for {{case_title}} is overdue since {{due_date}}. Please contact us.",
          },
        ]);

        // stamp debt_case_id on each schedule row
        for (const r of rows) r.debt_case_id = debt_case_id;
      }
    }

    const { error: sErr } = await context.supabase.from("payment_schedules").insert(rows);
    if (sErr) throw new Error(sErr.message);

    try {
      await context.supabase.from("activity_log").insert({
        org_id: mem.org_id,
        actor_id: context.userId,
        entity_type: "payment_plan",
        entity_id: plan_id,
        action: "created",
        summary: `Payment plan (${n} installments) for ${data.client_name} — ${totalRemaining.toFixed(2)} ${currency}`,
      });
    } catch { /* non-fatal */ }

    return { plan_id, debt_case_id, count: n, total: Number(totalRemaining.toFixed(2)) };
  });

/* -------- mark installment paid + reconcile invoice -------- */
export const markSchedulePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    paid_at: z.string().min(1),
    method: z.enum(["bank_transfer", "card", "cash", "cheque", "other"]).default("bank_transfer"),
    reference: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);

    const { data: sch, error: sErr } = await context.supabase
      .from("payment_schedules").select("*").eq("id", data.id).maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sch) throw new Error("Installment not found");
    if (sch.status === "paid") return { ok: true };

    // mark schedule paid
    const { error: uErr } = await context.supabase.from("payment_schedules")
      .update({ status: "paid" }).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    // record a payment against the invoice (if linked) and update invoice totals
    if (sch.invoice_id) {
      await context.supabase.from("payments").insert({
        org_id: mem.org_id,
        created_by: context.userId,
        invoice_id: sch.invoice_id,
        schedule_id: sch.id,
        client_id: sch.client_id,
        client_name: sch.client_name,
        amount: Number(sch.amount),
        method: data.method,
        reference: data.reference ?? null,
        paid_at: data.paid_at,
        currency: sch.currency,
      });


      const { data: inv } = await context.supabase
        .from("tax_invoices").select("total, amount_paid, status").eq("id", sch.invoice_id).maybeSingle();
      if (inv) {
        const newPaid = Number(inv.amount_paid || 0) + Number(sch.amount);
        const total = Number(inv.total);
        let status = inv.status;
        if (newPaid >= total - 0.005) status = "paid";
        else if (newPaid > 0) status = "partial";
        await context.supabase.from("tax_invoices").update({
          amount_paid: Number(newPaid.toFixed(2)),
          status,
        }).eq("id", sch.invoice_id);
      }
    }

    // sync debt case: increment payer.amount_paid + record collection payment
    if (sch.debt_case_id) {
      await context.supabase.from("debt_collection_payments").insert({
        org_id: mem.org_id,
        created_by: context.userId,
        case_id: sch.debt_case_id,
        invoice_id: sch.invoice_id ?? null,
        amount_received: Number(sch.amount),
        amount_forwarded: 0,
        service_fee: 0,
        method: data.method,
        reference: data.reference ?? null,
        paid_at: data.paid_at,
        currency: sch.currency,
      });
      // bump payer
      const { data: payers } = await context.supabase.from("debt_case_payers")
        .select("id, amount_paid, amount_due").eq("case_id", sch.debt_case_id).limit(1);
      const payer = payers?.[0];
      if (payer) {
        const newPaid = Number(payer.amount_paid || 0) + Number(sch.amount);
        const newStatus = newPaid >= Number(payer.amount_due) - 0.005 ? "paid" : "partial";
        await context.supabase.from("debt_case_payers").update({
          amount_paid: Number(newPaid.toFixed(2)),
          status: newStatus,
        }).eq("id", payer.id);
      }

      // if all installments paid, mark debt case paid
      const { data: remaining } = await context.supabase.from("payment_schedules")
        .select("id").eq("debt_case_id", sch.debt_case_id).neq("status", "paid");
      if (!remaining || remaining.length === 0) {
        await context.supabase.from("debt_cases").update({ status: "paid" }).eq("id", sch.debt_case_id);
      }
    }

    try {
      await context.supabase.from("activity_log").insert({
        org_id: mem.org_id,
        actor_id: context.userId,
        entity_type: "payment_schedule",
        entity_id: data.id,
        action: "paid",
        summary: `Installment ${sch.installment_no ?? ""} of ${sch.amount} ${sch.currency} paid on ${data.paid_at}`,
      });
    } catch { /* non-fatal */ }

    return { ok: true };
  });

/* -------- delete an entire plan -------- */
export const deletePaymentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("payment_schedules")
      .delete().eq("plan_id", data.plan_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- plan details -------- */
export const getPaymentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);

    const { data: schedules, error: sErr } = await context.supabase
      .from("payment_schedules")
      .select("*, tax_invoices(id,number,total,amount_paid,status,due_date,issue_date)")
      .eq("org_id", mem.org_id)
      .eq("plan_id", data.plan_id)
      .order("installment_no", { ascending: true });
    if (sErr) throw new Error(sErr.message);
    if (!schedules || schedules.length === 0) throw new Error("Plan not found");

    const anchor = schedules[0] as any;
    const invoiceIds = Array.from(new Set(schedules.map((s: any) => s.invoice_id).filter(Boolean)));

    const { data: invoices } = invoiceIds.length
      ? await context.supabase.from("tax_invoices")
          .select("id, number, total, amount_paid, status, issue_date, due_date, currency, client_name")
          .in("id", invoiceIds)
      : { data: [] as any[] };

    // payment ledger: all payments recorded for this plan's schedules
    const scheduleIds = schedules.map((s: any) => s.id);
    const { data: paymentsRaw } = await context.supabase
      .from("payments")
      .select("id, amount, currency, method, reference, paid_at, created_at, invoice_id, schedule_id, tax_invoices(number)")
      .in("schedule_id", scheduleIds)
      .order("paid_at", { ascending: false });

    // debt case + reminder rules
    let debt_case: any = null;
    let reminder_rules: any[] = [];
    if (anchor.debt_case_id) {
      const { data: dc } = await context.supabase.from("debt_cases")
        .select("id, title, status, total_amount, currency, due_date")
        .eq("id", anchor.debt_case_id).maybeSingle();
      debt_case = dc ?? null;
      const { data: rr } = await context.supabase.from("debt_reminder_rules")
        .select("*").eq("case_id", anchor.debt_case_id).eq("active", true);
      reminder_rules = rr ?? [];
    }

    // compute next scheduled reminder date across unpaid installments
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcomingReminders: { installment_no: number; due_date: string; rule_label: string; kind: string; fire_at: string }[] = [];
    for (const s of schedules as any[]) {
      if (s.status === "paid" || s.status === "cancelled") continue;
      const due = new Date(s.due_date + "T00:00:00Z");
      for (const rule of reminder_rules) {
        if (rule.kind === "reminder_manual") continue;
        const fire = new Date(due);
        fire.setUTCDate(fire.getUTCDate() + Number(rule.offset_days || 0));
        if (fire.getTime() >= today.getTime()) {
          upcomingReminders.push({
            installment_no: s.installment_no,
            due_date: s.due_date,
            rule_label: rule.label,
            kind: rule.kind,
            fire_at: fire.toISOString().slice(0, 10),
          });
        }
      }
    }
    upcomingReminders.sort((a, b) => a.fire_at.localeCompare(b.fire_at));

    const total = schedules.reduce((a: number, s: any) => a + Number(s.amount), 0);
    const paid = schedules.filter((s: any) => s.status === "paid").reduce((a: number, s: any) => a + Number(s.amount), 0);
    const remaining = Number((total - paid).toFixed(2));

    // derive plan-level status from installments
    const statuses = new Set(schedules.map((s: any) => s.status));
    let plan_status: "active" | "paused" | "cancelled" | "completed" = "active";
    if (statuses.size === 1 && statuses.has("paid")) plan_status = "completed";
    else if (Array.from(statuses).every((s) => s === "paid" || s === "cancelled") && statuses.has("cancelled")) plan_status = "cancelled";
    else if (statuses.has("paused")) plan_status = "paused";

    return {
      plan_id: data.plan_id,
      client_id: anchor.client_id,
      client_name: anchor.client_name,
      currency: anchor.currency,
      description: anchor.description,
      debt_case,
      schedules,
      invoices: invoices ?? [],
      payments: paymentsRaw ?? [],
      reminder_rules,
      upcoming_reminders: upcomingReminders,
      next_reminder: upcomingReminders[0] ?? null,
      total: Number(total.toFixed(2)),
      paid: Number(paid.toFixed(2)),
      remaining,
      plan_status,
    };
  });

/* -------- pause / resume / cancel -------- */
async function logPlan(ctx: any, org_id: string, plan_id: string, action: string, summary: string) {
  try {
    await ctx.supabase.from("activity_log").insert({
      org_id, actor_id: ctx.userId,
      entity_type: "payment_plan", entity_id: plan_id, action, summary,
    });
  } catch { /* non-fatal */ }
}

export const pausePaymentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const { error } = await context.supabase.from("payment_schedules")
      .update({ status: "paused" })
      .eq("plan_id", data.plan_id)
      .in("status", ["upcoming", "due", "overdue"]);
    if (error) throw new Error(error.message);
    await logPlan(context, mem.org_id, data.plan_id, "paused", "Payment plan paused");
    return { ok: true };
  });

export const resumePaymentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const { error } = await context.supabase.from("payment_schedules")
      .update({ status: "upcoming" })
      .eq("plan_id", data.plan_id)
      .eq("status", "paused");
    if (error) throw new Error(error.message);
    await logPlan(context, mem.org_id, data.plan_id, "resumed", "Payment plan resumed");
    return { ok: true };
  });

export const cancelPaymentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const { error } = await context.supabase.from("payment_schedules")
      .update({ status: "cancelled" })
      .eq("plan_id", data.plan_id)
      .in("status", ["upcoming", "due", "overdue", "paused"]);
    if (error) throw new Error(error.message);
    if (mem) {
      // best-effort: mark linked debt case cancelled if no payments were made and plan is now fully cancelled
      const { data: rows } = await context.supabase.from("payment_schedules")
        .select("debt_case_id, status").eq("plan_id", data.plan_id);
      const anyPaid = (rows ?? []).some((r: any) => r.status === "paid");
      const dc = (rows ?? [])[0]?.debt_case_id;
      if (dc && !anyPaid) {
        await context.supabase.from("debt_cases").update({ status: "cancelled" }).eq("id", dc);
      }
    }
    await logPlan(context, mem.org_id, data.plan_id, "cancelled", "Payment plan cancelled");
    return { ok: true };
  });

/* -------- reschedule remaining installments -------- */
function addMonthsIso(iso: string, months: number) {
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export const reschedulePaymentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    plan_id: z.string().uuid(),
    first_due_date: z.string().min(1),
    gap_months: z.number().int().min(1).max(6).default(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);

    const { data: schedules, error } = await context.supabase
      .from("payment_schedules").select("id, installment_no, status, due_date, debt_case_id")
      .eq("plan_id", data.plan_id)
      .order("installment_no", { ascending: true });
    if (error) throw new Error(error.message);
    if (!schedules || schedules.length === 0) throw new Error("Plan not found");

    const remaining = schedules.filter((s: any) => s.status !== "paid" && s.status !== "cancelled");
    if (remaining.length === 0) throw new Error("Nothing to reschedule");

    for (let i = 0; i < remaining.length; i++) {
      const newDue = addMonthsIso(data.first_due_date, i * data.gap_months);
      const status = remaining[i].status === "paused" ? "upcoming" : remaining[i].status;
      const { error: uErr } = await context.supabase.from("payment_schedules")
        .update({ due_date: newDue, status }).eq("id", remaining[i].id);
      if (uErr) throw new Error(uErr.message);
    }

    // stretch linked debt case due_date to last installment
    const dc = schedules[0].debt_case_id;
    if (dc) {
      const lastDue = addMonthsIso(data.first_due_date, (remaining.length - 1) * data.gap_months);
      await context.supabase.from("debt_cases").update({ due_date: lastDue, status: "active" }).eq("id", dc);
    }

    await logPlan(context, mem.org_id, data.plan_id, "rescheduled",
      `Rescheduled ${remaining.length} installment(s) starting ${data.first_due_date} (gap ${data.gap_months}m)`);
    return { ok: true, updated: remaining.length };
  });
