import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCallerOrg(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("organization_members")
    .select("org_id, role, organizations(currency, default_tax_rate)")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No active organization");
  return data as {
    org_id: string;
    role: string;
    organizations: { currency: string; default_tax_rate: number } | null;
  };
}

async function logActivity(ctx: any, orgId: string, action: string, invId: string, summary: string, caseId?: string | null) {
  try {
    await ctx.supabase.from("activity_log").insert({
      org_id: orgId,
      actor_id: ctx.userId,
      entity_type: "invoice",
      entity_id: invId,
      case_id: caseId ?? null,
      action,
      summary,
    });
  } catch { /* non-fatal */ }
}

const CreateInput = z.object({
  entry_ids: z.array(z.string().uuid()).min(1),
  client_name: z.string().min(1),
  client_id: z.string().uuid().nullable().optional(),
  case_id: z.string().uuid().nullable().optional(),
  tax_rate: z.number().nullable().optional(),
  due_date: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export const createInvoiceFromTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);

    const { data: entries, error: eErr } = await context.supabase
      .from("time_entries")
      .select("id, description, duration_seconds, hourly_rate, currency, billable, status")
      .in("id", data.entry_ids);
    if (eErr) throw new Error(eErr.message);
    const usable = (entries ?? []).filter((e: any) => e.billable && e.status !== "billed");
    if (usable.length === 0) throw new Error("No billable, unbilled entries selected");

    const items = usable.map((e: any) => {
      const hours = Number((e.duration_seconds / 3600).toFixed(2));
      const unit_price = Number(e.hourly_rate ?? 0);
      return { description: e.description || "Legal services", quantity: hours, unit_price };
    });
    const subtotal = items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
    const taxRate = data.tax_rate ?? (mem.organizations?.default_tax_rate ?? 0);
    const tax_amount = Number(((subtotal * Number(taxRate)) / 100).toFixed(2));
    const total = Number((subtotal + tax_amount).toFixed(2));

    const { data: numRes, error: nErr } = await context.supabase.rpc("next_doc_number", {
      _org_id: mem.org_id, _kind: "invoice",
    });
    if (nErr) throw new Error(nErr.message);

    const { data: inv, error: iErr } = await context.supabase
      .from("tax_invoices")
      .insert({
        org_id: mem.org_id,
        number: numRes as string,
        client_id: data.client_id || null,
        client_name: data.client_name,
        case_id: data.case_id || null,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: data.due_date || null,
        status: "draft",
        currency: mem.organizations?.currency ?? "USD",
        tax_rate: Number(taxRate),
        subtotal: Number(subtotal.toFixed(2)),
        tax_amount, total,
        notes: data.notes ?? null,
        items,
        created_by: context.userId,
      })
      .select().maybeSingle();
    if (iErr) throw new Error(iErr.message);
    if (!inv) throw new Error("Failed to create invoice");

    const { error: uErr } = await context.supabase
      .from("time_entries")
      .update({ status: "billed", invoice_id: inv.id })
      .in("id", usable.map((e: any) => e.id));
    if (uErr) throw new Error(uErr.message);

    await logActivity(context, mem.org_id, "created", inv.id, `Invoice ${inv.number} from time entries`, data.case_id);
    return inv;
  });

export const setInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["draft", "issued", "partial", "paid", "overdue", "void"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tax_invoices")
      .update({ status: data.status })
      .eq("id", data.id).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (row) {
      await logActivity(context, (row as any).org_id, `status:${data.status}`, data.id, `Invoice ${(row as any).number} → ${data.status}`, (row as any).case_id);
    }
    return row;
  });

export const sweepOverdueInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("mark_invoices_overdue");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOverdueInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("mark_invoices_overdue");
    const { data, error } = await context.supabase
      .from("tax_invoices")
      .select("id, number, client_name, due_date, total, amount_paid, currency, status")
      .eq("status", "overdue")
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Mark an invoice as paid — inserts a payment with an allocation for the remaining
 *  balance. The database trigger recomputes amount_paid + status from allocations. */
export const markInvoicePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    paid_at: z.string(),
    method: z.enum(["bank_transfer", "card", "cash", "cheque", "other"]).default("bank_transfer"),
    reference: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv, error: iErr } = await context.supabase
      .from("tax_invoices").select("*").eq("id", data.id).maybeSingle();
    if (iErr) throw new Error(iErr.message);
    if (!inv) throw new Error("Invoice not found");
    const remaining = Number(inv.total) - Number(inv.amount_paid || 0);
    if (remaining > 0) {
      const { data: pay, error: pErr } = await context.supabase.from("payments").insert({
        org_id: inv.org_id,
        created_by: context.userId,
        invoice_id: inv.id, // legacy convenience column; source of truth is the allocation below
        client_id: inv.client_id ?? null,
        client_name: inv.client_name,
        amount: remaining,
        method: data.method,
        reference: data.reference ?? null,
        paid_at: data.paid_at,
        currency: inv.currency,
      }).select("id").maybeSingle();
      if (pErr) throw new Error(pErr.message);
      if (!pay) throw new Error("Failed to record payment");
      const { error: aErr } = await (context.supabase as any).from("payment_allocations").insert({
        org_id: inv.org_id,
        payment_id: pay.id,
        kind: "invoice",
        invoice_id: inv.id,
        amount: remaining,
        currency: inv.currency,
        created_by: context.userId,
      });
      if (aErr) throw new Error(aErr.message);
    } else {
      // No balance owed — just flip status if it isn't already paid.
      await context.supabase.from("tax_invoices").update({ status: "paid" }).eq("id", inv.id);
    }

    await logActivity(context, inv.org_id, "paid", inv.id,
      `Invoice ${inv.number} marked paid on ${data.paid_at}`, inv.case_id);
    return { ok: true };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv } = await context.supabase.from("tax_invoices").select("id, number, org_id, case_id").eq("id", data.id).maybeSingle();
    if (!inv) throw new Error("Invoice not found");
    // Detach payments then delete the invoice.
    await context.supabase.from("payments").update({ invoice_id: null }).eq("invoice_id", data.id);
    const { error } = await context.supabase.from("tax_invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(context, (inv as any).org_id, "deleted", (inv as any).id,
      `Invoice ${(inv as any).number} deleted`, (inv as any).case_id);
    return { ok: true };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Deleting the payment cascades its allocations; the trigger recomputes each
    // affected invoice's amount_paid + status automatically.
    const { error } = await context.supabase.from("payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
