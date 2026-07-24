// Client-side text extraction for PDF and DOCX files.
// Falls back to file.text() for text-like formats. Returns empty string when extraction isn't possible.

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type || "";

  try {
    if (type === "application/pdf" || name.endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist");
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const parts: string[] = [];
      const maxPages = Math.min(doc.numPages, 40);
      for (let p = 1; p <= maxPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const txt = (content.items as Array<{ str?: string }>).map((i) => i.str ?? "").join(" ");
        parts.push(txt);
      }
      return parts.join("\n\n").slice(0, 80_000);
    }

    if (
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      const mammoth = await import("mammoth/mammoth.browser");
      const buf = await file.arrayBuffer();
      const res = await (mammoth as any).extractRawText({ arrayBuffer: buf });
      return String(res.value || "").slice(0, 80_000);
    }

    if (type.startsWith("text/") || /\.(txt|md|csv)$/i.test(name)) {
      return (await file.text()).slice(0, 80_000);
    }
  } catch (err) {
    console.warn("extractTextFromFile failed", err);
  }
  return "";
}

// Documents module rules
export const ALLOWED_DOC_EXT = ["pdf", "doc", "docx", "csv", "jpg", "jpeg"] as const;
export const MAX_DOC_BYTES = 200 * 1024 * 1024; // 200 MB

export function validateDocFile(file: File): { ok: true } | { ok: false; reason: string } {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_DOC_EXT.includes(ext as (typeof ALLOWED_DOC_EXT)[number])) {
    return { ok: false, reason: `Unsupported file type ".${ext}". Allowed: PDF, DOC, DOCX, CSV, JPG.` };
  }
  if (file.size > MAX_DOC_BYTES) {
    return { ok: false, reason: `File is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max 200 MB.` };
  }
  return { ok: true };
}
