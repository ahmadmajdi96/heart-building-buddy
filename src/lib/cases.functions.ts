import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CaseInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  case_number: z.string().optional(),
  court: z.string().optional(),
  jurisdiction: z.string().optional(),
  status: z.enum(["open", "pending", "closed", "won", "lost"]).default("open"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  description: z.string().optional(),
  client_id: z.string().uuid().nullable().optional(),
});

export const listCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cases")
      .select("*, clients(id, name)")
      .order("opened_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [caseRes, events, docs, appts] = await Promise.all([
      context.supabase.from("cases").select("*, clients(id, name, email, phone)").eq("id", data.id).maybeSingle(),
      context.supabase.from("case_events").select("*").eq("case_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("documents").select("*").eq("case_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("appointments").select("*").eq("case_id", data.id).order("starts_at", { ascending: true }),
    ]);
    if (caseRes.error) throw new Error(caseRes.error.message);
    return {
      case: caseRes.data,
      events: events.data ?? [],
      documents: docs.data ?? [],
      appointments: appts.data ?? [],
    };
  });

export const saveCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CaseInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, client_id: data.client_id || null, owner_id: context.userId };
    if (data.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await context.supabase.from("cases").update(rest).eq("id", id!).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("cases").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cases").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const EventInput = z.object({
  case_id: z.string().uuid(),
  kind: z.enum(["update", "feedback", "court_session", "appointment", "milestone"]).default("update"),
  title: z.string().min(1),
  body: z.string().optional(),
  scheduled_at: z.string().nullable().optional(),
});

export const addCaseEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EventInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("case_events").insert({
      ...data, owner_id: context.userId,
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCaseEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("case_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
