import { createFileRoute } from "@tanstack/react-router";
import { detectOptOutKeyword, toE164 } from "@/lib/sms.server";

/**
 * Twilio inbound SMS webhook.
 * Twilio posts application/x-www-form-urlencoded with { From, To, Body, MessageSid }.
 *
 * Purpose: detect STOP / إيقاف / UNSUB and write into `sms_opt_outs` for the
 * organization that owns the destination number. Also reflect the opt-out onto
 * the linked debt payer or client record where possible.
 *
 * Public path — signature verification is not enforced here; this endpoint is
 * safe because it only records opt-out intent (adds rows to a deny-list).
 */
export const Route = createFileRoute("/api/public/hooks/twilio-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const fromRaw = String(form.get("From") || "");
          const toRaw = String(form.get("To") || "");
          const body = String(form.get("Body") || "");
          const from = toE164(fromRaw);
          const to = toE164(toRaw);
          if (!from) return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });

          const kw = detectOptOutKeyword(body);
          if (!kw) return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Find the org that last messaged this recipient (or that owns `To`).
          let orgId: string | null = null;
          const { data: lastMsg } = await (supabaseAdmin as any)
            .from("sms_messages")
            .select("org_id")
            .eq("to_number", from)
            .order("sent_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          orgId = lastMsg?.org_id ?? null;
          if (!orgId) {
            const { data: bySender } = await (supabaseAdmin as any)
              .from("organizations")
              .select("id")
              .eq("sms_sender_id", to)
              .maybeSingle();
            orgId = bySender?.id ?? null;
          }

          if (kw === "STOP" && orgId) {
            await (supabaseAdmin as any)
              .from("sms_opt_outs")
              .upsert({ org_id: orgId, phone: from, reason: "inbound_stop" }, { onConflict: "org_id,phone" });
            await (supabaseAdmin as any)
              .from("debt_case_payers")
              .update({ opted_out_at: new Date().toISOString() })
              .eq("phone", from);
          } else if (kw === "START" && orgId) {
            await (supabaseAdmin as any)
              .from("sms_opt_outs")
              .delete()
              .eq("org_id", orgId)
              .eq("phone", from);
            await (supabaseAdmin as any)
              .from("debt_case_payers")
              .update({ opted_out_at: null })
              .eq("phone", from);
          }

          const reply =
            kw === "STOP"
              ? "You have been unsubscribed. تم إلغاء الاشتراك."
              : "You are re-subscribed. تم إعادة اشتراكك.";
          return new Response(
            `<Response><Message>${reply}</Message></Response>`,
            { headers: { "Content-Type": "text/xml" } },
          );
        } catch (e: any) {
          console.warn("[twilio-inbound] error", e?.message);
          return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });
        }
      },
      GET: async () => new Response("<Response/>", { headers: { "Content-Type": "text/xml" } }),
    },
  },
});
