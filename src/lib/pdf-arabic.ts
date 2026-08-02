// Shared helper for rendering legible Arabic text inside jsPDF documents.
//
// jsPDF's built-in fonts (Helvetica etc.) have no Arabic glyphs, and jsPDF does not
// perform Arabic contextual shaping or bidi reordering on its own. To fix garbled
// Arabic output we:
//  1. Embed a Unicode Arabic-capable TTF (Amiri) via addFileToVFS/addFont, loaded
//     once at runtime and cached across PDF documents.
//  2. Reshape Arabic runs into their correct joined presentation forms
//     (arabic-reshaper) and reorder them for correct right-to-left visual display,
//     since jsPDF always lays out glyphs left-to-right.
//  3. Leave non-Arabic (Latin/digits) content untouched so English output and
//     numbers are not regressed.
import type jsPDF from "jspdf";
// @ts-expect-error - no type declarations shipped with this package
import ArabicReshaperLib from "arabic-reshaper";
import amiriRegularUrl from "@/assets/fonts/Amiri-Regular.ttf?url";
import amiriBoldUrl from "@/assets/fonts/Amiri-Bold.ttf?url";

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function containsArabic(s: string | null | undefined): boolean {
  return !!s && ARABIC_RE.test(s);
}

async function toBase64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

let fontDataPromise: Promise<{ regular: string; bold: string }> | null = null;

/** Fetches + base64-encodes the Amiri font files once, caching the result for reuse. */
function loadFontData(): Promise<{ regular: string; bold: string }> {
  if (!fontDataPromise) {
    fontDataPromise = (async () => {
      const [regRes, boldRes] = await Promise.all([fetch(amiriRegularUrl), fetch(amiriBoldUrl)]);
      if (!regRes.ok || !boldRes.ok) throw new Error("Failed to load Arabic PDF font");
      const [regBuf, boldBuf] = await Promise.all([regRes.arrayBuffer(), boldRes.arrayBuffer()]);
      const [regular, bold] = await Promise.all([toBase64(regBuf), toBase64(boldBuf)]);
      return { regular, bold };
    })().catch((err) => {
      fontDataPromise = null; // allow retry on next call
      throw err;
    });
  }
  return fontDataPromise;
}

const registeredDocs = new WeakSet<jsPDF>();

/** Registers the Amiri font family on this jsPDF document instance (idempotent, cached bytes). */
export async function ensureArabicFont(pdf: jsPDF): Promise<void> {
  if (registeredDocs.has(pdf)) return;
  const { regular, bold } = await loadFontData();
  pdf.addFileToVFS("Amiri-Regular.ttf", regular);
  pdf.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  pdf.addFileToVFS("Amiri-Bold.ttf", bold);
  pdf.addFont("Amiri-Bold.ttf", "Amiri", "bold");
  registeredDocs.add(pdf);
}

/**
 * Reshapes+reorders a single logical line of text for correct Arabic glyph joining
 * and right-to-left visual order under jsPDF's left-to-right glyph placement.
 * Latin/digit runs are left untouched (and keep their natural order) so mixed
 * Arabic/English/number lines still read correctly.
 */
export function shapeArabicLine(line: string): string {
  if (!line) return line;
  const tokens = line.split(/(\s+)/);
  const shapedTokens = tokens.map((tok) => {
    if (!tok || /^\s+$/.test(tok)) return tok;
    if (!ARABIC_RE.test(tok)) return tok;
    const reshaped: string = ArabicReshaperLib.convertArabic(tok);
    return reshaped.split("").reverse().join("");
  });
  return shapedTokens.reverse().join("");
}

type TextOpts = {
  align?: "left" | "right" | "center";
  bold?: boolean;
  maxWidth?: number;
  lineHeight?: number;
};

/**
 * Draws a (possibly multi-line, possibly Arabic) string at (x, y).
 * - For Arabic text: switches to the embedded Amiri font, right-aligns at `x`
 *   (or the caller-provided alignment), and shapes each wrapped line.
 * - For non-Arabic text: behaves like a normal pdf.text call with Helvetica.
 * Returns the number of lines rendered.
 */
export function drawBilingualText(pdf: jsPDF, text: string | null | undefined, x: number, y: number, opts: TextOpts = {}): number {
  const s = String(text ?? "");
  if (!s) return 0;
  const arabic = containsArabic(s);
  const fontSize = pdf.getFontSize();
  const lineHeight = opts.lineHeight ?? fontSize * 1.15;

  if (arabic) {
    pdf.setFont("Amiri", opts.bold ? "bold" : "normal");
  }
  const lines = opts.maxWidth ? (pdf.splitTextToSize(s, opts.maxWidth) as string[]) : [s];
  const align = arabic ? (opts.align ?? "right") : (opts.align ?? "left");
  lines.forEach((line, i) => {
    const out = arabic ? shapeArabicLine(line) : line;
    pdf.text(out, x, y + i * lineHeight, { align });
  });
  if (arabic) {
    pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
  }
  return lines.length;
}
