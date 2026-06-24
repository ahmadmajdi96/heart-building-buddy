/** Bilingual + numeral helpers for documents and invoices. */
export function toArabicDigits(s: string | number): string {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(s).replace(/\d/g, (d) => map[+d]);
}
export function toEnglishDigits(s: string): string {
  return s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}
/** Hijri date string via Intl with Umm al-Qura calendar (browser-supported). */
export function hijriDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric", month: "long", year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString("ar");
  }
}
/** Format a number with Arabic-Indic digits when locale is ar. */
export function fmtNumber(n: number | string, locale: "ar" | "en", opts: Intl.NumberFormatOptions = {}) {
  const s = new Intl.NumberFormat(locale === "ar" ? "ar" : "en", opts).format(Number(n));
  return s;
}
