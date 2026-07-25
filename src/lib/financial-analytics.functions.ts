import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  /** Rolling window in months for the trend series. */
  months: z.number().int().min(3).max(24).default(12),
});

type Row = Record<string, any>;

const num = (v: unknown) => Number(v ?? 0) || 0;
const monthKey = (iso: string) => iso.slice(0, 7);

/**
 * Detailed financial analytics for the Financials page:
 * revenue vs. billed trend, AR ageing buckets, collection rate, DSO,
 * realisation on time entries, expense mix, and top clients / debtors.
 */
export const getFinancialAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (data.months - 1), 1);
    const fromISO = from.toISOString().slice(0, 10);

    const [invRes, payRes, expRes, timeRes] = await Promise.all([
      s.from("tax_invoices").select("id, client_id, client_name, issue_date, due_date, status, total, amount_paid, tax_amount, subtotal").gte("issue_date", fromISO),
      s.from("payments").select("id, client_id, client_name, amount, method, paid_at, invoice_id").gte("paid_at", fromISO),
      s.from("expenses").select("id, kind, amount, incurred_on, billable, status").gte("incurred_on", fromISO),
      s.from("time_entries").select("duration_seconds, billable, hourly_rate, started_at").gte("started_at", from.toISOString()),
    ]);

    const invoices: Row[] = invRes.data ?? [];
    const payments: Row[] = payRes.data ?? [];
    const expenses: Row[] = expRes.data ?? [];
    const times: Row[] = timeRes.data ?? [];

    /* ── Monthly series: billed vs collected vs expenses ── */
    const keys: string[] = [];
    for (let i = data.months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const series = keys.map((k) => {
      const [, m] = k.split("-");
      return {
        key: k,
        label: new Date(`${k}-01T00:00:00Z`).toLocaleString("en", { month: "short" }) + (m === "01" ? ` ${k.slice(2, 4)}` : ""),
        billed: invoices.filter((i) => monthKey(i.issue_date) === k && i.status !== "draft" && i.status !== "void").reduce((a, i) => a + num(i.total), 0),
        collected: payments.filter((p) => monthKey(p.paid_at) === k).reduce((a, p) => a + num(p.amount), 0),
        expenses: expenses.filter((e) => monthKey(e.incurred_on) === k).reduce((a, e) => a + num(e.amount), 0),
        tax: invoices.filter((i) => monthKey(i.issue_date) === k && i.status !== "draft" && i.status !== "void").reduce((a, i) => a + num(i.tax_amount), 0),
      };
    });

    /* ── AR ageing on open invoices ── */
    const open = invoices.filter((i) => !["draft", "void", "paid", "written_off"].includes(i.status));
    const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
    for (const i of open) {
      const outstanding = Math.max(num(i.total) - num(i.amount_paid), 0);
      if (outstanding <= 0) continue;
      const due = i.due_date ? new Date(i.due_date) : null;
      const overdueDays = due ? Math.floor((now.getTime() - due.getTime()) / 86400000) : 0;
      if (overdueDays <= 0) buckets.current += outstanding;
      else if (overdueDays <= 30) buckets.d1_30 += outstanding;
      else if (overdueDays <= 60) buckets.d31_60 += outstanding;
      else if (overdueDays <= 90) buckets.d61_90 += outstanding;
      else buckets.d90_plus += outstanding;
    }

    /* ── Headline KPIs ── */
    const billedTotal = series.reduce((a, r) => a + r.billed, 0);
    const collectedTotal = series.reduce((a, r) => a + r.collected, 0);
    const expenseTotal = series.reduce((a, r) => a + r.expenses, 0);
    const outstandingTotal = Object.values(buckets).reduce((a, b) => a + b, 0);
    const overdueTotal = outstandingTotal - buckets.current;
    const collectionRate = billedTotal > 0 ? Math.round((collectedTotal / billedTotal) * 100) : null;

    // DSO (simple): outstanding ÷ average daily billed over the window.
    const daysInWindow = Math.max(Math.round((now.getTime() - from.getTime()) / 86400000), 1);
    const dso = billedTotal > 0 ? Math.round(outstandingTotal / (billedTotal / daysInWindow)) : null;

    // Average days to pay, measured on invoices fully paid within the window.
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const payDays: number[] = [];
    for (const inv of paidInvoices) {
      const last = payments.filter((p) => p.invoice_id === inv.id).map((p) => new Date(p.paid_at).getTime()).sort((a, b) => b - a)[0];
      if (last) payDays.push(Math.max(Math.round((last - new Date(inv.issue_date).getTime()) / 86400000), 0));
    }
    const avgDaysToPay = payDays.length ? Math.round(payDays.reduce((a, b) => a + b, 0) / payDays.length) : null;

    /* ── Time realisation ── */
    const billableValue = times.filter((t) => t.billable).reduce((a, t) => a + (num(t.duration_seconds) / 3600) * num(t.hourly_rate), 0);
    const billableHours = Math.round(times.filter((t) => t.billable).reduce((a, t) => a + num(t.duration_seconds), 0) / 360) / 10;
    const nonBillableHours = Math.round(times.filter((t) => !t.billable).reduce((a, t) => a + num(t.duration_seconds), 0) / 360) / 10;
    const utilisation = billableHours + nonBillableHours > 0
      ? Math.round((billableHours / (billableHours + nonBillableHours)) * 100) : null;
    const realisation = billableValue > 0 ? Math.round((billedTotal / billableValue) * 100) : null;

    /* ── Mixes and leaderboards ── */
    const byMethod: Record<string, number> = {};
    for (const p of payments) byMethod[p.method] = (byMethod[p.method] ?? 0) + num(p.amount);

    const byExpenseKind: Record<string, number> = {};
    for (const e of expenses) byExpenseKind[e.kind] = (byExpenseKind[e.kind] ?? 0) + num(e.amount);

    const statusCounts: Record<string, number> = {};
    for (const i of invoices) statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;

    const clientAgg = new Map<string, { name: string; billed: number; collected: number; outstanding: number }>();
    const touch = (id: string | null, name: string) => {
      const key = id ?? `name:${name}`;
      if (!clientAgg.has(key)) clientAgg.set(key, { name, billed: 0, collected: 0, outstanding: 0 });
      return clientAgg.get(key)!;
    };
    for (const i of invoices) {
      if (["draft", "void"].includes(i.status)) continue;
      const row = touch(i.client_id, i.client_name);
      row.billed += num(i.total);
      row.outstanding += Math.max(num(i.total) - num(i.amount_paid), 0);
    }
    for (const p of payments) touch(p.client_id, p.client_name).collected += num(p.amount);

    const clients = [...clientAgg.values()];
    const topClients = [...clients].sort((a, b) => b.billed - a.billed).slice(0, 8);
    const topDebtors = clients.filter((c) => c.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).slice(0, 8);

    // Unbilled WIP: billable expenses not yet attached to an invoice.
    const unbilledExpenses = expenses.filter((e) => e.billable && !e.status?.includes("billed")).reduce((a, e) => a + num(e.amount), 0);

    return {
      window: { months: data.months, from: fromISO },
      kpis: {
        billedTotal, collectedTotal, expenseTotal, outstandingTotal, overdueTotal,
        netCollected: collectedTotal - expenseTotal,
        collectionRate, dso, avgDaysToPay, utilisation, realisation,
        billableHours, nonBillableHours, billableValue, unbilledExpenses,
        openInvoices: open.length, paidInvoices: paidInvoices.length,
      },
      series,
      ageing: buckets,
      byMethod,
      byExpenseKind,
      statusCounts,
      topClients,
      topDebtors,
    };
  });
