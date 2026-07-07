import { createFileRoute } from "@tanstack/react-router";

/**
 * Twilio StatusCallback receiver.
 * Twilio posts application/x-www-form-urlencoded with fields including:
 *   MessageSid, MessageStatus, ErrorCode, To, From
 * https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
 *
 * Public path — signature verification is skipped (StatusCallback is best-effort;
 * we only update rows we already own by SID).
 */
export const Route = createFileRoute("/api/public/hooks/twilio-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const sid = String(form.get("MessageSid") || "").trim();
          const status = String(form.get("MessageStatus") || "").trim();
          const errorCode = form.get("ErrorCode") ? String(form.get("ErrorCode")) : null;
          const errorMessage = form.get("ErrorMessage") ? String(form.get("ErrorMessage")) : null;
          if (!sid || !status) return new Response("ok");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const patch: Record<string, any> = { status };
          if (errorCode) patch.error_code = errorCode;
          if (errorMessage) patch.error_message = errorMessage;
          if (status === "delivered") patch.delivered_at = new Date().toISOString();

          await (supabaseAdmin as any).from("sms_messages").update(patch).eq("twilio_sid", sid);

          // Best-effort mirror into legacy debt_sms_log by twilio_sid
          if (["delivered", "failed", "undelivered", "sent"].includes(status)) {
            await supabaseAdmin
              .from("debt_sms_log")
              .update({ status, error: errorMessage ?? undefined })
              .eq("twilio_sid", sid);
          }

          return new Response("ok");
        } catch (e: any) {
          console.warn("[twilio-status] error", e?.message);
          return new Response("ok");
        }
      },
      GET: async () => new Response("ok"),
    },
  },
});
