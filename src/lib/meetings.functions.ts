import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomRoom() {
  const slug = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
  return `lex-${slug}`;
}

export const createMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(1).default("Meeting"),
      case_id: z.string().uuid().nullable().optional(),
      client_id: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("meetings")
      .insert({
        owner_id: context.userId,
        title: data.title,
        room_name: randomRoom(),
        case_id: data.case_id ?? null,
        client_id: data.client_id ?? null,
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMeetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("meetings")
      .select("id, title, room_name, started_at, ended_at, case_id, client_id")
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("meetings").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Meeting not found");
    return row;
  });

export const saveMeetingTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      transcript: z.string().default(""),
      turns: z.array(z.any()).default([]),
      participants: z.array(z.any()).optional(),
      finalize: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      transcript: data.transcript,
      turns: data.turns,
    };
    if (data.participants) patch.participants = data.participants;
    if (data.finalize) patch.ended_at = new Date().toISOString();
    const { error } = await context.supabase.from("meetings").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("meetings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
