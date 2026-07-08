import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getOrg(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("organization_members")
    .select("org_id, organizations(currency)")
    .eq("user_id", ctx.userId).eq("status", "active")
    .order("created_at").limit(1).maybeSingle();
  if (!data?.org_id) throw new Error("No active organization");
  return data as { org_id: string; organizations: { currency: string } | null };
}

const ExpenseInput = z.object({
  id: z.string().uuid().optional(),
  case_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  kind: z.enum(["court_fee", "expert", "translation", "filing", "travel", "other"]).default("other"),
  description: z.string().optional().nullable(),
  amount: z.number().positive(),
  currency: z.string().optional(),
  incurred_on: z.string().optional(),
  billable: z.boolean().default(true),
  status: z.enum(["wip", "billed", "written_off", "non_billable"]).default("wip"),
  receipt_url: z.string().url().nullable().optional(),
});

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      case_id: z.string().uuid().nullable().optional(),
      client_id: z.string().uuid().nullable().optional(),
      status: z.enum(["wip", "billed", "written_off", "non_billable"]).nullable().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { org_id } = await getOrg(context);
    let q = (context.supabase as any).from("expenses").select("*").eq("org_id", org_id).order("incurred_on", { ascending: false });
    if (data.case_id) q = q.eq("case_id", data.case_id);
    if (data.client_id) q = q.eq("client_id", data.client_id);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExpenseInput.parse(d))
  .handler(async ({ data, context }) => {
    const { org_id, organizations } = await getOrg(context);
    const payload: any = {
      ...data,
      org_id,
      currency: data.currency || organizations?.currency || "JOD",
      created_by: context.userId,
      incurred_on: data.incurred_on || new Date().toISOString().slice(0, 10),
    };
    if (data.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await (context.supabase as any).from("expenses").update(rest).eq("id", id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await (context.supabase as any).from("expenses").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setExpenseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["wip", "billed", "written_off", "non_billable"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("expenses").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
