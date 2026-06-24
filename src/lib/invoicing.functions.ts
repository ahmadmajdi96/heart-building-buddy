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

    // Pull entries (RLS ensures only owner can read them)
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
      return {
        description: e.description || "Legal services",
        quantity: hours,
        unit_price,
      };
    });
    const subtotal = items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
    const taxRate = data.tax_rate ?? (mem.organizations?.default_tax_rate ?? 0);
    const tax_amount = Number(((subtotal * Number(taxRate)) / 100).toFixed(2));
    const total = Number((subtotal + tax_amount).toFixed(2));

    const { data: numRes, error: nErr } = await context.supabase.rpc("next_doc_number", {
      _org_id: mem.org_id,
      _kind: "invoice",
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
        tax_amount,
        total,
        notes: data.notes ?? null,
        items,
        created_by: context.userId,
      })
      .select()
      .maybeSingle();
    if (iErr) throw new Error(iErr.message);
    if (!inv) throw new Error("Failed to create invoice");

    const { error: uErr } = await context.supabase
      .from("time_entries")
      .update({ status: "billed", invoice_id: inv.id })
      .in("id", usable.map((e: any) => e.id));
    if (uErr) throw new Error(uErr.message);

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
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
