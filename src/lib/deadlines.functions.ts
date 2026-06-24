import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCallerOrgId(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.org_id as string | undefined) ?? null;
}

const KindEnum = z.enum(["hearing", "filing", "appeal", "limitation", "follow_up", "deadline"]);
const StatusEnum = z.enum(["open", "completed", "cancelled"]);

export const listDeadlines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      case_id: z.string().uuid().optional(),
      status: StatusEnum.optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("deadlines")
      .select("id, case_id, kind, title, description, location, court, due_at, status, completed_at, reminder_days, assigned_to, owner_id, created_at, cases(id, title, case_number)")
      .order("due_at", { ascending: true });
    if (data.case_id) q = q.eq("case_id", data.case_id);
    if (data.status) q = q.eq("status", data.status);
    if (data.from) q = q.gte("due_at", data.from);
    if (data.to) q = q.lte("due_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      case_id: z.string().uuid().nullable().optional(),
      kind: KindEnum.default("deadline"),
      title: z.string().min(1),
      description: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      court: z.string().nullable().optional(),
      due_at: z.string(),
      reminder_days: z.array(z.number().int().nonnegative()).optional(),
      assigned_to: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const orgId = await getCallerOrgId(context);
    if (!orgId) throw new Error("No organization for caller");
    const payload: any = {
      org_id: orgId,
      case_id: data.case_id ?? null,
      kind: data.kind,
      title: data.title,
      description: data.description ?? null,
      location: data.location ?? null,
      court: data.court ?? null,
      due_at: data.due_at,
      assigned_to: data.assigned_to ?? null,
    };
    if (data.reminder_days) payload.reminder_days = data.reminder_days;
    let row;
    if (data.id) {
      const { data: r, error } = await (context.supabase as any)
        .from("deadlines").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      row = r;
    } else {
      const { data: r, error } = await (context.supabase as any)
        .from("deadlines").insert({ ...payload, owner_id: context.userId }).select().maybeSingle();
      if (error) throw new Error(error.message);
      row = r;
    }
    await (context.supabase as any).from("activity_log").insert({
      org_id: orgId, actor_id: context.userId,
      entity_type: "deadline", entity_id: row?.id, case_id: data.case_id ?? null,
      action: data.id ? "updated" : "created",
      summary: `${data.id ? "Updated" : "Added"} ${data.kind}: ${data.title}`,
    });
    return row;
  });

export const completeDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), completed: z.boolean().default(true) }).parse(d))
  .handler(async ({ data, context }) => {
    const orgId = await getCallerOrgId(context);
    const { data: row, error } = await (context.supabase as any)
      .from("deadlines")
      .update({
        status: data.completed ? "completed" : "open",
        completed_at: data.completed ? new Date().toISOString() : null,
        completed_by: data.completed ? context.userId : null,
      })
      .eq("id", data.id).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (orgId) {
      await (context.supabase as any).from("activity_log").insert({
        org_id: orgId, actor_id: context.userId,
        entity_type: "deadline", entity_id: data.id, case_id: row?.case_id ?? null,
        action: data.completed ? "completed" : "reopened",
        summary: `${data.completed ? "Completed" : "Reopened"} deadline: ${row?.title ?? ""}`,
      });
    }
    return row;
  });

export const deleteDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const orgId = await getCallerOrgId(context);
    const { data: row } = await (context.supabase as any)
      .from("deadlines").select("title, case_id").eq("id", data.id).maybeSingle();
    const { error } = await (context.supabase as any).from("deadlines").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (orgId) {
      await (context.supabase as any).from("activity_log").insert({
        org_id: orgId, actor_id: context.userId,
        entity_type: "deadline", entity_id: data.id, case_id: row?.case_id ?? null,
        action: "deleted",
        summary: `Deleted deadline: ${row?.title ?? ""}`,
      });
    }
    return { ok: true };
  });

export const deadlineStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const eod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const in7 = new Date(now.getTime() + 7 * 86400_000).toISOString();
    const { data: rows } = await (context.supabase as any)
      .from("deadlines").select("id, due_at, status, title, case_id, kind, cases(title)").eq("status", "open");
    const list = rows ?? [];
    const today = list.filter((d: any) => new Date(d.due_at) <= new Date(eod) && new Date(d.due_at) >= now);
    const week = list.filter((d: any) => new Date(d.due_at) <= new Date(in7) && new Date(d.due_at) >= now);
    const overdue = list.filter((d: any) => new Date(d.due_at) < now);
    return { today, week, overdue, all: list };
  });
