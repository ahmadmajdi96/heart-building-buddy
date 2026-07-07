import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled endpoint (pg_cron) that dispatches Twilio SMS reminders.
 *
 * Sources:
 *   1) Payment plan installments (payment_schedules with plan_id) — one reminder
 *      per unpaid installment × active rule, when today = installment.due_date + rule.offset_days.
 *   2) Standalone debt case payers (no linked plan installment) — uses payer.due_date.
 *
 * Path lives under /api/public/* so pg_cron can call it without auth.
 */

function toWa(n: string) {
  const s = String(n || "").trim();
  return s.startsWith("whatsapp:") ? s : `whatsapp:${s}`;
}

async function sendSms(to: string, body: string, from: string) {
  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.TWILIO_API_KEY!,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: toWa(to), From: toWa(from), Body: body }),
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok, sid: json.sid, error: !res.ok ? JSON.stringify(json).slice(0, 500) : undefined };
}


function render(tpl: string, vars: Record<string, string | number | null | undefined>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])));
}

export const Route = createFileRoute("/api/public/hooks/debt-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const from = process.env.TWILIO_FROM_NUMBER;
        if (!from) return Response.json({ ok: false, skipped: "TWILIO_FROM_NUMBER not set" }, { status: 200 });
        if (!process.env.LOVABLE_API_KEY || !process.env.TWILIO_API_KEY) {
          return Response.json({ ok: false, skipped: "Twilio not configured" }, { status: 200 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const today = new Date(); today.setUTCHours(0, 0, 0, 0);
        const todayIso = today.toISOString().slice(0, 10);
        const results: any[] = [];

        // -------- 1) Payment plan installments --------
        const { data: schedules } = await supabaseAdmin
          .from("payment_schedules")
          .select("id, plan_id, due_date, amount, currency, installment_no, installment_count, debt_case_id, client_id, client_name, status, reminder_sent_at")
          .not("debt_case_id", "is", null)
          .in("status", ["upcoming", "due", "overdue"]);

        // Group by debt_case_id to fetch rules + payer once per case
        const byCase = new Map<string, any[]>();
        for (const s of (schedules ?? []) as any[]) {
          if (!byCase.has(s.debt_case_id)) byCase.set(s.debt_case_id, []);
          byCase.get(s.debt_case_id)!.push(s);
        }

        for (const [caseId, items] of byCase.entries()) {
          const { data: rules } = await supabaseAdmin
            .from("debt_reminder_rules").select("*").eq("case_id", caseId).eq("active", true);
          if (!rules || rules.length === 0) continue;

          const { data: dcRow } = await supabaseAdmin
            .from("debt_cases").select("org_id, title, currency").eq("id", caseId).maybeSingle();

          const { data: payers } = await supabaseAdmin
            .from("debt_case_payers").select("id, name, phone, amount_due, amount_paid").eq("case_id", caseId);
          const payer = (payers ?? [])[0];
          if (!payer?.phone) continue;

          for (const s of items) {
            const due = new Date(s.due_date + "T00:00:00Z");
            for (const rule of rules as any[]) {
              if (rule.kind === "reminder_manual") continue;
              const fire = new Date(due); fire.setUTCDate(fire.getUTCDate() + Number(rule.offset_days || 0));
              const fireIso = fire.toISOString().slice(0, 10);
              if (fireIso !== todayIso) continue;

              // idempotency: skip if any log for this schedule + rule kind was created within last 20h
              const cutoff = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
              const { count } = await supabaseAdmin
                .from("debt_sms_log")
                .select("id", { count: "exact", head: true })
                .eq("case_id", caseId)
                .eq("payer_id", payer.id)
                .eq("kind", rule.kind)
                .gte("sent_at", cutoff);
              if ((count ?? 0) > 0) continue;

              const vars = {
                name: payer.name,
                amount_due: Number(s.amount).toFixed(2),
                due_date: s.due_date,
                case_title: dcRow?.title ?? "",
                installment: `${s.installment_no}/${s.installment_count}`,
                currency: s.currency ?? dcRow?.currency ?? "",
              };
              const msg = render(rule.message_template, vars);
              const r = await sendSms(payer.phone, msg, from);
              await supabaseAdmin.from("debt_sms_log").insert({
                org_id: dcRow?.org_id ?? "", case_id: caseId, payer_id: payer.id,
                phone: payer.phone, message: msg, kind: rule.kind,
                status: r.ok ? "sent" : "failed",
                twilio_sid: r.sid ?? null, error: r.error ?? null,
              });
              if (r.ok) {
                await supabaseAdmin.from("payment_schedules")
                  .update({ reminder_sent_at: new Date().toISOString() }).eq("id", s.id);
              }
              results.push({ schedule_id: s.id, kind: rule.kind, fire_at: fireIso, ok: r.ok });
            }
          }
        }

        // -------- 2) Standalone debt payers (no schedule) --------
        const { data: payers } = await supabaseAdmin
          .from("debt_case_payers")
          .select("id, case_id, name, phone, amount_due, amount_paid, due_date, status, last_reminder_kind, last_reminder_sent_at, debt_cases(org_id,title,currency)")
          .in("status", ["pending", "partial", "overdue"])
          .not("phone", "is", null)
          .not("due_date", "is", null);

        for (const p of (payers ?? []) as any[]) {
          const due = new Date(p.due_date + "T00:00:00Z");
          const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
          let kind: "reminder_upcoming" | "reminder_due" | "reminder_overdue" | null = null;
          if (diffDays === 3) kind = "reminder_upcoming";
          else if (diffDays === 0) kind = "reminder_due";
          else if (diffDays < 0) kind = "reminder_overdue";
          if (!kind) continue;

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
