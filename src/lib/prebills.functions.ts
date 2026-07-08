import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getOrg(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("organization_members")
    .select("org_id, organizations(currency, default_tax_rate)")
    .eq("user_id", ctx.userId).eq("status", "active")
    .order("created_at").limit(1).maybeSingle();
  if (!data?.org_id) throw new Error("No active organization");
  return data as { org_id: string; organizations: { currency: string; default_tax_rate: number } | null };
}

/**
 * Create a pre-bill snapshot for a case within a period.
 * Pulls unbilled time entries + WIP expenses in the window and
 * writes prebill_lines. Amounts are editable via updatePrebillLine.
 */
export const createPrebill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    case_id: z.string().uuid(),
    period_start: z.string(),
    period_end: z.string(),
    narrative: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { org_id, organizations } = await getOrg(context);
    const currency = organizations?.currency ?? "JOD";

    const { data: caseRow } = await sb.from("cases").select("id, client_id, title").eq("id", data.case_id).maybeSingle();
    if (!caseRow) throw new Error("Case not found");

    // Time entries: unbilled, in period
    const { data: entries } = await sb.from("time_entries")
      .select("id, description, duration_seconds, hourly_rate, billable, status, entry_date")
      .eq("case_id", data.case_id).eq("billable", true).neq("status", "billed")
      .gte("entry_date", data.period_start).lte("entry_date", data.period_end);

    // Expenses: wip, billable, in period
    const { data: expenses } = await sb.from("expenses")
      .select("id, description, amount, kind, incurred_on, billable, status")
      .eq("case_id", data.case_id).eq("billable", true).eq("status", "wip")
      .gte("incurred_on", data.period_start).lte("incurred_on", data.period_end);

    let subtotal_time = 0;
    let subtotal_expenses = 0;

    const timeLines = (entries ?? []).map((e: any) => {
      const hours = Number((e.duration_seconds / 3600).toFixed(2));
      const unit = Number(e.hourly_rate ?? 0);
      const amt = Number((hours * unit).toFixed(2));
      subtotal_time += amt;
      return {
        kind: "time",
        time_entry_id: e.id,
        expense_id: null,
        description: e.description || "Legal services",
        quantity: hours,
        unit_price: unit,
        amount: amt,
        included: true,
      };
    });

    const expLines = (expenses ?? []).map((x: any) => {
      const amt = Number(x.amount);
      subtotal_expenses += amt;
      return {
        kind: "expense",
        time_entry_id: null,
        expense_id: x.id,
        description: x.description || x.kind,
        quantity: 1,
        unit_price: amt,
        amount: amt,
        included: true,
      };
    });

    const total = Number((subtotal_time + subtotal_expenses).toFixed(2));

    const { data: pb, error } = await sb.from("prebills").insert({
      org_id,
      case_id: data.case_id,
      client_id: caseRow.client_id,
      period_start: data.period_start,
      period_end: data.period_end,
      status: "draft",
      currency,
      subtotal_time: Number(subtotal_time.toFixed(2)),
      subtotal_expenses: Number(subtotal_expenses.toFixed(2)),
      discount: 0,
      total,
      narrative: data.narrative ?? null,
      created_by: context.userId,
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!pb) throw new Error("Failed to create pre-bill");

    const lines = [...timeLines, ...expLines].map((l) => ({ ...l, prebill_id: pb.id, org_id }));
    if (lines.length) {
      const { error: le } = await sb.from("prebill_lines").insert(lines);
      if (le) throw new Error(le.message);
    }
    return pb;
  });

export const listPrebills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ case_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { org_id } = await getOrg(context);
    let q = (context.supabase as any).from("prebills").select("*").eq("org_id", org_id).order("created_at", { ascending: false });
    if (data.case_id) q = q.eq("case_id", data.case_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPrebill = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: pb, error } = await sb.from("prebills").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    const { data: lines } = await sb.from("prebill_lines").select("*").eq("prebill_id", data.id).order("kind").order("created_at");
    return { prebill: pb, lines: lines ?? [] };
  });

export const updatePrebillLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    quantity: z.number().nonnegative().optional(),
    unit_price: z.number().nonnegative().optional(),
    description: z.string().optional(),
    included: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const patch: any = { ...data };
    delete patch.id;
    if (patch.quantity !== undefined && patch.unit_price !== undefined) {
      patch.amount = Number((patch.quantity * patch.unit_price).toFixed(2));
    }
    const { error } = await sb.from("prebill_lines").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    // Recompute prebill totals
    const { data: line } = await sb.from("prebill_lines").select("prebill_id").eq("id", data.id).maybeSingle();
    if (line?.prebill_id) await recomputePrebillTotals(sb, line.prebill_id);
    return { ok: true };
  });

