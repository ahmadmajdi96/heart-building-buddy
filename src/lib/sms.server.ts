// Server-only SMS helper with Jordan-TRC compliance enforcement.
//
// Compliance rules enforced here (Phase 5 rail):
//  - Opt-outs: recipient present in `sms_opt_outs` → refuse.
//  - Quiet hours: send blocked when the current Amman local time is inside
//    the org's `sms_quiet_hours_start/end` window (default 21:00–09:00).
//  - Daily cap: at most `sms_daily_cap_per_recipient` messages per phone
//    per rolling 24h (default 1) for commercial contexts.
//  - Consent: `debt_reminder` context requires debtor opt-in (sms_consent_at).
//  - Encoding + segments: Arabic → UCS-2 (70 chars/seg), Latin → GSM-7
//    (160 chars/seg); recorded on the log row.
//  - Sender ID: TRC-registered alphanumeric from `organizations.sms_sender_id`
//    (falls back to a numeric long-code for transactional flows in dev).
//  - Bilingual opt-out footer appended when org has it enabled (default true).

export const SMS_LONG_CODE = "+13502381721"; // fallback numeric for dev; production uses org sender ID

const PROJECT_ID = "fb990850-3f8b-4251-83c6-f826e75969f7";
const STATUS_CALLBACK_URL = `https://project--${PROJECT_ID}.lovable.app/api/public/hooks/twilio-status`;

export type SmsContext =
  | "client_welcome"
  | "case_assignment"
  | "debt_reminder"
  | "installment_reminder"
  | "otp"
  | "manual";

/** Contexts that must respect quiet hours + daily cap + consent. */
const COMMERCIAL_CONTEXTS: SmsContext[] = ["debt_reminder", "installment_reminder", "manual"];
/** Contexts that must not be blocked by quiet hours or daily cap (e.g. security OTP, account transactional). */
const TRANSACTIONAL_CONTEXTS: SmsContext[] = ["otp", "client_welcome", "case_assignment"];

export type SmsMeta = {
  owner_id?: string | null;
  org_id?: string | null;
  client_id?: string | null;
  case_id?: string | null;
  debt_case_id?: string | null;
  debt_payer_id?: string | null;
  context?: SmsContext;
  language?: "ar" | "en" | null;
  template_id?: string | null;
  /** Skip commercial-only checks (consent, quiet hours, daily cap). Used for security OTP. */
  force_transactional?: boolean;
};

export type SmsResult = {
  status: "sent" | "failed" | "blocked" | "skipped";
  sid?: string;
  error?: string;
  blocked_reason?: string;
  logged_id?: string;
};

export function toE164(raw: string, defaultCountry = "962"): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return "+" + s.slice(1).replace(/\D/g, "");
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith(defaultCountry)) return "+" + digits;
  if (digits.startsWith("0")) return "+" + defaultCountry + digits.slice(1);
  return "+" + digits;
}

/** Detect Arabic script -> forces UCS-2 (70-char segments). */
export function detectEncoding(body: string): "GSM-7" | "UCS-2" {
  // Arabic ranges: 0600-06FF, 0750-077F, FB50-FDFF, FE70-FEFF
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(body) ? "UCS-2" : "GSM-7";
}

export function segmentCount(body: string, encoding: "GSM-7" | "UCS-2"): number {
  const len = [...body].length;
  if (encoding === "UCS-2") {
    if (len <= 70) return 1;
    return Math.ceil(len / 67);
  }
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

/** True when `now` (UTC) falls inside the closed-open [start, end) window in `tz`. Handles wrap-around windows like 21:00→09:00. */
export function isInQuietHours(
  now: Date,
  startHHMM: string,
  endHHMM: string,
  tz: string = "Asia/Amman",
): boolean {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    const cur = h * 60 + m;
    const [sh, sm] = startHHMM.split(":").map((x) => parseInt(x, 10));
    const [eh, em] = endHHMM.split(":").map((x) => parseInt(x, 10));
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (start === end) return false;
    if (start < end) return cur >= start && cur < end;
    // wrap-around (e.g. 21:00 → 09:00 next day)
    return cur >= start || cur < end;
  } catch {
    return false;
  }
}

