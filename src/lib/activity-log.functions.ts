import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      case_id: z.string().uuid().optional(),
      actor_id: z.string().uuid().optional(),
      entity_type: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("activity_log")
      .select("id, actor_id, entity_type, entity_id, case_id, action, summary, metadata, created_at, cases(title, case_number)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.case_id) q = q.eq("case_id", data.case_id);
    if (data.actor_id) q = q.eq("actor_id", data.actor_id);
    if (data.entity_type) q = q.eq("entity_type", data.entity_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.actor_id as string | null).filter((x: string | null): x is string => !!x)));
    const nameById: Record<string, string | null> = {};
    if (ids.length) {
      const { data: profs } = await context.supabase.from("profiles").select("id, full_name").in("id", ids);
      for (const p of profs ?? []) nameById[p.id] = p.full_name;
    }
    return (rows ?? []).map((r: any) => ({ ...r, actor_name: r.actor_id ? nameById[r.actor_id] ?? null : null }));
  });
