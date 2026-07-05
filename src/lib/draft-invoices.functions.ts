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
  return data as { org_id: string; role: string; organizations: { currency: string; default_tax_rate: number } | null };
}

const Item = z.object({
  description: z.string().default(""),
  quantity: z.number().default(0),
  unit_price: z.number().default(0),
});

const DraftInput = z.object({
  id: z.string().uuid().optional(),
  client_name: z.string().min(1),
  client_id: z.string().uuid().nullable().optional(),
  case_id: z.string().uuid().nullable().optional(),
  issue_date: z.string().optional(),
  due_date: z.string().nullable().optional(),
  tax_rate: z.number().default(0),
  currency: z.string().optional(),
  items: z.array(Item).default([]),
  notes: z.string().optional(),
});

function totals(items: { quantity: number; unit_price: number }[], rate: number) {
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const tax_amount = Number(((subtotal * (Number(rate) || 0)) / 100).toFixed(2));
  return { subtotal: Number(subtotal.toFixed(2)), tax_amount, total: Number((subtotal + tax_amount).toFixed(2)) };
}

export const listDraftInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const mem = await getCallerOrg(context);
    const { data, error } = await context.supabase
      .from("draft_invoices")
      .select("*")
      .eq("org_id", mem.org_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDraftInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DraftInput.parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const t = totals(data.items, data.tax_rate);
    const payload: any = {
      org_id: mem.org_id,
      created_by: context.userId,
      client_id: data.client_id || null,
      client_name: data.client_name,
      case_id: data.case_id || null,
      issue_date: data.issue_date || new Date().toISOString().slice(0, 10),
      due_date: data.due_date || null,
      currency: data.currency || mem.organizations?.currency || "USD",
      tax_rate: Number(data.tax_rate ?? 0),
      subtotal: t.subtotal,
      tax_amount: t.tax_amount,
      total: t.total,
      items: data.items,
      notes: data.notes ?? null,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("draft_invoices")
        .update(payload)
        .eq("id", data.id)
        .select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("draft_invoices").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDraftInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("draft_invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptDraftInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    due_date: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const { data: draft, error: dErr } = await context.supabase
      .from("draft_invoices").select("*").eq("id", data.id).maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!draft) throw new Error("Draft not found");
    if (draft.status === "accepted") throw new Error("Already accepted");

    const { data: numRes, error: nErr } = await context.supabase.rpc("next_doc_number", {
      _org_id: mem.org_id, _kind: "invoice",
    });
    if (nErr) throw new Error(nErr.message);

    const { data: inv, error: iErr } = await context.supabase
      .from("tax_invoices").insert({
        org_id: mem.org_id,
        number: numRes as string,
        client_id: draft.client_id,
        client_name: draft.client_name,
        case_id: draft.case_id,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: data.due_date ?? draft.due_date,
        status: "issued",
        currency: draft.currency,
        tax_rate: draft.tax_rate,
        subtotal: draft.subtotal,
        tax_amount: draft.tax_amount,
        total: draft.total,
        notes: draft.notes,
        items: draft.items,
        created_by: context.userId,
      }).select().maybeSingle();
    if (iErr) throw new Error(iErr.message);

    await context.supabase.from("draft_invoices")
      .update({ status: "accepted", accepted_invoice_id: inv!.id, accepted_at: new Date().toISOString() })
      .eq("id", data.id);

    try {
      await context.supabase.from("activity_log").insert([
        { org_id: mem.org_id, actor_id: context.userId, entity_type: "draft_invoice", entity_id: data.id,
          case_id: draft.case_id ?? null, action: "accepted",
          summary: `Draft accepted for ${draft.client_name}` },
        { org_id: mem.org_id, actor_id: context.userId, entity_type: "invoice", entity_id: inv!.id,
          case_id: draft.case_id ?? null, action: "converted_from_draft",
          summary: `Invoice ${(inv as any).number} converted from draft` },
      ]);
    } catch { /* non-fatal */ }

    return inv;
  });

