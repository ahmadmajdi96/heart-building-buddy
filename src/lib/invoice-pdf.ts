import jsPDF from "jspdf";
import { resolveLogoUrl } from "./logo";

type Org = { legal_name?: string; display_name?: string | null; email?: string | null; phone?: string | null; address?: string | null; tax_id?: string | null; logo_path?: string | null };

type Doc = {
  number?: string;
  client_name?: string;
  issue_date?: string;
  due_date?: string | null;
  valid_until?: string | null;
  currency?: string;
  tax_rate?: number;
  subtotal?: number;
  tax_amount?: number;
  total?: number;
  notes?: string | null;
  items?: { description?: string; quantity?: number; unit_price?: number }[];
};

function money(n: number | undefined) {
  return Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchLogoDataUrl(path: string | null | undefined): Promise<{ dataUrl: string; ext: "PNG" | "JPEG" } | null> {
  const url = await resolveLogoUrl(path ?? null);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const ct = (res.headers.get("content-type") || blob.type || "").toLowerCase();
    const ext: "PNG" | "JPEG" = ct.includes("png") ? "PNG" : "JPEG";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return { dataUrl, ext };
  } catch { return null; }
}

function drawHeaderLogo(pdf: jsPDF, logo: { dataUrl: string; ext: "PNG" | "JPEG" } | null, x: number, y: number, size = 48) {
  if (!logo) return 0;
  try { pdf.addImage(logo.dataUrl, logo.ext, x, y - 8, size, size); return size + 10; } catch { return 0; }
}


export async function downloadInvoicePdf(kind: "quote" | "invoice", doc: Doc, org?: Org | null) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  // Header (logo + name/details)
  const logo = org ? await fetchLogoDataUrl(org.logo_path) : null;
  const textX = M + drawHeaderLogo(pdf, logo, M, y);
  pdf.setFont("helvetica", "bold").setFontSize(16);
  pdf.text(org?.display_name || org?.legal_name || "", textX, y + 4);
  pdf.setFont("helvetica", "normal").setFontSize(9);
  const rightLines = [org?.email, org?.phone, org?.address, org?.tax_id ? `VAT/TAX: ${org.tax_id}` : null].filter(Boolean) as string[];
  let ry = y;
  rightLines.forEach((line) => { pdf.text(String(line), W - M, ry, { align: "right" }); ry += 12; });
  y = Math.max(y + (logo ? 52 : 20), ry + 4);


  pdf.setDrawColor(200); pdf.line(M, y, W - M, y); y += 20;

  // Doc heading
  pdf.setFont("helvetica", "bold").setFontSize(20);
  pdf.text(kind === "quote" ? "QUOTE" : "BILLING RECORD", M, y);
  pdf.setFont("helvetica", "normal").setFontSize(11);
  pdf.text(String(doc.number ?? ""), M, y + 18);

  pdf.setFontSize(10);
  pdf.text(`Issued: ${withHijri(doc.issue_date)}`, W - M, y, { align: "right" });
  const dueLabel = kind === "quote"
    ? (doc.valid_until ? `Valid until: ${withHijri(doc.valid_until)}` : "")
    : (doc.due_date ? `Due: ${withHijri(doc.due_date)}` : "");
  if (dueLabel) pdf.text(dueLabel, W - M, y + 14, { align: "right" });

  y += 46;

  pdf.setFont("helvetica", "bold").setFontSize(9).setTextColor(120);
  pdf.text("BILL TO", M, y);
  pdf.setFont("helvetica", "normal").setFontSize(11).setTextColor(0);
  pdf.text(String(doc.client_name ?? ""), M, y + 14);
  y += 36;

  // Table header
  const cols = { desc: M, qty: W - M - 240, price: W - M - 120, total: W - M };
  pdf.setDrawColor(220); pdf.line(M, y, W - M, y); y += 14;
  pdf.setFont("helvetica", "bold").setFontSize(10);
  pdf.text("Description", cols.desc, y);
  pdf.text("Qty", cols.qty, y, { align: "right" });
  pdf.text("Price", cols.price, y, { align: "right" });
  pdf.text("Total", cols.total, y, { align: "right" });
  y += 8; pdf.line(M, y, W - M, y); y += 14;

  pdf.setFont("helvetica", "normal");
  for (const it of (doc.items ?? [])) {
    if (y > 740) { pdf.addPage(); y = M; }
    const desc = String(it.description ?? "");
    const wrapped = pdf.splitTextToSize(desc, cols.qty - M - 20);
    pdf.text(wrapped, cols.desc, y);
    pdf.text(String(it.quantity ?? 0), cols.qty, y, { align: "right" });
    pdf.text(money(it.unit_price), cols.price, y, { align: "right" });
    pdf.text(money(Number(it.quantity ?? 0) * Number(it.unit_price ?? 0)), cols.total, y, { align: "right" });
    y += 14 * Math.max(1, wrapped.length);
  }

  y += 8; pdf.line(M, y, W - M, y); y += 18;
  const labelX = W - M - 200; const valX = W - M;
  const cur = doc.currency ?? "";
  pdf.text("Subtotal", labelX, y); pdf.text(`${money(doc.subtotal)} ${cur}`, valX, y, { align: "right" }); y += 14;
  pdf.text(`Tax (${doc.tax_rate ?? 0}%)`, labelX, y); pdf.text(`${money(doc.tax_amount)} ${cur}`, valX, y, { align: "right" }); y += 14;
  pdf.setFont("helvetica", "bold").setFontSize(12);
  pdf.text("Total", labelX, y); pdf.text(`${money(doc.total)} ${cur}`, valX, y, { align: "right" });
  y += 24;

  if (doc.notes) {
    pdf.setFont("helvetica", "bold").setFontSize(9).setTextColor(120);
    pdf.text("NOTES", M, y);
    pdf.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
    const wrapped = pdf.splitTextToSize(doc.notes, W - 2 * M);
    pdf.text(wrapped, M, y + 14);
  }

  const filename = `${kind}-${(doc.number || "document").replace(/[^\w-]+/g, "_")}.pdf`;
  pdf.save(filename);
}

