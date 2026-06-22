// Client-side export of a draft to PDF or DOCX, with a branded header (org logo + details).
import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  PageOrientation,
} from "docx";
import { resolveLogoUrl } from "./logo";
import type { Database } from "@/integrations/supabase/types";

type Org = Database["public"]["Tables"]["organizations"]["Row"];

async function fetchLogoBytes(path: string | null): Promise<{ data: ArrayBuffer; ext: "png" | "jpg" } | null> {
  const url = await resolveLogoUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const ct = res.headers.get("content-type") || "";
    const ext: "png" | "jpg" = ct.includes("png") ? "png" : "jpg";
    return { data: buf, ext };
  } catch {
    return null;
  }
}

function htmlToPlainParagraphs(html: string): string[] {
  // Quick & safe HTML → paragraph[] (TipTap output)
  if (!html) return [];
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const blocks: string[] = [];
  tmp.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
  const walk = (node: Element) => {
    const block = ["P", "H1", "H2", "H3", "H4", "LI", "BLOCKQUOTE", "PRE"].includes(node.tagName);
    if (block) {
      const text = (node.textContent || "").trim();
      if (text) blocks.push(text);
      return;
    }
    node.childNodes.forEach((n) => { if (n.nodeType === 1) walk(n as Element); });
  };
  tmp.childNodes.forEach((n) => {
    if (n.nodeType === 1) walk(n as Element);
    else if (n.nodeType === 3) {
      const t = (n.textContent || "").trim();
      if (t) blocks.push(t);
    }
  });
  return blocks.length ? blocks : [(tmp.textContent || "").trim()].filter(Boolean);
}

export async function exportDraftPdf(opts: { org: Org | null; title: string; html: string }) {
  const { org, title, html } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  if (org) {
    const logo = await fetchLogoBytes(org.logo_path);
    if (logo) {
      try {
        const blob = new Blob([logo.data], { type: logo.ext === "png" ? "image/png" : "image/jpeg" });
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
        doc.addImage(dataUrl, logo.ext.toUpperCase(), margin, y, 60, 60);
      } catch { /* ignore image errors */ }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(org.display_name || org.legal_name, margin + 72, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = [
      org.address || "",
      [org.phone, org.email].filter(Boolean).join(" · "),
      org.tax_id ? `Tax ID: ${org.tax_id}` : "",
    ].filter(Boolean);
    lines.forEach((ln, i) => doc.text(ln, margin + 72, y + 34 + i * 11));
    y += 80;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const blocks = htmlToPlainParagraphs(html);
  const maxWidth = pageWidth - margin * 2;
  for (const para of blocks) {
    const wrapped = doc.splitTextToSize(para, maxWidth);
    for (const ln of wrapped) {
      if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
      doc.text(ln, margin, y);
      y += 14;
    }
    y += 6;
  }

  doc.save(`${title || "draft"}.pdf`);
}

export async function exportDraftDocx(opts: { org: Org | null; title: string; html: string }) {
  const { org, title, html } = opts;
  const headerChildren: Paragraph[] = [];

  if (org) {
    const logo = await fetchLogoBytes(org.logo_path);
    if (logo) {
      headerChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              type: logo.ext === "png" ? "png" : "jpg",
              data: new Uint8Array(logo.data),
              transformation: { width: 80, height: 80 },
            } as any),
          ],
        }),
      );
    }
    headerChildren.push(
      new Paragraph({ children: [new TextRun({ text: org.display_name || org.legal_name, bold: true, size: 28 })] }),
    );
    const meta = [
      org.address || "",
      [org.phone, org.email].filter(Boolean).join(" · "),
      org.tax_id ? `Tax ID: ${org.tax_id}` : "",
    ].filter(Boolean);
    meta.forEach((m) => headerChildren.push(new Paragraph({ children: [new TextRun({ text: m, size: 18, color: "666666" })] })));
    headerChildren.push(new Paragraph({ children: [new TextRun({ text: "", size: 14 })] }));
  }

  const body: Paragraph[] = [
    ...headerChildren,
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.LEFT, children: [new TextRun({ text: title, bold: true })] }),
    ...htmlToPlainParagraphs(html).map((p) => new Paragraph({ children: [new TextRun({ text: p })] })),
  ];

  const wordDoc = new Document({
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT } } },
        children: body,
      },
    ],
  });
  const blob = await Packer.toBlob(wordDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${title || "draft"}.docx`; a.click();
  URL.revokeObjectURL(url);
}