/** Bilingual opt-out footer appended when org has it enabled. */
const OPT_OUT_FOOTER = "\nللإيقاف أرسل STOP · Reply STOP to unsubscribe";

async function logSms(row: Record<string, any>): Promise<string | undefined> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("sms_messages").insert(row).select("id").maybeSingle();
    return data?.id;
  } catch (e) {
    console.warn("[sms] failed to log:", (e as any)?.message);
    return undefined;
  }
}

async function loadOrgConfig(admin: any, orgId: string | null | undefined) {
  if (!orgId) return null;
  const { data } = await admin
    .from("organizations")
    .select("sms_sender_id, sms_quiet_hours_start, sms_quiet_hours_end, sms_timezone, sms_daily_cap_per_recipient, sms_bilingual_footer")
    .eq("id", orgId)
    .maybeSingle();
  return data as {
    sms_sender_id: string | null;
    sms_quiet_hours_start: string;
    sms_quiet_hours_end: string;
    sms_timezone: string;
    sms_daily_cap_per_recipient: number;
    sms_bilingual_footer: boolean;
  } | null;
}

async function isOptedOut(admin: any, orgId: string | null | undefined, phone: string) {
  if (!orgId) return false;
  const { data } = await admin
    .from("sms_opt_outs")
    .select("id")
    .eq("org_id", orgId)
    .eq("phone", phone)
    .maybeSingle();
  return !!data?.id;
}

async function countRecentSends(admin: any, orgId: string | null | undefined, phone: string): Promise<number> {
  if (!orgId) return 0;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("sms_messages")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("to_number", phone)
    .in("status", ["sent", "queued", "delivered", "accepted"])
    .gte("sent_at", since);
  return count ?? 0;
}

async function hasConsent(admin: any, meta: SmsMeta): Promise<boolean> {
  // Debtor SMS requires opt-in
  if (meta.debt_payer_id) {
    const { data } = await admin
      .from("debt_case_payers")
      .select("sms_consent_at, opted_out_at")
      .eq("id", meta.debt_payer_id)
      .maybeSingle();
    if (!data) return false;
    if (data.opted_out_at) return false;
    return !!data.sms_consent_at;
  }
  if (meta.client_id) {
    const { data } = await admin
      .from("clients")
      .select("sms_consent_at")
      .eq("id", meta.client_id)
      .maybeSingle();
    return !!data?.sms_consent_at;
  }
  // No linked recipient => assume the operator has consent (e.g. manual send to a phone typed in).
  return true;
}

