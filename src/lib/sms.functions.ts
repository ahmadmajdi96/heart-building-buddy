import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ListInput = z.object({
  context: z.enum(["client_welcome", "case_assignment", "debt_reminder", "manual"]).optional(),
  status: z.string().optional(),
  client_id: z.string().uuid().optional(),
  case_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(500).default(200),
});

export const listSmsMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("sms_messages")
      .select("*, clients(id,name), cases(id,title,case_number)")
      .order("sent_at", { ascending: false })
      .limit(data.limit);
    if (data.context) q = q.eq("context", data.context);
    if (data.status) q = q.eq("status", data.status);
    if (data.client_id) q = q.eq("client_id", data.client_id);
    if (data.case_id) q = q.eq("case_id", data.case_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const smsStatusSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("sms_messages")
      .select("status, context")
      .limit(5000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { status: string; context: string }[];
    const byStatus: Record<string, number> = {};
    const byContext: Record<string, number> = {};
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byContext[r.context] = (byContext[r.context] ?? 0) + 1;
    }
    return { total: rows.length, byStatus, byContext };
  });
