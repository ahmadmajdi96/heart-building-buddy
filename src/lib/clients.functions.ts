import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ClientInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  national_id: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: client, error }, { data: interactions }, { data: cases }] = await Promise.all([
      context.supabase.from("clients").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("client_interactions").select("*").eq("client_id", data.id).order("occurred_at", { ascending: false }),
      context.supabase.from("cases").select("id,title,case_number,status,priority,opened_at").eq("client_id", data.id).order("opened_at", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);
    return { client, interactions: interactions ?? [], cases: cases ?? [] };
  });

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClientInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, email: data.email || null, owner_id: context.userId };
    if (data.id) {
      const { id, ...rest } = payload;
      const { data: row, error } = await context.supabase.from("clients").update(rest).eq("id", id!).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("clients").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const InteractionInput = z.object({
  client_id: z.string().uuid(),
  kind: z.enum(["call", "session", "note", "email"]).default("note"),
  title: z.string().optional(),
  body: z.string().optional(),
  occurred_at: z.string().optional(),
});

export const addInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InteractionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("client_interactions").insert({
      ...data, owner_id: context.userId,
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("client_interactions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