export const rejectDraftInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("draft_invoices")
      .update({ status: "rejected" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkAcceptDraftInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    ids: z.array(z.string().uuid()).min(1),
    due_date: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const results: { id: string; ok: boolean; error?: string; invoice_number?: string }[] = [];
    for (const id of data.ids) {
      try {
        const { data: draft, error: dErr } = await context.supabase
          .from("draft_invoices").select("*").eq("id", id).maybeSingle();
        if (dErr) throw new Error(dErr.message);
        if (!draft || draft.status !== "draft") throw new Error("Not a draft");
        const { data: numRes, error: nErr } = await context.supabase.rpc("next_doc_number", {
          _org_id: mem.org_id, _kind: "invoice",
        });
        if (nErr) throw new Error(nErr.message);
        const { data: inv, error: iErr } = await context.supabase
          .from("tax_invoices").insert({
            org_id: mem.org_id, number: numRes as string,
            client_id: draft.client_id, client_name: draft.client_name, case_id: draft.case_id,
            issue_date: new Date().toISOString().slice(0, 10),
            due_date: data.due_date ?? draft.due_date,
            status: "issued", currency: draft.currency, tax_rate: draft.tax_rate,
            subtotal: draft.subtotal, tax_amount: draft.tax_amount, total: draft.total,
            notes: draft.notes, items: draft.items, created_by: context.userId,
          }).select().maybeSingle();
        if (iErr) throw new Error(iErr.message);
        await context.supabase.from("draft_invoices")
          .update({ status: "accepted", accepted_invoice_id: (inv as any).id, accepted_at: new Date().toISOString() })
          .eq("id", id);
        try {
          await context.supabase.from("activity_log").insert([
            { org_id: mem.org_id, actor_id: context.userId, entity_type: "draft_invoice", entity_id: id,
              case_id: draft.case_id ?? null, action: "accepted",
              summary: `Draft accepted for ${draft.client_name} (bulk)` },
            { org_id: mem.org_id, actor_id: context.userId, entity_type: "invoice", entity_id: (inv as any).id,
              case_id: draft.case_id ?? null, action: "converted_from_draft",
              summary: `Invoice ${(inv as any).number} converted from draft (bulk)` },
          ]);
        } catch { /* non-fatal */ }
        results.push({ id, ok: true, invoice_number: (inv as any).number });
      } catch (e) {
        results.push({ id, ok: false, error: (e as Error).message });
      }
    }
    return results;
  });

const DraftFromTimeInput = z.object({
  entry_ids: z.array(z.string().uuid()).min(1),
  client_name: z.string().min(1),
  client_id: z.string().uuid().nullable().optional(),
  case_id: z.string().uuid().nullable().optional(),
  tax_rate: z.number().nullable().optional(),
  due_date: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export const createDraftFromTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DraftFromTimeInput.parse(d))
  .handler(async ({ data, context }) => {
    const mem = await getCallerOrg(context);
    const { data: entries, error: eErr } = await context.supabase
      .from("time_entries")
      .select("id, description, duration_seconds, hourly_rate, billable, status")
      .in("id", data.entry_ids);
    if (eErr) throw new Error(eErr.message);
    const usable = (entries ?? []).filter((e: any) => e.billable && e.status !== "billed");
    if (usable.length === 0) throw new Error("No billable, unbilled entries selected");
    const items = usable.map((e: any) => ({
      description: e.description || "Legal services",
      quantity: Number((e.duration_seconds / 3600).toFixed(2)),
      unit_price: Number(e.hourly_rate ?? 0),
    }));
    const rate = data.tax_rate ?? (mem.organizations?.default_tax_rate ?? 0);
    const t = totals(items, Number(rate));
    const { data: row, error } = await context.supabase.from("draft_invoices").insert({
      org_id: mem.org_id,
      created_by: context.userId,
      client_id: data.client_id || null,
      client_name: data.client_name,
      case_id: data.case_id || null,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: data.due_date || null,
      currency: mem.organizations?.currency || "USD",
      tax_rate: Number(rate),
      subtotal: t.subtotal, tax_amount: t.tax_amount, total: t.total,
      items,
      notes: data.notes ?? null,
      time_entry_ids: usable.map((e: any) => e.id),
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    // Mark entries billed so they don't get re-invoiced from the draft.
    await context.supabase.from("time_entries")
      .update({ status: "billed" }).in("id", usable.map((e: any) => e.id));
    return row;
  });
