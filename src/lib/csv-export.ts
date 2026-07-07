// Small helper for client-side CSV export.
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const out = [headers.map(esc).join(",")];
  for (const r of rows) out.push(r.map(esc).join(","));
  return out.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
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
    // If "to" has no time portion, include the whole day.
    const toDate = new Date(to);
    if (to.length <= 10) toDate.setHours(23, 59, 59, 999);
    if (t > toDate.getTime()) return false;
  }
  return true;
}
