// Server-only Twilio SMS helper with delivery-status tracking.

export const SMS_FROM_NUMBER = "+13502381721";
export const WHATSAPP_FROM_NUMBER = SMS_FROM_NUMBER; // legacy alias

const PROJECT_ID = "fb990850-3f8b-4251-83c6-f826e75969f7";
const STATUS_CALLBACK_URL = `https://project--${PROJECT_ID}.lovable.app/api/public/hooks/twilio-status`;

export type SmsContext = "client_welcome" | "case_assignment" | "debt_reminder" | "manual";

export type SmsMeta = {
  owner_id?: string | null;
  org_id?: string | null;
  client_id?: string | null;
  case_id?: string | null;
  debt_case_id?: string | null;
  context?: SmsContext;
};

export type SmsResult = {
  status: "sent" | "failed" | "skipped";
  sid?: string;
  error?: string;
  logged_id?: string;
};

async function logSms(row: Record<string, any>): Promise<string | undefined> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("sms_messages").insert(row).select("id").maybeSingle();
    return data?.id;
  } catch (e) {
    console.warn("[sms] failed to log:", (e as any)?.message);
    return undefined;
  }
}

export async function sendSms(
  to: string,
  body: string,
  meta: SmsMeta = {},
  from: string = SMS_FROM_NUMBER,
): Promise<SmsResult> {
  const key = process.env.LOVABLE_API_KEY;
  const twKey = process.env.TWILIO_API_KEY;
  const toNum = String(to || "").trim();
  const fromNum = String(from || "").trim();

  const baseRow = {
    owner_id: meta.owner_id ?? null,
    org_id: meta.org_id ?? null,
    client_id: meta.client_id ?? null,
    case_id: meta.case_id ?? null,
    debt_case_id: meta.debt_case_id ?? null,
    context: meta.context ?? "manual",
    to_number: toNum,
    from_number: fromNum,
    body,
  };

  if (!key || !twKey) {
    const id = await logSms({ ...baseRow, status: "failed", error_message: "Twilio not configured" });
    return { status: "skipped", error: "Twilio not configured", logged_id: id };
  }
  if (!toNum || !fromNum) {
    const id = await logSms({ ...baseRow, status: "failed", error_message: "Missing to/from number" });
    return { status: "skipped", error: "Missing to/from number", logged_id: id };
  }

  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Connection-Api-Key": twKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toNum,
        From: fromNum,
        Body: body,
        StatusCallback: STATUS_CALLBACK_URL,
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const id = await logSms({
        ...baseRow,
        status: "failed",
        error_code: json?.code ? String(json.code) : null,
        error_message: JSON.stringify(json).slice(0, 500),
      });
      return { status: "failed", error: JSON.stringify(json).slice(0, 500), logged_id: id };
    }
    const id = await logSms({
      ...baseRow,
      status: json?.status ?? "queued",
      twilio_sid: json?.sid ?? null,
    });
    return { status: "sent", sid: json?.sid, logged_id: id };
  } catch (e: any) {
    const id = await logSms({ ...baseRow, status: "failed", error_message: String(e?.message || e) });
    return { status: "failed", error: String(e?.message || e), logged_id: id };
  }
}

export const sendWhatsApp = sendSms; // legacy alias

// Fire-and-forget: never throws; logs failures.
export function fireSms(to: string | null | undefined, body: string, meta: SmsMeta = {}) {
  if (!to) return;
  sendSms(to, body, meta).then((r) => {
    if (r.status === "failed") {
      console.warn("[sms] send failed:", r.error);
    }
  });
}
export const fireWhatsApp = fireSms;
