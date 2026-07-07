// Small helper for client-side CSV export.
// Uses UTF-16 LE + tab separator so Microsoft Excel opens Arabic (and other
// non-Latin scripts) correctly on both Windows and macOS without extra steps.
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    // Tab-separated: escape quotes/tabs/newlines by wrapping in quotes.
    return /["\t\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const out = [headers.map(esc).join("\t")];
  for (const r of rows) out.push(r.map(esc).join("\t"));
  return out.join("\r\n");
}

function toUtf16LeWithBom(text: string): ArrayBuffer {
  const buffer = new ArrayBuffer(2 + text.length * 2);
  const view = new DataView(buffer);
  // UTF-16 LE BOM
  view.setUint8(0, 0xff);
  view.setUint8(1, 0xfe);
  for (let i = 0; i < text.length; i++) {
    view.setUint16(2 + i * 2, text.charCodeAt(i), true);
  }
  return buffer;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([toUtf16LeWithBom(csv)], { type: "text/csv;charset=utf-16le" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function inRange(iso: string | null | undefined, from: string, to: string): boolean {
  if (!iso) return !from && !to;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (from) {
    const f = new Date(from).getTime();
    if (t < f) return false;
  }
  if (to) {
    const toDate = new Date(to);
    if (to.length <= 10) toDate.setHours(23, 59, 59, 999);
    if (t > toDate.getTime()) return false;
  }
  return true;
}
