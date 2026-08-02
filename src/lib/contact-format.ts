import { z } from "zod";

/**
 * Jordan-first phone helpers. Accepts local formats (07XXXXXXXX / 06XXXXXXX) and
 * normalises them to strict E.164 so downstream SMS delivery always works.
 */

export const COUNTRY_DIALS: { code: string; dial: string; labelEn: string; labelAr: string }[] = [
  { code: "JO", dial: "+962", labelEn: "Jordan", labelAr: "الأردن" },
  { code: "SA", dial: "+966", labelEn: "Saudi Arabia", labelAr: "السعودية" },
  { code: "AE", dial: "+971", labelEn: "UAE", labelAr: "الإمارات" },
  { code: "QA", dial: "+974", labelEn: "Qatar", labelAr: "قطر" },
  { code: "KW", dial: "+965", labelEn: "Kuwait", labelAr: "الكويت" },
  { code: "BH", dial: "+973", labelEn: "Bahrain", labelAr: "البحرين" },
  { code: "OM", dial: "+968", labelEn: "Oman", labelAr: "عُمان" },
  { code: "EG", dial: "+20", labelEn: "Egypt", labelAr: "مصر" },
  { code: "IQ", dial: "+964", labelEn: "Iraq", labelAr: "العراق" },
  { code: "LB", dial: "+961", labelEn: "Lebanon", labelAr: "لبنان" },
  { code: "PS", dial: "+970", labelEn: "Palestine", labelAr: "فلسطين" },
  { code: "SY", dial: "+963", labelEn: "Syria", labelAr: "سوريا" },
  { code: "GB", dial: "+44", labelEn: "United Kingdom", labelAr: "المملكة المتحدة" },
  { code: "US", dial: "+1", labelEn: "United States", labelAr: "الولايات المتحدة" },
];

const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

/** Converts Arabic-Indic digits to ASCII and strips separators. */
export function normalizeDigits(input: string): string {
  return input
    .replace(ARABIC_DIGITS, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d) >= 0 ? "٠١٢٣٤٥٦٧٨٩".indexOf(d) : "۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\s\-().]/g, "");
}

/**
 * Returns a strict E.164 string (+CC…) or null when the value can't be understood.
 * `dial` is the currently selected country dial code, e.g. "+962".
 */
export function toE164(raw: string, dial = "+962"): string | null {
  if (!raw) return null;
  let v = normalizeDigits(raw.trim());
  if (v.startsWith("00")) v = "+" + v.slice(2);
  if (!v.startsWith("+")) {
    // Local national format: drop the trunk "0" and prefix the country dial code.
    v = dial + v.replace(/^0+/, "");
  }
  if (!/^\+[1-9]\d{6,14}$/.test(v)) return null;
  return v;
}

/** Human-friendly validation used by forms. Returns null when valid. */
export function validatePhone(raw: string, dial: string, locale: "ar" | "en", required = false): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return required ? (locale === "ar" ? "رقم الهاتف مطلوب" : "Phone number is required") : null;
  if (/[^\d+\s\-().\u0660-\u0669\u06F0-\u06F9]/.test(trimmed)) {
    return locale === "ar" ? "يجب أن يحتوي رقم الهاتف على أرقام فقط" : "Phone number can only contain digits";
  }
  const e164 = toE164(trimmed, dial);
  if (!e164) {
    return locale === "ar"
      ? "رقم غير صالح — أدخل رقماً كاملاً مثل 0791234567"
      : "Invalid number — enter a full number, e.g. 0791234567";
  }
  if (dial === "+962") {
    // Jordan: mobile 7XXXXXXXX (9 digits) or landline 6XXXXXXX / 2XXXXXXX (8 digits)
    const national = e164.replace("+962", "");
    if (!/^(7\d{8}|[2-6]\d{7})$/.test(national)) {
      return locale === "ar"
        ? "رقم أردني غير صالح — الموبايل يبدأ بـ 07 ويتكون من ١٠ أرقام"
        : "Invalid Jordanian number — mobiles start with 07 and are 10 digits";
    }
  }
  return null;
}

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || toE164(v) !== null, { message: "Invalid phone number" });

