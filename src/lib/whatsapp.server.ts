// Deprecated file name — SMS logic now lives in `./sms.server`.
// Kept as a re-export so existing imports (`import { sendSms } from "./whatsapp.server"`)
// continue to work without a mass renamed edit. New code should import from "./sms.server".

export {
  sendSms,
  fireSms,
  toE164,
  detectEncoding,
  segmentCount,
  isInQuietHours,
  detectOptOutKeyword,
  SMS_LONG_CODE,
  type SmsContext,
  type SmsMeta,
  type SmsResult,
} from "./sms.server";

import { SMS_LONG_CODE, sendSms, fireSms } from "./sms.server";
/** Legacy alias — will be removed. */
export const SMS_FROM_NUMBER = SMS_LONG_CODE;
export const WHATSAPP_FROM_NUMBER = SMS_LONG_CODE;
export const sendWhatsApp = sendSms;
export const fireWhatsApp = fireSms;
