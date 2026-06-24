import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ unread_only: z.boolean().optional(), limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.unread_only) q = q.is("read_at", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const unreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await (context.supabase as any)
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const markRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = (context.supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", context.userId);
    if (data.id) q = q.eq("id", data.id);
    else q = q.is("read_at", null);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("notifications").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Scans upcoming deadlines for the caller and creates notifications for items
 *  whose reminder_days windows have been hit but not yet notified today. */
export const runDeadlineReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data: member } = await sb.from("organization_members").select("org_id").eq("user_id", context.userId).eq("status", "active").maybeSingle();
    const orgId = member?.org_id ?? null;
    const { data: rows } = await sb
      .from("deadlines")
      .select("id, title, due_at, reminder_days, case_id, assigned_to, owner_id, kind")
      .eq("status", "open");
    const now = Date.now();
    let created = 0;
    for (const d of rows ?? []) {
      const due = new Date(d.due_at).getTime();
      const daysLeft = Math.ceil((due - now) / 86_400_000);
      const reminders: number[] = d.reminder_days ?? [7, 3, 1];
      if (!reminders.includes(daysLeft) && daysLeft !== 0) continue;
      const recipient = d.assigned_to ?? d.owner_id;
      if (!recipient) continue;
      // Dedupe by (kind=deadline_reminder, entity_id, daysLeft) within last 20h
      const { data: existing } = await sb
        .from("notifications")
        .select("id")
        .eq("user_id", recipient)
        .eq("entity_type", "deadline")
        .eq("entity_id", d.id)
        .gte("created_at", new Date(now - 20 * 3600_000).toISOString())
        .like("title", `%${daysLeft === 0 ? "due today" : `in ${daysLeft}d`}%`)
        .limit(1);
      if (existing && existing.length) continue;
      await sb.from("notifications").insert({
        org_id: orgId,
        user_id: recipient,
        kind: "deadline_reminder",
        title: daysLeft === 0 ? `${d.title} — due today` : `${d.title} — in ${daysLeft}d`,
        body: d.kind ? `${d.kind} on ${new Date(d.due_at).toLocaleString()}` : null,
        link: d.case_id ? `/app/cases/${d.case_id}` : "/app/deadlines",
        entity_type: "deadline",
        entity_id: d.id,
      });
      created++;
    }
    return { created };
  });
