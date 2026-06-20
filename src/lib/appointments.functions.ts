import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ApptInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  starts_at: z.string(),
  ends_at: z.string(),
  all_day: z.boolean().default(false),
  color: z.string().optional(),
  kind: z.enum(["court", "meeting", "deadline", "reminder"]).default("meeting"),
  case_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
});

export const listAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ from: z.string().optional(), to: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("appointments")
      .select("*, cases(id, title), clients(id, name)")
      .order("starts_at", { ascending: true });
    if (data.from) q = q.gte("starts_at", data.from);
    if (data.to) q = q.lte("starts_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApptInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      ...data,
      case_id: data.case_id || null,
      client_id: data.client_id || null,
      owner_id: context.userId,
    };
    if (data.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await context.supabase.from("appointments").update(rest).eq("id", id!).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("appointments").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("appointments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