export async function sendSms(
  to: string,
  body: string,
  meta: SmsMeta = {},
  fromOverride?: string,
): Promise<SmsResult> {
  const key = process.env.LOVABLE_API_KEY;
  const twKey = process.env.TWILIO_API_KEY;
  const toNum = toE164(to);
  const ctx: SmsContext = meta.context ?? "manual";
  const isCommercial = !meta.force_transactional && COMMERCIAL_CONTEXTS.includes(ctx);
  const language = meta.language ?? (detectEncoding(body) === "UCS-2" ? "ar" : "en");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const orgCfg = await loadOrgConfig(supabaseAdmin as any, meta.org_id ?? null);

  const fullBody = (orgCfg?.sms_bilingual_footer ?? true) && isCommercial
    ? (body.endsWith(OPT_OUT_FOOTER) ? body : body + OPT_OUT_FOOTER)
    : body;
  const encoding = detectEncoding(fullBody);
  const segments = segmentCount(fullBody, encoding);

  const senderId = fromOverride ?? orgCfg?.sms_sender_id ?? SMS_LONG_CODE;

  const baseRow = {
    owner_id: meta.owner_id ?? null,
    org_id: meta.org_id ?? null,
    client_id: meta.client_id ?? null,
    case_id: meta.case_id ?? null,
    debt_case_id: meta.debt_case_id ?? null,
    context: ctx,
    to_number: toNum,
    from_number: senderId,
    sender_id: senderId,
    body: fullBody,
    language,
    encoding,
    segment_count: segments,
    template_id: meta.template_id ?? null,
  };

  // ---- Compliance checks (Jordan TRC) ----
  if (!toNum) {
    const id = await logSms({ ...baseRow, status: "failed", blocked_reason: "invalid_number", error_message: "Missing/invalid recipient" });
    return { status: "skipped", error: "Missing/invalid recipient", logged_id: id };
  }

  // 1) Opt-outs (all contexts, always)
  if (await isOptedOut(supabaseAdmin as any, meta.org_id, toNum)) {
    const id = await logSms({ ...baseRow, status: "blocked", blocked_reason: "opted_out" });
    return { status: "blocked", blocked_reason: "opted_out", logged_id: id };
  }

  if (isCommercial) {
    // 2) Quiet hours (Asia/Amman)
    const start = orgCfg?.sms_quiet_hours_start ?? "21:00";
    const end = orgCfg?.sms_quiet_hours_end ?? "09:00";
    const tz = orgCfg?.sms_timezone ?? "Asia/Amman";
    if (isInQuietHours(new Date(), start.slice(0, 5), end.slice(0, 5), tz)) {
      const id = await logSms({ ...baseRow, status: "blocked", blocked_reason: "quiet_hours" });
      return { status: "blocked", blocked_reason: "quiet_hours", logged_id: id };
    }

    // 3) Daily cap
    const cap = orgCfg?.sms_daily_cap_per_recipient ?? 1;
    const recent = await countRecentSends(supabaseAdmin as any, meta.org_id, toNum);
    if (cap > 0 && recent >= cap) {
      const id = await logSms({ ...baseRow, status: "blocked", blocked_reason: "daily_cap" });
      return { status: "blocked", blocked_reason: "daily_cap", logged_id: id };
    }

    // 4) Consent (debtor SMS only)
    if (ctx === "debt_reminder" || ctx === "installment_reminder") {
      const ok = await hasConsent(supabaseAdmin as any, meta);
      if (!ok) {
        const id = await logSms({ ...baseRow, status: "blocked", blocked_reason: "no_consent" });
        return { status: "blocked", blocked_reason: "no_consent", logged_id: id };
      }
    }
  }

  if (!key || !twKey) {
    const id = await logSms({ ...baseRow, status: "failed", blocked_reason: "provider_unconfigured", error_message: "Twilio not configured" });
    return { status: "skipped", error: "Twilio not configured", logged_id: id };
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
        From: senderId,
        Body: fullBody,
        StatusCallback: STATUS_CALLBACK_URL,
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const id = await logSms({
        ...baseRow, status: "failed",
        error_code: json?.code ? String(json.code) : null,
        error_message: JSON.stringify(json).slice(0, 500),
      });
      return { status: "failed", error: JSON.stringify(json).slice(0, 500), logged_id: id };
    }
    const id = await logSms({ ...baseRow, status: json?.status ?? "queued", twilio_sid: json?.sid ?? null });
    return { status: "sent", sid: json?.sid, logged_id: id };
  } catch (e: any) {
    const id = await logSms({ ...baseRow, status: "failed", error_message: String(e?.message || e) });
    return { status: "failed", error: String(e?.message || e), logged_id: id };
  }
}

/** Fire-and-forget: never throws; logs failures. */
export function fireSms(to: string | null | undefined, body: string, meta: SmsMeta = {}) {
  if (!to) return;
  sendSms(to, body, meta).then((r) => {
    if (r.status === "failed" || r.status === "blocked") {
      console.warn(`[sms] not sent: ${r.status} — ${r.blocked_reason ?? r.error ?? ""}`);
    }
  });
}

/** Process an inbound SMS body to detect opt-in / opt-out keywords. Call from Twilio inbound webhook. */
export function detectOptOutKeyword(body: string): "STOP" | "START" | null {
  const t = String(body || "").trim().toUpperCase();
  const stopWords = ["STOP", "UNSUB", "UNSUBSCRIBE", "إيقاف", "الغاء", "إلغاء", "توقف"];
  const startWords = ["START", "UNSTOP", "SUBSCRIBE", "اشتراك", "ابدأ"];
  if (stopWords.some((w) => t === w.toUpperCase() || t.startsWith(w.toUpperCase() + " "))) return "STOP";
  if (startWords.some((w) => t === w.toUpperCase() || t.startsWith(w.toUpperCase() + " "))) return "START";
  return null;
}
