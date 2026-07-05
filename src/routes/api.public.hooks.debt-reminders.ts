import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled endpoint (pg_cron) that scans debt collection payers and sends
 * Twilio SMS reminders based on due date brackets:
 *   - 3 days before due    -> reminder_upcoming
 *   - on the due date      -> reminder_due
 *   - each day when overdue -> reminder_overdue
 *
 * Requirements:
 *   - env TWILIO_FROM_NUMBER (E.164, must be a Twilio sender)
 *   - env LOVABLE_API_KEY and TWILIO_API_KEY (auto-provisioned)
 *
 * Path lives under /api/public/* so pg_cron can call it without auth.
 */

async function sendSms(to: string, body: string, from: string) {
  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.TWILIO_API_KEY!,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok, sid: json.sid, error: !res.ok ? JSON.stringify(json).slice(0, 500) : undefined };
}

export const Route = createFileRoute("/api/public/hooks/debt-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const from = process.env.TWILIO_FROM_NUMBER;
        if (!from) {
          return Response.json({ ok: false, skipped: "TWILIO_FROM_NUMBER not set" }, { status: 200 });
        }
        if (!process.env.LOVABLE_API_KEY || !process.env.TWILIO_API_KEY) {
          return Response.json({ ok: false, skipped: "Twilio not configured" }, { status: 200 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in3 = new Date(today); in3.setDate(in3.getDate() + 3);
        const iso = (d: Date) => d.toISOString().slice(0, 10);

        const { data: payers } = await supabaseAdmin
          .from("debt_case_payers")
          .select("id, case_id, name, phone, amount_due, amount_paid, due_date, status, last_reminder_kind, last_reminder_sent_at, debt_cases(org_id,title,currency)")
          .in("status", ["pending", "partial", "overdue"])
          .not("phone", "is", null)
          .not("due_date", "is", null);

        const results: any[] = [];
        for (const p of (payers ?? []) as any[]) {
          if (!p.phone || !p.due_date) continue;
          const due = new Date(p.due_date);
          const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
          let kind: "reminder_upcoming" | "reminder_due" | "reminder_overdue" | null = null;
          if (diffDays === 3) kind = "reminder_upcoming";
          else if (diffDays === 0) kind = "reminder_due";
          else if (diffDays < 0) kind = "reminder_overdue";
          if (!kind) continue;

          // Skip duplicate reminders sent within last 20h for same kind (except overdue which is daily)
          if (p.last_reminder_kind === kind && p.last_reminder_sent_at) {
            const hours = (Date.now() - new Date(p.last_reminder_sent_at).getTime()) / 3600000;
            if (hours < 20) continue;
          }

          const balance = Number(p.amount_due || 0) - Number(p.amount_paid || 0);
          const ccy = p.debt_cases?.currency ?? "";
          const title = p.debt_cases?.title ?? "";
          const msg =
            kind === "reminder_upcoming" ? `Reminder: ${balance.toFixed(2)} ${ccy} due on ${p.due_date} — ${title}`
            : kind === "reminder_due" ? `Payment due today: ${balance.toFixed(2)} ${ccy} — ${title}`
            : `OVERDUE: ${balance.toFixed(2)} ${ccy} was due ${p.due_date} — ${title}`;

          const r = await sendSms(p.phone, msg, from);
          await supabaseAdmin.from("debt_sms_log").insert({
            org_id: p.debt_cases?.org_id, case_id: p.case_id, payer_id: p.id,
            phone: p.phone, message: msg, kind,
            status: r.ok ? "sent" : "failed",
            twilio_sid: r.sid ?? null, error: r.error ?? null,
          });
          if (r.ok) {
            await supabaseAdmin.from("debt_case_payers")
              .update({ last_reminder_sent_at: new Date().toISOString(), last_reminder_kind: kind, status: kind === "reminder_overdue" ? "overdue" : p.status })
              .eq("id", p.id);
          }
          results.push({ payer_id: p.id, kind, ok: r.ok });
        }
        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
