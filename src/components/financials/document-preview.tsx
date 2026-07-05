import { useOrg } from "@/lib/org-context";
import { useI18n } from "@/lib/i18n";
import { useLogoUrl } from "@/lib/logo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Languages, Download } from "lucide-react";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { useState } from "react";
import { hijriDate, fmtNumber } from "@/lib/bilingual";

export function DocumentHeader() {
  const { org } = useOrg();
  const logo = useLogoUrl(org?.logo_path);
  if (!org) return null;
  return (
    <div className="flex items-start justify-between gap-6 border-b pb-6">
      <div className="flex items-center gap-4">
        {logo ? (
          <img src={logo} alt={org.legal_name} className="h-16 w-auto object-contain"/>
        ) : (
          <div className="grid size-16 place-items-center rounded-lg bg-gold/15 font-serif text-2xl text-gold">{org.legal_name.charAt(0)}</div>
        )}
        <div>
          <div className="font-serif text-xl">{org.display_name || org.legal_name}</div>
          {org.display_name && <div className="text-xs text-muted-foreground">{org.legal_name}</div>}
        </div>
      </div>
      <div className="text-end text-xs text-muted-foreground space-y-0.5">
        {org.email && <div>{org.email}</div>}
        {org.phone && <div dir="ltr">{org.phone}</div>}
        {org.address && <div className="max-w-xs whitespace-pre-wrap">{org.address}</div>}
        {org.tax_id && <div>VAT/TAX: {org.tax_id}</div>}
      </div>
    </div>
  );
}

type Mode = "current" | "bilingual";

export function DocumentPreview({ kind, doc, onClose }: { kind: "quote" | "invoice"; doc: any; onClose: () => void }) {
  const { locale } = useI18n();
  const { org } = useOrg();
  const items = (doc.items as any[]) ?? [];
  const [mode, setMode] = useState<Mode>("current");

  const L = (ar: string, en: string) => (mode === "bilingual" ? `${ar} / ${en}` : (locale === "ar" ? ar : en));
  const num = (n: number) => fmtNumber(Number(n).toFixed(2), locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const issueGregorian = doc.issue_date ? new Date(doc.issue_date).toLocaleDateString(locale === "ar" ? "ar" : "en") : "";
  const issueHijri = doc.issue_date ? hijriDate(doc.issue_date) : "";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end gap-2 print:hidden">
          <Button size="sm" variant="outline" onClick={() => setMode(mode === "bilingual" ? "current" : "bilingual")}>
            <Languages className="size-4"/>{mode === "bilingual" ? L("لغة واحدة","Single language") : L("عرض ثنائي اللغة","Bilingual")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(kind, doc, org as any)}><Download className="size-4"/>{L("تنزيل PDF","Download PDF")}</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4"/>{L("طباعة","Print")}</Button>
        </div>
        <div className="bg-card p-2 print:p-0">
          <DocumentHeader/>
          <div className="my-6 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-gold">
                {kind === "quote" ? L("عرض سعر","Quote") : L("فاتورة ضريبية","Tax Invoice")}
              </div>
              <div className="mt-1 font-serif text-2xl">{doc.number}</div>
            </div>
            <div className="text-end text-sm">
              <div className="text-muted-foreground">{L("الإصدار","Issued")}: {issueGregorian}{issueHijri && ` · ${issueHijri}`}</div>
              {kind === "quote" && doc.valid_until && <div className="text-muted-foreground">{L("صالح حتى","Valid until")}: {doc.valid_until}</div>}
              {kind === "invoice" && doc.due_date && <div className="text-muted-foreground">{L("الاستحقاق","Due")}: {doc.due_date}</div>}
            </div>
          </div>
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{L("إلى","Bill to")}</div>
            <div className="mt-1 font-medium">{doc.client_name}</div>
          </div>
          <table className="w-full text-sm">
            <thead className="border-y">
              <tr>
                <th className="py-2 text-start">{L("الوصف","Description")}</th>
                <th className="py-2 text-end">{L("الكمية","Qty")}</th>
                <th className="py-2 text-end">{L("السعر","Price")}</th>
                <th className="py-2 text-end">{L("الإجمالي","Total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="py-2">{it.description}</td>
                  <td className="py-2 text-end">{fmtNumber(it.quantity, locale)}</td>
                  <td className="py-2 text-end font-mono">{num(it.unit_price)}</td>
                  <td className="py-2 text-end font-mono">{num(Number(it.quantity) * Number(it.unit_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ms-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{L("الإجمالي الفرعي","Subtotal")}</span><span className="font-mono">{num(doc.subtotal)} {doc.currency}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{L("الضريبة","Tax")} ({fmtNumber(doc.tax_rate, locale)}%)</span><span className="font-mono">{num(doc.tax_amount)} {doc.currency}</span></div>
            <div className="flex justify-between border-t pt-1 font-serif text-lg"><span>{L("الإجمالي","Total")}</span><span>{num(doc.total)} {doc.currency}</span></div>
          </div>
          {doc.notes && <div className="mt-8 border-t pt-4 text-sm text-muted-foreground"><div className="mb-1 text-xs uppercase tracking-wider">{L("ملاحظات","Notes")}</div>{doc.notes}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
