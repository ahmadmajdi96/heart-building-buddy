import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusBadge } from "@/components/app/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Trash2, FileText, Eye, X, Search } from "lucide-react";
import { toast } from "sonner";
import { DocumentHeader, DocumentPreview } from "@/components/financials/document-preview";

export const Route = createFileRoute("/app/financials")({ component: FinancialsPage });

type Item = { description: string; quantity: number; unit_price: number };
type Quote = any; type Invoice = any; type Payment = any; type Schedule = any;

function TableFilter({ q, setQ, status, setStatus, statuses, placeholder, locale }: {
  q: string; setQ: (v: string) => void;
  status?: string; setStatus?: (v: string) => void;
  statuses?: string[];
  placeholder: string; locale: "ar" | "en";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-56">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-9 ps-9" />
      </div>
      {statuses && setStatus && (
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "ghost"} onClick={() => setStatus(s)} className="capitalize">
              {s === "all" ? (locale === "ar" ? "الكل" : "All") : s}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function FinancialsPage() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const { org, loading, can } = useOrg();

  useEffect(() => {
    if (loading) return;
    if (!org) navigate({ to: "/app/onboarding" });
  }, [loading, org, navigate]);

  if (loading || !org) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-6 animate-spin text-gold"/></div>;

  if (!can("view_financials")) {
    return (
      <div className="space-y-6">
        <PageHeader title={locale === "ar" ? "الماليات" : "Financials"} />
        <Card className="p-8 text-center text-muted-foreground">
          {locale === "ar" ? "ليس لديك صلاحية الوصول إلى الماليات." : "You don't have permission to access financials."}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "الماليات" : "Financials"}
        subtitle={locale === "ar" ? "المدفوعات، الجدولة، عروض الأسعار، والفواتير الضريبية." : "Payments, schedules, quotes, and tax invoices."}
      />
      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="payments">{locale === "ar" ? "المدفوعات" : "Payments"}</TabsTrigger>
          <TabsTrigger value="schedules">{locale === "ar" ? "الجدولة" : "Schedules"}</TabsTrigger>
          <TabsTrigger value="quotes">{locale === "ar" ? "عروض الأسعار" : "Quotes"}</TabsTrigger>
          <TabsTrigger value="invoices">{locale === "ar" ? "الفواتير الضريبية" : "Tax invoices"}</TabsTrigger>
        </TabsList>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="schedules"><SchedulesTab /></TabsContent>
        <TabsContent value="quotes"><QuotesTab /></TabsContent>
        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- helpers ----------
function fmt(n: number, c = "SAR") { return `${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${c}`; }
function calcTotals(items: Item[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const tax_amount = subtotal * (Number(taxRate) || 0) / 100;
  return { subtotal, tax_amount, total: subtotal + tax_amount };
}

// ---------- PAYMENTS ----------
function PaymentsTab() {
  const { locale } = useI18n();
  const { org, can } = useOrg();
  const [rows, setRows] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<string>("all");

  async function load() {
    if (!org) return;
    const { data } = await supabase.from("payments").select("*").eq("org_id", org.id).order("paid_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, [org?.id]);

  const methods = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.method).filter(Boolean)))], [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (method !== "all" && r.method !== method) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.client_name ?? "").toLowerCase().includes(s) || (r.reference ?? "").toLowerCase().includes(s);
  }), [rows, q, method]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="text-sm font-semibold mr-auto">{locale === "ar" ? "سجل المدفوعات" : "Payment log"} <span className="ms-2 text-xs font-normal text-muted-foreground">({filtered.length}/{rows.length})</span></div>
        <TableFilter q={q} setQ={setQ} status={method} setStatus={setMethod} statuses={methods} placeholder={locale === "ar" ? "ابحث بالعميل/المرجع…" : "Search client / reference…"} locale={locale as any} />
        {can("edit_financials") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4"/>{locale === "ar" ? "تسجيل دفعة" : "Record payment"}</Button></DialogTrigger>
            <PaymentDialog onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />
          </Dialog>
        )}
      </div>
      {loading ? <Loading/> : filtered.length === 0 ? <Empty msg={locale === "ar" ? "لا نتائج." : "No matches."}/> : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><Th>{locale === "ar" ? "التاريخ" : "Date"}</Th><Th>{locale === "ar" ? "العميل" : "Client"}</Th><Th>{locale === "ar" ? "المرجع" : "Reference"}</Th><Th>{locale === "ar" ? "الطريقة" : "Method"}</Th><Th className="text-end">{locale === "ar" ? "المبلغ" : "Amount"}</Th></tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/40">
                <Td>{r.paid_at}</Td><Td className="font-medium">{r.client_name}</Td><Td className="text-muted-foreground">{r.reference || "—"}</Td><Td><span className="capitalize">{r.method.replace("_"," ")}</span></Td>
                <Td className="text-end font-mono tabular-nums">{fmt(r.amount, r.currency)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function PaymentDialog({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const { locale } = useI18n();
  const { org } = useOrg();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [form, setForm] = useState({ client_name: "", amount: "", method: "bank_transfer", reference: "", invoice_id: "", paid_at: new Date().toISOString().slice(0,10), notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org) return;
    supabase.from("tax_invoices").select("id, number, client_name, total, amount_paid").eq("org_id", org.id).neq("status","paid").neq("status","void").then(({ data }) => setInvoices(data ?? []));
  }, [org?.id]);

  async function save() {
    if (!org) return;
    setSaving(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session!.user.id;
    const inv = invoices.find(i => i.id === form.invoice_id);
    const payload: any = {
      org_id: org.id, created_by: uid, amount: Number(form.amount), method: form.method,
      reference: form.reference, paid_at: form.paid_at, notes: form.notes,
      client_name: inv ? inv.client_name : form.client_name, currency: org.currency,
      invoice_id: form.invoice_id || null,
    };
    const { error } = await supabase.from("payments").insert(payload);
    if (error) { toast.error(error.message); setSaving(false); return; }
    if (inv) {
      const newPaid = Number(inv.amount_paid) + Number(form.amount);
      const status = newPaid >= Number(inv.total) ? "paid" : "partial";
      await supabase.from("tax_invoices").update({ amount_paid: newPaid, status }).eq("id", inv.id);
    }
    toast.success(locale === "ar" ? "تم الحفظ" : "Saved");
    setSaving(false); onSaved();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{locale === "ar" ? "تسجيل دفعة" : "Record payment"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>{locale === "ar" ? "فاتورة (اختياري)" : "Invoice (optional)"}</Label>
          <Select value={form.invoice_id} onValueChange={(v) => setForm({ ...form, invoice_id: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder={locale === "ar" ? "بدون فاتورة" : "None"} /></SelectTrigger>
            <SelectContent>{invoices.map(i => <SelectItem key={i.id} value={i.id}>{i.number} — {i.client_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {!form.invoice_id && (
          <div><Label>{locale === "ar" ? "العميل" : "Client"}</Label><Input className="mt-1.5" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}/></div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{locale === "ar" ? "المبلغ" : "Amount"}</Label><Input type="number" step="0.01" className="mt-1.5" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}/></div>
          <div><Label>{locale === "ar" ? "التاريخ" : "Date"}</Label><Input type="date" className="mt-1.5" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })}/></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{locale === "ar" ? "الطريقة" : "Method"}</Label>
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
              <SelectContent>
                {["cash","bank_transfer","card","cheque","other"].map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_"," ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>{locale === "ar" ? "المرجع" : "Reference"}</Label><Input className="mt-1.5" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}/></div>
        </div>
        <div><Label>{locale === "ar" ? "ملاحظات" : "Notes"}</Label><Textarea rows={2} className="mt-1.5" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button>
        <Button variant="gold" onClick={save} disabled={saving || !form.amount}>{saving && <Loader2 className="size-4 animate-spin"/>}{locale === "ar" ? "حفظ" : "Save"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------- SCHEDULES ----------
function SchedulesTab() {
  const { locale } = useI18n();
  const { org, can } = useOrg();
  const [rows, setRows] = useState<Schedule[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  async function load() {
    if (!org) return;
    const { data } = await supabase.from("payment_schedules").select("*").eq("org_id", org.id).order("due_date", { ascending: true });
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, [org?.id]);

  async function markPaid(id: string) {
    await supabase.from("payment_schedules").update({ status: "paid" }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("payment_schedules").delete().eq("id", id);
    load();
  }

  const statuses = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.status).filter(Boolean)))], [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.client_name ?? "").toLowerCase().includes(s) || (r.description ?? "").toLowerCase().includes(s);
  }), [rows, q, status]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="text-sm font-semibold mr-auto">{locale === "ar" ? "جدولة المدفوعات" : "Payment schedule"} <span className="ms-2 text-xs font-normal text-muted-foreground">({filtered.length}/{rows.length})</span></div>
        <TableFilter q={q} setQ={setQ} status={status} setStatus={setStatus} statuses={statuses} placeholder={locale === "ar" ? "ابحث…" : "Search…"} locale={locale as any} />
        {can("edit_financials") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4"/>{locale === "ar" ? "إضافة قسط" : "New installment"}</Button></DialogTrigger>
            <ScheduleDialog onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />
          </Dialog>
        )}
      </div>
      {loading ? <Loading/> : filtered.length === 0 ? <Empty msg={locale === "ar" ? "لا نتائج." : "No matches."}/> : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><Th>{locale === "ar" ? "الاستحقاق" : "Due"}</Th><Th>{locale === "ar" ? "العميل" : "Client"}</Th><Th>{locale === "ar" ? "الوصف" : "Description"}</Th><Th className="text-end">{locale === "ar" ? "المبلغ" : "Amount"}</Th><Th>{locale === "ar" ? "الحالة" : "Status"}</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/40">
                <Td>{r.due_date}</Td><Td className="font-medium">{r.client_name}</Td><Td className="text-muted-foreground">{r.description || "—"}</Td>
                <Td className="text-end font-mono tabular-nums">{fmt(r.amount, r.currency)}</Td>
                <Td><StatusBadge status={r.status}/></Td>
                <Td className="text-end">
                  {can("edit_financials") && r.status !== "paid" && <Button size="sm" variant="ghost" onClick={() => markPaid(r.id)}>{locale === "ar" ? "تم الدفع" : "Mark paid"}</Button>}
                  {can("delete_financials") && <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive"/></Button>}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function ScheduleDialog({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const { locale } = useI18n();
  const { org } = useOrg();
  const [form, setForm] = useState({ client_name: "", description: "", due_date: "", amount: "" });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!org) return;
    setSaving(true);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase.from("payment_schedules").insert({
      org_id: org.id, created_by: sess.session!.user.id, currency: org.currency,
      client_name: form.client_name, description: form.description, due_date: form.due_date,
      amount: Number(form.amount), status: "upcoming",
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    onSaved();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{locale === "ar" ? "قسط جديد" : "New installment"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>{locale === "ar" ? "العميل" : "Client"}</Label><Input className="mt-1.5" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}/></div>
        <div><Label>{locale === "ar" ? "الوصف" : "Description"}</Label><Input className="mt-1.5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{locale === "ar" ? "الاستحقاق" : "Due date"}</Label><Input type="date" className="mt-1.5" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}/></div>
          <div><Label>{locale === "ar" ? "المبلغ" : "Amount"}</Label><Input type="number" step="0.01" className="mt-1.5" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}/></div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button>
        <Button variant="gold" onClick={save} disabled={saving || !form.client_name || !form.due_date || !form.amount}>{saving && <Loader2 className="size-4 animate-spin"/>}{locale === "ar" ? "حفظ" : "Save"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------- QUOTES ----------
function QuotesTab() {
  const { locale } = useI18n();
  const { org, can } = useOrg();
  const [rows, setRows] = useState<Quote[]>([]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  async function load() {
    if (!org) return;
    const { data } = await supabase.from("quotes").select("*").eq("org_id", org.id).order("created_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, [org?.id]);

  async function convert(qte: Quote) {
    if (!org) return;
    const { data: sess } = await supabase.auth.getSession();
    const { data: numRes } = await supabase.rpc("next_doc_number", { _org_id: org.id, _kind: "invoice" });
    const { error } = await supabase.from("tax_invoices").insert({
      org_id: org.id, created_by: sess.session!.user.id, number: numRes as string,
      quote_id: qte.id, client_id: qte.client_id, client_name: qte.client_name, case_id: qte.case_id,
      currency: qte.currency, tax_rate: qte.tax_rate, subtotal: qte.subtotal, tax_amount: qte.tax_amount, total: qte.total,
      items: qte.items, notes: qte.notes, status: "issued",
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("quotes").update({ status: "converted" }).eq("id", qte.id);
    toast.success(locale === "ar" ? "تم التحويل إلى فاتورة" : "Converted to invoice");
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("quotes").delete().eq("id", id); load();
  }

  const statuses = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.status).filter(Boolean)))], [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.client_name ?? "").toLowerCase().includes(s) || (r.number ?? "").toLowerCase().includes(s);
  }), [rows, q, status]);

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="text-sm font-semibold mr-auto">{locale === "ar" ? "عروض الأسعار" : "Quotes"} <span className="ms-2 text-xs font-normal text-muted-foreground">({filtered.length}/{rows.length})</span></div>
          <TableFilter q={q} setQ={setQ} status={status} setStatus={setStatus} statuses={statuses} placeholder={locale === "ar" ? "ابحث برقم/عميل…" : "Search by #/client…"} locale={locale as any} />
          {can("edit_financials") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4"/>{locale === "ar" ? "عرض سعر جديد" : "New quote"}</Button></DialogTrigger>
              <DocFormDialog kind="quote" onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />
            </Dialog>
          )}
        </div>
        {loading ? <Loading/> : filtered.length === 0 ? <Empty msg={locale === "ar" ? "لا نتائج." : "No matches."}/> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><Th>#</Th><Th>{locale === "ar" ? "العميل" : "Client"}</Th><Th>{locale === "ar" ? "الإصدار" : "Issued"}</Th><Th>{locale === "ar" ? "حتى" : "Valid until"}</Th><Th className="text-end">{locale === "ar" ? "الإجمالي" : "Total"}</Th><Th>{locale === "ar" ? "الحالة" : "Status"}</Th><Th></Th></tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <Td className="font-mono text-xs">{r.number}</Td><Td className="font-medium">{r.client_name}</Td>
                  <Td>{r.issue_date}</Td><Td className="text-muted-foreground">{r.valid_until || "—"}</Td>
                  <Td className="text-end font-mono tabular-nums">{fmt(r.total, r.currency)}</Td>
                  <Td><StatusBadge status={r.status}/></Td>
                  <Td className="text-end">
                    <Button size="icon" variant="ghost" onClick={() => setPreview(r)}><Eye className="size-4"/></Button>
                    {can("edit_financials") && r.status !== "converted" && <Button size="sm" variant="ghost" onClick={() => convert(r)}><FileText className="size-4"/>{locale === "ar" ? "تحويل" : "Invoice"}</Button>}
                    {can("delete_financials") && <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive"/></Button>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {preview && <DocumentPreview kind="quote" doc={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

// ---------- INVOICES ----------
function InvoicesTab() {
  const { locale } = useI18n();
  const { org, can } = useOrg();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!org) return;
    const { data } = await supabase.from("tax_invoices").select("*").eq("org_id", org.id).order("created_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, [org?.id]);

  async function remove(id: string) { if (!confirm("Delete?")) return; await supabase.from("tax_invoices").delete().eq("id", id); load(); }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div className="text-sm font-semibold">{locale === "ar" ? "الفواتير الضريبية" : "Tax invoices"}</div>
          {can("edit_financials") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4"/>{locale === "ar" ? "فاتورة جديدة" : "New invoice"}</Button></DialogTrigger>
              <DocFormDialog kind="invoice" onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />
            </Dialog>
          )}
        </div>
        {loading ? <Loading/> : rows.length === 0 ? <Empty msg={locale === "ar" ? "لا توجد فواتير." : "No invoices yet."}/> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><Th>#</Th><Th>{locale === "ar" ? "العميل" : "Client"}</Th><Th>{locale === "ar" ? "الإصدار" : "Issued"}</Th><Th>{locale === "ar" ? "الاستحقاق" : "Due"}</Th><Th className="text-end">{locale === "ar" ? "الإجمالي" : "Total"}</Th><Th className="text-end">{locale === "ar" ? "المدفوع" : "Paid"}</Th><Th>{locale === "ar" ? "الحالة" : "Status"}</Th><Th></Th></tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <Td className="font-mono text-xs">{r.number}</Td><Td className="font-medium">{r.client_name}</Td>
                  <Td>{r.issue_date}</Td><Td className="text-muted-foreground">{r.due_date || "—"}</Td>
                  <Td className="text-end font-mono tabular-nums">{fmt(r.total, r.currency)}</Td>
                  <Td className="text-end font-mono tabular-nums">{fmt(r.amount_paid, r.currency)}</Td>
                  <Td><StatusBadge status={r.status}/></Td>
                  <Td className="text-end">
                    <Button size="icon" variant="ghost" onClick={() => setPreview(r)}><Eye className="size-4"/></Button>
                    {can("delete_financials") && <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive"/></Button>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {preview && <DocumentPreview kind="invoice" doc={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

// ---------- Shared doc form (quote + invoice) ----------
function DocFormDialog({ kind, onSaved, onClose }: { kind: "quote" | "invoice"; onSaved: () => void; onClose: () => void }) {
  const { locale } = useI18n();
  const { org } = useOrg();
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [form, setForm] = useState({
    client_name: "", issue_date: new Date().toISOString().slice(0,10), valid_until: "", due_date: "",
    tax_rate: String(org?.default_tax_rate ?? 0), notes: "",
  });
  const [saving, setSaving] = useState(false);
  const totals = calcTotals(items, Number(form.tax_rate));

  async function save() {
    if (!org) return;
    setSaving(true);
    const { data: sess } = await supabase.auth.getSession();
    const { data: numRes, error: nErr } = await supabase.rpc("next_doc_number", { _org_id: org.id, _kind: kind });
    if (nErr) { toast.error(nErr.message); setSaving(false); return; }
    const base: any = {
      org_id: org.id, created_by: sess.session!.user.id, number: numRes as string,
      client_name: form.client_name, issue_date: form.issue_date,
      currency: org.currency, tax_rate: Number(form.tax_rate),
      subtotal: totals.subtotal, tax_amount: totals.tax_amount, total: totals.total,
      items, notes: form.notes,
    };
    if (kind === "quote") { base.valid_until = form.valid_until || null; base.status = "draft"; }
    else { base.due_date = form.due_date || null; base.status = "draft"; }
    const { error } = await supabase.from(kind === "quote" ? "quotes" : "tax_invoices").insert(base);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(locale === "ar" ? "تم الحفظ" : "Saved"); onSaved();
  }

  function updateItem(i: number, patch: Partial<Item>) { setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{kind === "quote" ? (locale === "ar" ? "عرض سعر جديد" : "New quote") : (locale === "ar" ? "فاتورة جديدة" : "New invoice")}</DialogTitle></DialogHeader>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div><Label>{locale === "ar" ? "العميل" : "Client"}</Label><Input className="mt-1.5" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}/></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>{locale === "ar" ? "الإصدار" : "Issue date"}</Label><Input type="date" className="mt-1.5" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })}/></div>
          {kind === "quote" ? (
            <div><Label>{locale === "ar" ? "صالح حتى" : "Valid until"}</Label><Input type="date" className="mt-1.5" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })}/></div>
          ) : (
            <div><Label>{locale === "ar" ? "الاستحقاق" : "Due date"}</Label><Input type="date" className="mt-1.5" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}/></div>
          )}
          <div><Label>{locale === "ar" ? "الضريبة %" : "Tax %"}</Label><Input type="number" step="0.01" className="mt-1.5" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}/></div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><Label>{locale === "ar" ? "البنود" : "Line items"}</Label>
            <Button size="sm" variant="ghost" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0 }])}><Plus className="size-4"/></Button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_120px_auto] gap-2">
                <Input placeholder={locale === "ar" ? "الوصف" : "Description"} value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })}/>
                <Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}/>
                <Input type="number" step="0.01" placeholder={locale === "ar" ? "السعر" : "Unit price"} value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}/>
                <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, idx) => idx !== i))} disabled={items.length === 1}><X className="size-4"/></Button>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-secondary/40 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "الإجمالي الفرعي" : "Subtotal"}</span><span className="font-mono">{fmt(totals.subtotal, org?.currency)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "الضريبة" : "Tax"}</span><span className="font-mono">{fmt(totals.tax_amount, org?.currency)}</span></div>
          <div className="flex justify-between border-t pt-1 font-semibold"><span>{locale === "ar" ? "الإجمالي" : "Total"}</span><span className="font-mono">{fmt(totals.total, org?.currency)}</span></div>
        </div>
        <div><Label>{locale === "ar" ? "ملاحظات" : "Notes"}</Label><Textarea rows={2} className="mt-1.5" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button>
        <Button variant="gold" onClick={save} disabled={saving || !form.client_name}>{saving && <Loader2 className="size-4 animate-spin"/>}{locale === "ar" ? "حفظ" : "Save"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// helpers
function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) { return <th className={`px-5 py-3 text-start font-medium ${className}`}>{children}</th>; }
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) { return <td className={`px-5 py-3 ${className}`}>{children}</td>; }
function Loading() { return <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-muted-foreground"/></div>; }
function Empty({ msg }: { msg: string }) { return <div className="p-12 text-center text-sm text-muted-foreground">{msg}</div>; }

export { DocumentHeader };
