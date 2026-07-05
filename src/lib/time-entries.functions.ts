import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EntryInput = z.object({
  id: z.string().uuid().optional(),
  case_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  description: z.string().default(""),
  activity_type: z.string().default("work"),
  started_at: z.string(),
  ended_at: z.string().nullable().optional(),
  duration_seconds: z.number().int().nonnegative().default(0),
  hourly_rate: z.number().nullable().optional(),
  currency: z.string().default("USD"),
  billable: z.boolean().default(true),
  status: z.enum(["logged", "billed"]).default("logged"),
});

export const listTimeEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("time_entries")
      .select("*, cases(id, title, case_number), clients(id, name)")
      .order("started_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveTimeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EntryInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      ...data,
      case_id: data.case_id || null,
      client_id: data.client_id || null,
      ended_at: data.ended_at || null,
      owner_id: context.userId,
      is_running: false,
    };
    if (data.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await context.supabase
        .from("time_entries").update(rest).eq("id", id!).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("time_entries").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTimeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("time_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkDeleteTimeEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("time_entries").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

const TimerStart = z.object({
  case_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  description: z.string().default(""),
  hourly_rate: z.number().nullable().optional(),
  currency: z.string().default("USD"),
  billable: z.boolean().default(true),
});

export const startTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TimerStart.parse(d))
  .handler(async ({ data, context }) => {
    // stop any existing running timers first
    await context.supabase
      .from("time_entries")
      .update({ is_running: false, ended_at: new Date().toISOString() })
      .eq("owner_id", context.userId)
      .eq("is_running", true);
    const { data: row, error } = await context.supabase.from("time_entries").insert({
      owner_id: context.userId,
      case_id: data.case_id || null,
      client_id: data.client_id || null,
      description: data.description,
      activity_type: "work",
      started_at: new Date().toISOString(),
      hourly_rate: data.hourly_rate ?? null,
      currency: data.currency,
      billable: data.billable,
      status: "logged",
      is_running: true,
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const stopTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing, error: e1 } = await context.supabase
      .from("time_entries").select("started_at").eq("id", data.id).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!existing) throw new Error("Entry not found");
    const endedAt = new Date();
    const duration = Math.max(0, Math.floor((endedAt.getTime() - new Date(existing.started_at).getTime()) / 1000));
    const { data: row, error } = await context.supabase.from("time_entries").update({
      is_running: false,
      ended_at: endedAt.toISOString(),
      duration_seconds: duration,
    }).eq("id", data.id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const getRunningTimer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("time_entries")
      .select("*, cases(id, title), clients(id, name)")
      .eq("owner_id", context.userId)
      .eq("is_running", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const exportTimeEntriesCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    from: z.string().optional(), to: z.string().optional(), case_id: z.string().uuid().optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("time_entries")
      .select("started_at, ended_at, duration_seconds, description, activity_type, billable, status, hourly_rate, currency, cases(title, case_number), clients(name)")
      .order("started_at", { ascending: false });
    if (data.from) q = q.gte("started_at", data.from);
    if (data.to) q = q.lte("started_at", data.to);
    if (data.case_id) q = q.eq("case_id", data.case_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const header = ["Date","Hours","Description","Activity","Case","Client","Billable","Status","Rate","Currency","Amount"];
    const csv = [header.join(",")];
    for (const r of rows ?? []) {
      const hours = (Number(r.duration_seconds || 0) / 3600);
      const amount = (Number(r.hourly_rate || 0) * hours).toFixed(2);
      const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      csv.push([
        new Date(r.started_at).toISOString().slice(0,16).replace("T"," "),
        hours.toFixed(2),
        escape(r.description),
        r.activity_type,
        escape(r.cases?.title ?? ""),
        escape(r.clients?.name ?? ""),
        r.billable ? "yes" : "no",
        r.status,
        r.hourly_rate ?? "",
        r.currency,
        amount,
      ].join(","));
    }
    return { csv: csv.join("\n"), count: (rows ?? []).length };
  });

