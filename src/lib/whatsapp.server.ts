// Server-only Twilio SMS helper.
// Uses a single fixed sender number for the whole app.

export const SMS_FROM_NUMBER = "+13502381721";
export const WHATSAPP_FROM_NUMBER = SMS_FROM_NUMBER; // legacy alias

export async function sendSms(
  to: string,
  body: string,
  from: string = SMS_FROM_NUMBER,
): Promise<{ status: "sent" | "failed" | "skipped"; sid?: string; error?: string }> {
  const key = process.env.LOVABLE_API_KEY;
  const twKey = process.env.TWILIO_API_KEY;
  if (!key || !twKey) return { status: "skipped", error: "Twilio not configured" };
  const toNum = String(to || "").trim();
  const fromNum = String(from || "").trim();
  if (!toNum || !fromNum) return { status: "skipped", error: "Missing to/from number" };
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Connection-Api-Key": twKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toNum, From: fromNum, Body: body }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", error: JSON.stringify(json).slice(0, 500) };
    return { status: "sent", sid: json.sid };
  } catch (e: any) {
    return { status: "failed", error: String(e?.message || e) };
  }
}

// Legacy alias — now sends SMS, not WhatsApp
export const sendWhatsApp = sendSms;

// Fire-and-forget: never throws; logs failures.
export function fireSms(to: string | null | undefined, body: string) {
  if (!to) return;
  sendSms(to, body).then((r) => {
    if (r.status === "failed") {
      // eslint-disable-next-line no-console
      console.warn("[sms] send failed:", r.error);
    }
  });
}
export const fireWhatsApp = fireSms;