type Receipt = {
  receipt_no: string;
  paid_at: string;
  amount: number;
  currency: string;
  method?: string | null;
  reference?: string | null;
  client_name?: string | null;
  invoice_number?: string | null;
  installment_label?: string | null;
  plan_id?: string | null;
  notes?: string | null;
};

export async function downloadReceiptPdf(receipt: Receipt, org?: Org | null) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  const logo = org ? await fetchLogoDataUrl(org.logo_path) : null;
  const textX = M + drawHeaderLogo(pdf, logo, M, y);
  pdf.setFont("helvetica", "bold").setFontSize(16);
  pdf.text(org?.display_name || org?.legal_name || "", textX, y + 4);
  pdf.setFont("helvetica", "normal").setFontSize(9);
  const rightLines = [org?.email, org?.phone, org?.address, org?.tax_id ? `VAT/TAX: ${org.tax_id}` : null].filter(Boolean) as string[];
  let ry = y;
  rightLines.forEach((line) => { pdf.text(String(line), W - M, ry, { align: "right" }); ry += 12; });
  y = Math.max(y + (logo ? 52 : 20), ry + 4);


  pdf.setDrawColor(200); pdf.line(M, y, W - M, y); y += 24;

  pdf.setFont("helvetica", "bold").setFontSize(20);
  pdf.text("PAYMENT RECEIPT", M, y);
  pdf.setFont("helvetica", "normal").setFontSize(11);
  pdf.text(receipt.receipt_no, M, y + 18);
  pdf.setFontSize(10);
  pdf.text(`Date: ${receipt.paid_at}`, W - M, y, { align: "right" });
  y += 50;

  pdf.setFont("helvetica", "bold").setFontSize(9).setTextColor(120);
  pdf.text("RECEIVED FROM", M, y);
  pdf.setFont("helvetica", "normal").setFontSize(11).setTextColor(0);
  pdf.text(String(receipt.client_name ?? "—"), M, y + 14);
  y += 40;

  const rows: [string, string][] = [
    ["Amount", `${money(receipt.amount)} ${receipt.currency}`],
    ["Method", (receipt.method ?? "—").replace(/_/g, " ")],
    ["Reference", receipt.reference ?? "—"],
    ["Applied to invoice", receipt.invoice_number ?? "—"],
    ["Installment", receipt.installment_label ?? "—"],
    ["Plan ID", receipt.plan_id ? receipt.plan_id.slice(0, 8) : "—"],
  ];
  pdf.setFontSize(10);
  for (const [k, v] of rows) {
    pdf.setTextColor(120); pdf.text(k, M, y);
    pdf.setTextColor(0); pdf.text(String(v), M + 160, y);
    y += 18;
  }
  y += 12;
  pdf.setDrawColor(220); pdf.line(M, y, W - M, y); y += 22;

  pdf.setFont("helvetica", "bold").setFontSize(14);
  pdf.text("TOTAL RECEIVED", M, y);
  pdf.text(`${money(receipt.amount)} ${receipt.currency}`, W - M, y, { align: "right" });
  y += 32;

  if (receipt.notes) {
    pdf.setFont("helvetica", "bold").setFontSize(9).setTextColor(120);
    pdf.text("NOTES", M, y);
    pdf.setFont("helvetica", "normal").setFontSize(10).setTextColor(0);
    const wrapped = pdf.splitTextToSize(receipt.notes, W - 2 * M);
    pdf.text(wrapped, M, y + 14);
  }

  const filename = `receipt-${receipt.receipt_no.replace(/[^\w-]+/g, "_")}.pdf`;
  pdf.save(filename);
}
