// Server-only Twilio WhatsApp helper.
// Uses a single fixed sender number for the whole app.

export const WHATSAPP_FROM_NUMBER = "+13502381721";

function toWa(n: string) {
  const s = String(n || "").trim();
  if (!s) return "";
  return s.startsWith("whatsapp:") ? s : `whatsapp:${s}`;
}

export async function sendWhatsApp(
  to: string,
  body: string,
  from: string = WHATSAPP_FROM_NUMBER,
): Promise<{ status: "sent" | "failed" | "skipped"; sid?: string; error?: string }> {
  const key = process.env.LOVABLE_API_KEY;
  const twKey = process.env.TWILIO_API_KEY;
  if (!key || !twKey) return { status: "skipped", error: "Twilio not configured" };
  const toNum = toWa(to);
  const fromNum = toWa(from);
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

// Fire-and-forget: never throws; logs failures.
export function fireWhatsApp(to: string | null | undefined, body: string) {
  if (!to) return;
  sendWhatsApp(to, body).then((r) => {
    if (r.status === "failed") {
      // eslint-disable-next-line no-console
      console.warn("[whatsapp] send failed:", r.error);
    }
  });
}
