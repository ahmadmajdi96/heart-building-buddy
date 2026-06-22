import { useOrg } from "@/lib/org-context";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function DocumentHeader() {
  const { org } = useOrg();
  if (!org) return null;
  return (
    <div className="flex items-start justify-between gap-6 border-b pb-6">
      <div className="flex items-center gap-4">
        {org.logo_path ? (
          <img src={org.logo_path} alt={org.legal_name} className="h-16 w-auto object-contain"/>
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

export function DocumentPreview({ kind, doc, onClose }: { kind: "quote" | "invoice"; doc: any; onClose: () => void }) {
  const { locale } = useI18n();
  const items = (doc.items as any[]) ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end print:hidden">
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4"/>{locale === "ar" ? "طباعة" : "Print"}</Button>
        </div>
        <div className="bg-card p-2 print:p-0">
          <DocumentHeader/>
          <div className="my-6 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-gold">{kind === "quote" ? (locale === "ar" ? "عرض سعر" : "Quote") : (locale === "ar" ? "فاتورة ضريبية" : "Tax Invoice")}</div>
              <div className="mt-1 font-serif text-2xl">{doc.number}</div>
            </div>
            <div className="text-end text-sm">
              <div className="text-muted-foreground">{locale === "ar" ? "الإصدار" : "Issued"}: {doc.issue_date}</div>
              {kind === "quote" && doc.valid_until && <div className="text-muted-foreground">{locale === "ar" ? "صالح حتى" : "Valid until"}: {doc.valid_until}</div>}
              {kind === "invoice" && doc.due_date && <div className="text-muted-foreground">{locale === "ar" ? "الاستحقاق" : "Due"}: {doc.due_date}</div>}
            </div>
          </div>
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{locale === "ar" ? "إلى" : "Bill to"}</div>
            <div className="mt-1 font-medium">{doc.client_name}</div>
          </div>
          <table className="w-full text-sm">
            <thead className="border-y">
              <tr><th className="py-2 text-start">{locale === "ar" ? "الوصف" : "Description"}</th><th className="py-2 text-end">{locale === "ar" ? "الكمية" : "Qty"}</th><th className="py-2 text-end">{locale === "ar" ? "السعر" : "Price"}</th><th className="py-2 text-end">{locale === "ar" ? "الإجمالي" : "Total"}</th></tr>
            </thead>
            <tbody className="divide-y">
              {items.map((it, i) => (
                <tr key={i}><td className="py-2">{it.description}</td><td className="py-2 text-end">{it.quantity}</td><td className="py-2 text-end font-mono">{Number(it.unit_price).toFixed(2)}</td><td className="py-2 text-end font-mono">{(Number(it.quantity) * Number(it.unit_price)).toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ms-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "الإجمالي الفرعي" : "Subtotal"}</span><span className="font-mono">{Number(doc.subtotal).toFixed(2)} {doc.currency}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "الضريبة" : "Tax"} ({doc.tax_rate}%)</span><span className="font-mono">{Number(doc.tax_amount).toFixed(2)} {doc.currency}</span></div>
            <div className="flex justify-between border-t pt-1 font-serif text-lg"><span>{locale === "ar" ? "الإجمالي" : "Total"}</span><span>{Number(doc.total).toFixed(2)} {doc.currency}</span></div>
          </div>
          {doc.notes && <div className="mt-8 border-t pt-4 text-sm text-muted-foreground"><div className="mb-1 text-xs uppercase tracking-wider">{locale === "ar" ? "ملاحظات" : "Notes"}</div>{doc.notes}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