async function recomputePrebillTotals(sb: any, prebill_id: string) {
  const { data: lines } = await sb.from("prebill_lines").select("kind, amount, included").eq("prebill_id", prebill_id);
  let time = 0, exp = 0;
  for (const l of (lines ?? [])) {
    if (!l.included) continue;
    if (l.kind === "time") time += Number(l.amount);
    else exp += Number(l.amount);
  }
  const { data: pb } = await sb.from("prebills").select("discount").eq("id", prebill_id).maybeSingle();
  const discount = Number(pb?.discount ?? 0);
  const total = Number((time + exp - discount).toFixed(2));
  await sb.from("prebills").update({
    subtotal_time: Number(time.toFixed(2)),
    subtotal_expenses: Number(exp.toFixed(2)),
    total,
  }).eq("id", prebill_id);
}

export const updatePrebill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    narrative: z.string().optional(),
    discount: z.number().nonnegative().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const patch: any = {};
    if (data.narrative !== undefined) patch.narrative = data.narrative;
    if (data.discount !== undefined) patch.discount = data.discount;
    const { error } = await sb.from("prebills").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.discount !== undefined) await recomputePrebillTotals(sb, data.id);
    return { ok: true };
  });

/** Approve pre-bill → generate an invoice from included lines. */
export const createInvoiceFromPrebill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    tax_rate: z.number().nullable().optional(),
    due_date: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { org_id, organizations } = await getOrg(context);

    const { data: pb } = await sb.from("prebills").select("*").eq("id", data.id).maybeSingle();
    if (!pb) throw new Error("Pre-bill not found");
    if (pb.status === "billed") throw new Error("Already billed");

    const { data: lines } = await sb.from("prebill_lines").select("*").eq("prebill_id", data.id).eq("included", true);
    const usable = lines ?? [];
    if (!usable.length) throw new Error("No included lines to bill");

    const items = usable.map((l: any) => ({
      description: l.description || "Legal services",
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price),
    }));
    const subtotal = usable.reduce((a: number, l: any) => a + Number(l.amount), 0) - Number(pb.discount ?? 0);
    const taxRate = data.tax_rate ?? (organizations?.default_tax_rate ?? 0);
    const tax_amount = Number(((subtotal * Number(taxRate)) / 100).toFixed(2));
    const total = Number((subtotal + tax_amount).toFixed(2));

    // Fetch client name
    let client_name = "Client";
    if (pb.client_id) {
      const { data: c } = await sb.from("clients").select("full_name").eq("id", pb.client_id).maybeSingle();
      client_name = c?.full_name ?? client_name;
    }

    const { data: numRes, error: nErr } = await sb.rpc("next_doc_number", { _org_id: org_id, _kind: "invoice" });
    if (nErr) throw new Error(nErr.message);

    const { data: inv, error: iErr } = await sb.from("tax_invoices").insert({
      org_id,
      number: numRes as string,
      client_id: pb.client_id,
      client_name,
      case_id: pb.case_id,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: data.due_date ?? null,
      status: "issued",
      currency: pb.currency,
      tax_rate: Number(taxRate),
      subtotal: Number(subtotal.toFixed(2)),
      tax_amount, total,
      notes: pb.narrative ?? null,
      items,
      created_by: context.userId,
    }).select().maybeSingle();
    if (iErr) throw new Error(iErr.message);

    // Mark contributing time entries as billed
    const timeIds = usable.filter((l: any) => l.kind === "time" && l.time_entry_id).map((l: any) => l.time_entry_id);
    if (timeIds.length) {
      await sb.from("time_entries").update({ status: "billed", invoice_id: inv.id }).in("id", timeIds);
    }
    // Mark contributing expenses as billed
    const expIds = usable.filter((l: any) => l.kind === "expense" && l.expense_id).map((l: any) => l.expense_id);
    if (expIds.length) {
      await sb.from("expenses").update({ status: "billed", invoice_id: inv.id }).in("id", expIds);
    }

    await sb.from("prebills").update({
      status: "billed",
      approved_by: context.userId,
      approved_at: new Date().toISOString(),
      invoice_id: inv.id,
    }).eq("id", data.id);

    return inv;
  });

export const deletePrebill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("prebills").delete().eq("id", data.id).neq("status", "billed");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
