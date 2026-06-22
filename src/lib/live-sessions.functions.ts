import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TurnSchema = z.object({
  speaker: z.string(),
  text: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
});

export const listLiveSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("live_sessions")
      .select("id,title,status,started_at,ended_at,duration_seconds,case_id,client_id")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("live_sessions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(1).default("Live session"),
      case_id: z.string().uuid().nullable().optional(),
      client_id: z.string().uuid().nullable().optional(),
      language: z.string().default("ar"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("live_sessions")
      .insert({
        owner_id: context.userId,
        title: data.title,
        case_id: data.case_id ?? null,
        client_id: data.client_id ?? null,
        language: data.language,
        status: "recording",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      transcript: z.string(),
      turns: z.array(TurnSchema),
      finalize: z.boolean().default(false),
      duration_seconds: z.number().int().nonnegative().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      transcript: data.transcript,
      turns: data.turns,
    };
    if (data.finalize) {
      patch.status = "completed";
      patch.ended_at = new Date().toISOString();
      if (data.duration_seconds != null) patch.duration_seconds = data.duration_seconds;
    }
    const { error } = await context.supabase
      .from("live_sessions")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("live_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