/** Splits a stored E.164 value back into { dial, national } for editing. */
export function splitE164(value: string | null | undefined): { dial: string; national: string } {
  const v = (value ?? "").trim();
  if (!v.startsWith("+")) return { dial: "+962", national: normalizeDigits(v) };
  const match = COUNTRY_DIALS
    .slice()
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => v.startsWith(c.dial));
  if (!match) return { dial: "+962", national: normalizeDigits(v.replace("+", "")) };
  return { dial: match.dial, national: v.slice(match.dial.length) };
}

/* ---------------------------------------------------------------- address */

export type StructuredAddress = {
  country: string;
  governorate: string;
  city: string;
  district: string;
  street: string;
  building: string;
  postal_code: string;
};

export const JORDAN_GOVERNORATES: { value: string; en: string; ar: string }[] = [
  { value: "amman", en: "Amman", ar: "عمّان" },
  { value: "irbid", en: "Irbid", ar: "إربد" },
  { value: "zarqa", en: "Zarqa", ar: "الزرقاء" },
  { value: "balqa", en: "Balqa", ar: "البلقاء" },
  { value: "mafraq", en: "Mafraq", ar: "المفرق" },
  { value: "karak", en: "Karak", ar: "الكرك" },
  { value: "jerash", en: "Jerash", ar: "جرش" },
  { value: "madaba", en: "Madaba", ar: "مادبا" },
  { value: "ajloun", en: "Ajloun", ar: "عجلون" },
  { value: "aqaba", en: "Aqaba", ar: "العقبة" },
  { value: "maan", en: "Ma'an", ar: "معان" },
  { value: "tafilah", en: "Tafilah", ar: "الطفيلة" },
];

export const EMPTY_ADDRESS: StructuredAddress = {
  country: "JO", governorate: "", city: "", district: "", street: "", building: "", postal_code: "",
};

/** Serialises structured parts into the single stored address string. */
export function formatAddress(a: StructuredAddress, locale: "ar" | "en" = "en"): string {
  const gov = JORDAN_GOVERNORATES.find((g) => g.value === a.governorate);
  const govLabel = gov ? (locale === "ar" ? gov.ar : gov.en) : a.governorate;
  return [
    [a.building, a.street].filter(Boolean).join(" "),
    a.district,
    a.city,
    govLabel,
    a.postal_code,
    a.country,
  ].map((p) => (p ?? "").trim()).filter(Boolean).join(", ");
}

/** Best-effort parse of a legacy free-text address back into parts. */
export function parseAddress(value: string | null | undefined): StructuredAddress {
  const v = (value ?? "").trim();
  if (!v) return { ...EMPTY_ADDRESS };
  const parts = v.split(",").map((p) => p.trim());
  const gov = JORDAN_GOVERNORATES.find((g) => parts.some((p) => p === g.en || p === g.ar));
  return {
    ...EMPTY_ADDRESS,
    street: parts[0] ?? "",
    district: parts[1] ?? "",
    city: parts[2] ?? "",
    governorate: gov?.value ?? "",
    postal_code: parts.find((p) => /^\d{5}$/.test(p)) ?? "",
    country: parts[parts.length - 1]?.length === 2 ? parts[parts.length - 1] : "JO",
  };
}

/** Validation for the structured address block. Returns null when valid. */
export function validateAddress(a: StructuredAddress, locale: "ar" | "en"): string | null {
  const touched = Object.values(a).some((v) => (v ?? "").trim() !== "" && v !== "JO");
  if (!touched) return null;
  if (!a.city.trim() && !a.governorate) {
    return locale === "ar" ? "أدخل المحافظة أو المدينة على الأقل" : "Enter at least a governorate or city";
  }
  if (a.postal_code && !/^\d{4,10}$/.test(a.postal_code.trim())) {
    return locale === "ar" ? "الرمز البريدي يجب أن يكون أرقاماً" : "Postal code must be numeric";
  }
  return null;
}
