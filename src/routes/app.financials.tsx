import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Trash2, FileText, Eye, X, Search, Send, XCircle, CheckCircle2, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { DocumentHeader, DocumentPreview } from "@/components/financials/document-preview";
import { downloadInvoicePdf, downloadReceiptPdf } from "@/lib/invoice-pdf";
import { useServerFn } from "@tanstack/react-start";
import { sweepOverdueInvoices, setInvoiceStatus, markInvoicePaid } from "@/lib/invoicing.functions";
import { listDraftInvoices, deleteDraftInvoice, acceptDraftInvoice, rejectDraftInvoice, bulkAcceptDraftInvoices } from "@/lib/draft-invoices.functions";
import { getTimeEntriesByIds } from "@/lib/time-entries.functions";
import { listOrgDebtPayments } from "@/lib/debt-collection.functions";
import { listClients, saveClient } from "@/lib/clients.functions";
import { listUnpaidInvoicesForClient, createPaymentPlan, markSchedulePaid, deletePaymentPlan, getPaymentPlan, pausePaymentPlan, resumePaymentPlan, cancelPaymentPlan, reschedulePaymentPlan } from "@/lib/payment-plans.functions";
import { FinancialsToolbar } from "@/components/financials/financials-toolbar";
import { toCsv, downloadCsv, inRange } from "@/lib/csv-export";


import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Layers } from "lucide-react";
import { Link } from "@tanstack/react-router";

const financialsSearchSchema = z.object({
  tab: fallback(z.enum(["payments", "schedules", "quotes", "drafts", "invoices", "collections"]), "payments").default("payments"),
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "all").default("all"),
  dueFrom: fallback(z.string(), "").default(""),
  dueTo: fallback(z.string(), "").default(""),
  payment: fallback(z.enum(["all", "paid", "unpaid"]), "all").default("all"),
});

export const Route = createFileRoute("/app/financials")({
  validateSearch: zodValidator(financialsSearchSchema),
  component: FinancialsPage,
});

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
  const search = Route.useSearch();
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
      <Tabs value={search.tab} onValueChange={(v) => navigate({ to: "/app/financials", search: { ...search, tab: v as any } })} className="space-y-6">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="payments">{locale === "ar" ? "المدفوعات" : "Payments"}</TabsTrigger>
          <TabsTrigger value="schedules">{locale === "ar" ? "الجدولة" : "Schedules"}</TabsTrigger>
          <TabsTrigger value="quotes">{locale === "ar" ? "عروض الأسعار" : "Quotes"}</TabsTrigger>
          <TabsTrigger value="drafts">{locale === "ar" ? "الفواتير" : "Invoices"}</TabsTrigger>
          <TabsTrigger value="invoices">{locale === "ar" ? "الفواتير الضريبية" : "Tax invoices"}</TabsTrigger>
          <TabsTrigger value="collections">{locale === "ar" ? "التحصيل" : "Collections"}</TabsTrigger>
        </TabsList>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="schedules"><SchedulesTab /></TabsContent>
        <TabsContent value="quotes"><QuotesTab /></TabsContent>
        <TabsContent value="drafts"><DraftInvoicesTab /></TabsContent>
        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
        <TabsContent value="collections"><CollectionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- helpers ----------
function fmt(n: number, c = "JOD") { return `${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${c}`; }
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
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  async function load() {
    if (!org) return;
    // Include invoice and case joins so exports carry full context.
    const { data } = await supabase.from("payments")
      .select("*, tax_invoices(id, number, case_id, cases(id, title, case_number))")
      .eq("org_id", org.id).order("paid_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, [org?.id]);

  const methods = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.method).filter(Boolean)))], [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (method !== "all" && r.method !== method) return false;
    if (!inRange(r.paid_at, from, to)) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.client_name ?? "").toLowerCase().includes(s) || (r.reference ?? "").toLowerCase().includes(s);
  }), [rows, q, method, from, to]);

  function exportCsv() {
    const headers = ["Paid at","Client","Invoice #","Case","Case #","Method","Amount","Currency","Reference","Notes"];
    const rowsCsv = filtered.map((r: any) => [
      r.paid_at, r.client_name ?? "",
      r.tax_invoices?.number ?? "", r.tax_invoices?.cases?.title ?? "", r.tax_invoices?.cases?.case_number ?? "",
      r.method, r.amount, r.currency, r.reference ?? "", r.notes ?? "",
    ]);
    downloadCsv(`payments_${new Date().toISOString().slice(0,10)}.csv`, toCsv(headers, rowsCsv));
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="text-sm font-semibold mr-auto">{locale === "ar" ? "سجل المدفوعات" : "Payment log"} <span className="ms-2 text-xs font-normal text-muted-foreground">({filtered.length}/{rows.length})</span></div>
        {can("edit_financials") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4"/>{locale === "ar" ? "تسجيل دفعة" : "Record payment"}</Button></DialogTrigger>
            <PaymentDialog onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />
          </Dialog>
        )}
      </div>
      <div className="border-b p-4">
        <FinancialsToolbar q={q} setQ={setQ} status={method} setStatus={setMethod} statuses={methods}
          fromLabel={locale === "ar" ? "من (تاريخ الدفع)" : "From (paid at)"}
          from={from} setFrom={setFrom} to={to} setTo={setTo}
          onExport={exportCsv} exportDisabled={filtered.length === 0}
          placeholder={locale === "ar" ? "ابحث بالعميل/المرجع…" : "Search client / reference…"} locale={locale as any} />
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

// ---------- SCHEDULES / PAYMENT PLANS ----------
function SchedulesTab() {
  const [detailsPlanId, setDetailsPlanId] = useState<string | null>(null);

  const { locale } = useI18n();
  const { org, can } = useOrg();
  const [rows, setRows] = useState<any[]>([]);
  const [openOne, setOpenOne] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const markPaidFn = useServerFn(markSchedulePaid);
  const deletePlanFn = useServerFn(deletePaymentPlan);

  async function load() {
    if (!org) return;
    const { data } = await supabase.from("payment_schedules")
      .select("*, tax_invoices(id,number,status,case_id,cases(id,title,case_number))")
      .eq("org_id", org.id)
      .order("plan_id", { ascending: false, nullsFirst: false })
      .order("due_date", { ascending: true });
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, [org?.id]);

  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("payment_schedules").delete().eq("id", id);
    load();
  }
  async function removePlan(plan_id: string) {
    if (!confirm(locale === "ar" ? "حذف كامل الخطة؟" : "Delete entire plan and all installments?")) return;
    try { await deletePlanFn({ data: { plan_id } }); toast.success("Plan deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  const statuses = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.status).filter(Boolean)))], [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!inRange(r.due_date, from, to)) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.client_name ?? "").toLowerCase().includes(s) || (r.description ?? "").toLowerCase().includes(s);
  }), [rows, q, status, from, to]);

  function exportCsv() {
    const headers = ["Due date","Plan ID","Installment","Client","Description","Invoice #","Case","Case #","Amount","Currency","Status"];
    const rowsCsv = filtered.map((r: any) => [
      r.due_date, r.plan_id ?? "",
      r.installment_no ? `${r.installment_no}/${r.installment_count}` : "single",
      r.client_name ?? "", r.description ?? "",
      r.tax_invoices?.number ?? "",
      r.tax_invoices?.cases?.title ?? "", r.tax_invoices?.cases?.case_number ?? "",
      r.amount, r.currency, r.status,
    ]);
    downloadCsv(`schedules_${new Date().toISOString().slice(0,10)}.csv`, toCsv(headers, rowsCsv));
  }

  // group by plan_id
  const grouped = useMemo(() => {
    const plans = new Map<string, any[]>();
    const singles: any[] = [];
    for (const r of filtered) {
      if (r.plan_id) {
        if (!plans.has(r.plan_id)) plans.set(r.plan_id, []);
        plans.get(r.plan_id)!.push(r);
      } else singles.push(r);
    }
    for (const arr of plans.values()) arr.sort((a, b) => (a.installment_no ?? 0) - (b.installment_no ?? 0));
    return { plans: Array.from(plans.entries()), singles };
  }, [filtered]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="text-sm font-semibold mr-auto">{locale === "ar" ? "جدولة المدفوعات" : "Payment schedule"} <span className="ms-2 text-xs font-normal text-muted-foreground">({filtered.length}/{rows.length})</span></div>
        {can("edit_financials") && (
          <>
            <Dialog open={openPlan} onOpenChange={setOpenPlan}>
              <DialogTrigger asChild><Button size="sm" variant="gold"><Layers className="size-4"/>{locale === "ar" ? "خطة سداد جديدة" : "New payment plan"}</Button></DialogTrigger>
              <PaymentPlanDialog onSaved={() => { setOpenPlan(false); load(); }} onClose={() => setOpenPlan(false)} />
            </Dialog>
            <Dialog open={openOne} onOpenChange={setOpenOne}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="size-4"/>{locale === "ar" ? "قسط منفرد" : "Single installment"}</Button></DialogTrigger>
              <ScheduleDialog onSaved={() => { setOpenOne(false); load(); }} onClose={() => setOpenOne(false)} />
            </Dialog>
          </>
        )}
      </div>

      {loading ? <Loading/> : filtered.length === 0 ? <Empty msg={locale === "ar" ? "لا نتائج." : "No matches."}/> : (
        <div className="divide-y">
          {grouped.plans.map(([planId, items]) => {
            const total = items.reduce((a, r) => a + Number(r.amount), 0);
            const paid = items.filter((r) => r.status === "paid").reduce((a, r) => a + Number(r.amount), 0);
            const anchor = items[0];
            return (
              <div key={planId} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{anchor.client_name} <span className="ms-2 text-xs font-normal text-muted-foreground">{items.length} {locale === "ar" ? "أقساط" : "installments"}</span></div>
                    <div className="text-xs text-muted-foreground">{anchor.description}</div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono tabular-nums">{fmt(paid, anchor.currency)} / {fmt(total, anchor.currency)}</span>
                    {anchor.debt_case_id && (
                      <Link to="/app/debt-collection/$id" params={{ id: anchor.debt_case_id }} className="text-xs text-gold hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="size-3"/>{locale === "ar" ? "ملف التحصيل" : "Debt case"}
                      </Link>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setDetailsPlanId(planId)}>
                      <Eye className="size-4"/>{locale === "ar" ? "التفاصيل" : "Details"}
                    </Button>
                    {can("delete_financials") && <Button size="icon" variant="ghost" onClick={() => removePlan(planId)}><Trash2 className="size-4 text-destructive"/></Button>}
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><Th>#</Th><Th>{locale === "ar" ? "الاستحقاق" : "Due"}</Th><Th>{locale === "ar" ? "الفاتورة" : "Invoice"}</Th><Th className="text-end">{locale === "ar" ? "المبلغ" : "Amount"}</Th><Th>{locale === "ar" ? "الحالة" : "Status"}</Th><Th></Th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/40">
                        <Td>{r.installment_no}/{r.installment_count}</Td>
                        <Td>{r.due_date}</Td>
                        <Td>{r.tax_invoices ? <Link to="/app/financials" search={{ tab: "invoices" as const, q: r.tax_invoices.number, status: "all", dueFrom: "", dueTo: "", payment: "all" as const }} className="text-gold hover:underline">{r.tax_invoices.number}</Link> : "—"}</Td>
                        <Td className="text-end font-mono tabular-nums">{fmt(r.amount, r.currency)}</Td>
                        <Td><StatusBadge status={r.status}/></Td>
                        <Td className="text-end">
                          {can("edit_financials") && r.status !== "paid" && (
                            <Button size="sm" variant="ghost" disabled={markingId === r.id} onClick={async () => {
                              setMarkingId(r.id);
                              try {
                                await markPaidFn({ data: { id: r.id, paid_at: new Date().toISOString().slice(0, 10), method: "bank_transfer" } });
                                toast.success(locale === "ar" ? "تم تسجيل الدفع" : "Payment recorded");
                                load();
                              } catch (e: any) { toast.error(e.message); }
                              finally { setMarkingId(null); }
                            }}>{locale === "ar" ? "تم الدفع" : "Mark paid"}</Button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {grouped.singles.length > 0 && (
            <div className="p-4">
              <div className="mb-2 text-sm font-semibold">{locale === "ar" ? "أقساط منفردة" : "One-off installments"}</div>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><Th>{locale === "ar" ? "الاستحقاق" : "Due"}</Th><Th>{locale === "ar" ? "العميل" : "Client"}</Th><Th>{locale === "ar" ? "الوصف" : "Description"}</Th><Th className="text-end">{locale === "ar" ? "المبلغ" : "Amount"}</Th><Th>{locale === "ar" ? "الحالة" : "Status"}</Th><Th></Th></tr>
                </thead>
                <tbody className="divide-y">
                  {grouped.singles.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/40">
                      <Td>{r.due_date}</Td><Td className="font-medium">{r.client_name}</Td><Td className="text-muted-foreground">{r.description || "—"}</Td>
                      <Td className="text-end font-mono tabular-nums">{fmt(r.amount, r.currency)}</Td>
                      <Td><StatusBadge status={r.status}/></Td>
                      <Td className="text-end">
                        {can("edit_financials") && r.status !== "paid" && (
                          <Button size="sm" variant="ghost" onClick={async () => {
                            await supabase.from("payment_schedules").update({ status: "paid" }).eq("id", r.id); load();
                          }}>{locale === "ar" ? "تم الدفع" : "Mark paid"}</Button>
                        )}
                        {can("delete_financials") && <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive"/></Button>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <Dialog open={!!detailsPlanId} onOpenChange={(v) => { if (!v) setDetailsPlanId(null); }}>
        {detailsPlanId && <PlanDetailsDialog planId={detailsPlanId} onClose={() => setDetailsPlanId(null)} onChanged={load} />}
      </Dialog>
    </Card>
  );

}

function PlanDetailsDialog({ planId, onClose, onChanged }: { planId: string; onClose: () => void; onChanged: () => void }) {
  const { locale } = useI18n();
  const { org, can } = useOrg();
  const getPlan = useServerFn(getPaymentPlan);
  const pauseFn = useServerFn(pausePaymentPlan);
  const resumeFn = useServerFn(resumePaymentPlan);
  const cancelFn = useServerFn(cancelPaymentPlan);
  const rescheduleFn = useServerFn(reschedulePaymentPlan);
  const markPaidFn = useServerFn(markSchedulePaid);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedDate, setReschedDate] = useState(new Date().toISOString().slice(0, 10));
  const [reschedGap, setReschedGap] = useState(1);

  async function load() {
    setLoading(true);
    try { setPlan(await getPlan({ data: { plan_id: planId } })); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [planId]);

  async function doAction(fn: () => Promise<any>, label: string) {
    setBusy(true);
    try { await fn(); toast.success(label); await load(); onChanged(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);

  return (
    <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{t("Payment plan details", "تفاصيل خطة السداد")}</DialogTitle>
      </DialogHeader>
      {loading || !plan ? <div className="grid place-items-center py-10"><Loader2 className="size-6 animate-spin text-gold"/></div> : (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Client", "العميل")}</div>
              <div className="mt-1 truncate text-sm font-semibold">{plan.client_name}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Installments", "الأقساط")}</div>
              <div className="mt-1 text-sm font-semibold">{plan.schedules.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Remaining", "المتبقي")}</div>
              <div className="mt-1 font-mono text-sm tabular-nums">{fmt(plan.remaining, plan.currency)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Plan status", "حالة الخطة")}</div>
              <div className="mt-1"><StatusBadge status={plan.plan_status}/></div>
            </div>
          </div>

          {/* Debt case + next reminder */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Debt case", "ملف التحصيل")}</div>
              {plan.debt_case ? (
                <div className="mt-1 flex items-center justify-between">
                  <Link to="/app/debt-collection/$id" params={{ id: plan.debt_case.id }} className="text-sm text-gold hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="size-3"/>{plan.debt_case.title}
                  </Link>
                  <StatusBadge status={plan.debt_case.status}/>
                </div>
              ) : <div className="mt-1 text-sm text-muted-foreground">—</div>}
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Next scheduled reminder", "التذكير التالي")}</div>
              {plan.next_reminder ? (
                <div className="mt-1 text-sm">
                  <span className="font-mono tabular-nums">{plan.next_reminder.fire_at}</span>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {plan.next_reminder.rule_label} · {t("installment", "قسط")} {plan.next_reminder.installment_no} ({plan.next_reminder.due_date})
                  </span>
                </div>
              ) : <div className="mt-1 text-sm text-muted-foreground">{t("None scheduled", "لا يوجد")}</div>}
            </div>
          </div>

          {/* Invoices */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Invoices in this plan", "الفواتير")}</div>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><Th>#</Th><Th>{t("Due", "الاستحقاق")}</Th><Th className="text-end">{t("Total", "الإجمالي")}</Th><Th className="text-end">{t("Paid", "المدفوع")}</Th><Th>{t("Status", "الحالة")}</Th></tr>
                </thead>
                <tbody className="divide-y">
                  {plan.invoices.map((inv: any) => (
                    <tr key={inv.id}>
                      <Td className="font-medium">{inv.number}</Td>
                      <Td>{inv.due_date ?? "—"}</Td>
                      <Td className="text-end font-mono tabular-nums">{fmt(inv.total, inv.currency)}</Td>
                      <Td className="text-end font-mono tabular-nums">{fmt(inv.amount_paid, inv.currency)}</Td>
                      <Td><StatusBadge status={inv.status}/></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Installment schedule", "جدول الأقساط")}</div>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><Th>#</Th><Th>{t("Due", "الاستحقاق")}</Th><Th className="text-end">{t("Amount", "المبلغ")}</Th><Th>{t("Status", "الحالة")}</Th><Th></Th></tr>
                </thead>
                <tbody className="divide-y">
                  {plan.schedules.map((s: any) => (
                    <tr key={s.id}>
                      <Td>{s.installment_no}/{s.installment_count}</Td>
                      <Td>{s.due_date}</Td>
                      <Td className="text-end font-mono tabular-nums">{fmt(s.amount, s.currency)}</Td>
                      <Td><StatusBadge status={s.status}/></Td>
                      <Td className="text-end">
                        {can("edit_financials") && s.status !== "paid" && s.status !== "cancelled" && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={async () => {
                            setBusy(true);
                            try {
                              await markPaidFn({ data: { id: s.id, paid_at: new Date().toISOString().slice(0, 10), method: "bank_transfer" } });
                              toast.success(t("Payment recorded", "تم تسجيل الدفع"));
                              await load(); onChanged();
                            } catch (e: any) { toast.error(e.message); }
                            finally { setBusy(false); }
                          }}>{t("Mark paid", "تم الدفع")}</Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ledger */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Invoice split ledger", "سجل توزيع الدفعات")}</div>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <Th>{t("Paid at", "تاريخ")}</Th>
                    <Th>{t("Invoice", "الفاتورة")}</Th>
                    <Th>{t("Method", "الطريقة")}</Th>
                    <Th>{t("Reference", "المرجع")}</Th>
                    <Th className="text-end">{t("Amount", "المبلغ")}</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {plan.payments.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-4 text-center text-xs text-muted-foreground">{t("No payments recorded yet.", "لا توجد مدفوعات بعد.")}</td></tr>
                  )}
                  {plan.payments.map((p: any, idx: number) => {
                    const sch = plan.schedules.find((x: any) => x.id === p.schedule_id);
                    const invNumber = p.tax_invoices?.number ?? sch?.tax_invoices?.number ?? "—";
                    const receiptNo = `RCPT-${(p.id as string).slice(0, 8).toUpperCase()}`;
                    return (
                      <tr key={p.id}>
                        <Td>{p.paid_at}</Td>
                        <Td>{invNumber}{sch ? <span className="ms-2 text-xs text-muted-foreground">({t("inst", "قسط")} {sch.installment_no}/{sch.installment_count})</span> : null}</Td>
                        <Td className="capitalize">{String(p.method ?? "").replace(/_/g, " ")}</Td>
                        <Td className="text-muted-foreground">{p.reference ?? "—"}</Td>
                        <Td className="text-end font-mono tabular-nums">{fmt(p.amount, p.currency)}</Td>
                        <Td className="text-end">
                          <Button size="sm" variant="ghost" onClick={() => downloadReceiptPdf({
                            receipt_no: receiptNo,
                            paid_at: p.paid_at,
                            amount: Number(p.amount),
                            currency: p.currency,
                            method: p.method,
                            reference: p.reference,
                            client_name: plan.client_name,
                            invoice_number: invNumber === "—" ? null : invNumber,
                            installment_label: sch ? `${sch.installment_no}/${sch.installment_count}` : null,
                            plan_id: plan.plan_id,
                          }, org)}>
                            <Download className="size-4"/>{t("Receipt", "إيصال")}
                          </Button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reminder rules */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Reminder rules (per installment)", "قواعد التذكير")}</div>
            <div className="rounded-md border p-3 text-sm">
              {plan.reminder_rules.length === 0 && <div className="text-xs text-muted-foreground">{t("No active reminder rules on the linked debt case.", "لا توجد قواعد نشطة.")}</div>}
              {plan.reminder_rules.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border-b py-1.5 last:border-0">
                  <div>
                    <div className="text-sm">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.kind} · offset {r.offset_days}d</div>
                  </div>
                </div>
              ))}
              {plan.upcoming_reminders.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Next 5 upcoming", "التذكيرات القادمة")}</div>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {plan.upcoming_reminders.slice(0, 5).map((u: any, i: number) => (
                      <li key={i} className="flex justify-between"><span className="font-mono tabular-nums">{u.fire_at}</span><span className="text-muted-foreground">{u.rule_label} · inst {u.installment_no}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {can("edit_financials") && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              {plan.plan_status !== "paused" && plan.plan_status !== "completed" && plan.plan_status !== "cancelled" && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => doAction(() => pauseFn({ data: { plan_id: planId } }), t("Plan paused", "تم إيقاف الخطة"))}>{t("Pause", "إيقاف مؤقت")}</Button>
              )}
              {plan.plan_status === "paused" && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => doAction(() => resumeFn({ data: { plan_id: planId } }), t("Plan resumed", "تم استئناف الخطة"))}>{t("Resume", "استئناف")}</Button>
              )}
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setReschedOpen((v) => !v)}>{t("Reschedule remaining", "إعادة جدولة")}</Button>
              {plan.plan_status !== "cancelled" && plan.plan_status !== "completed" && (
                <Button size="sm" variant="destructive" disabled={busy} onClick={async () => {
                  if (!confirm(t("Cancel remaining installments? Paid installments are kept in the ledger.", "إلغاء الأقساط المتبقية؟"))) return;
                  await doAction(() => cancelFn({ data: { plan_id: planId } }), t("Plan cancelled", "تم إلغاء الخطة"));
                }}>{t("Cancel plan", "إلغاء الخطة")}</Button>
              )}
              <div className="ms-auto"><Button size="sm" variant="ghost" onClick={onClose}>{t("Close", "إغلاق")}</Button></div>
            </div>
          )}

          {reschedOpen && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Reschedule remaining installments", "إعادة جدولة الأقساط المتبقية")}</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <Label>{t("New first due date", "تاريخ أول قسط")}</Label>
                  <Input type="date" className="mt-1.5" value={reschedDate} onChange={(e) => setReschedDate(e.target.value)}/>
                </div>
                <div>
                  <Label>{t("Gap (months)", "الفاصل بالشهور")}</Label>
                  <Input type="number" min={1} max={6} className="mt-1.5" value={reschedGap} onChange={(e) => setReschedGap(Math.max(1, Math.min(6, Number(e.target.value) || 1)))}/>
                </div>
                <div className="flex items-end">
                  <Button size="sm" variant="gold" disabled={busy || !reschedDate} onClick={() =>
                    doAction(() => rescheduleFn({ data: { plan_id: planId, first_due_date: reschedDate, gap_months: reschedGap } }), t("Rescheduled", "تمت إعادة الجدولة"))
                  }>{t("Apply", "تطبيق")}</Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{t("Paid installments are not affected — full audit trail is preserved via the activity log.", "الأقساط المدفوعة لا تتأثر ويتم الحفاظ على سجل التدقيق.")}</div>
            </div>
          )}
        </div>
      )}
    </DialogContent>
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

function PaymentPlanDialog({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const { locale } = useI18n();
  const listClientsFn = useServerFn(listClients);
  const saveClientFn = useServerFn(saveClient);
  const listUnpaidFn = useServerFn(listUnpaidInvoicesForClient);
  const createPlanFn = useServerFn(createPaymentPlan);

  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [addingNew, setAddingNew] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selInv, setSelInv] = useState<Record<string, boolean>>({});
  const [installments, setInstallments] = useState<3 | 6 | 12>(3);
  const [firstDue, setFirstDue] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10);
  });
  const [description, setDescription] = useState("");
  const [createDebt, setCreateDebt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingInv, setLoadingInv] = useState(false);

  useEffect(() => { listClientsFn().then((c: any) => setClients(c ?? [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!clientId) { setInvoices([]); setSelInv({}); return; }
    setLoadingInv(true);
    listUnpaidFn({ data: { client_id: clientId } })
      .then((rows: any) => { setInvoices(rows ?? []); setSelInv(Object.fromEntries((rows ?? []).map((r: any) => [r.id, true]))); })
      .catch((e: any) => toast.error(e.message))
      .finally(() => setLoadingInv(false));
  }, [clientId]);

  const client = clients.find((c) => c.id === clientId);
  const selectedInvoices = invoices.filter((i) => selInv[i.id]);
  const total = selectedInvoices.reduce((a, i) => a + Number(i._remaining), 0);
  const perInstallment = total > 0 ? total / installments : 0;

  async function createClient() {
    if (!newClient.name.trim()) return;
    try {
      const row: any = await saveClientFn({ data: { name: newClient.name, phone: newClient.phone, email: newClient.email || "", type: "individual", status: "active" } });
      toast.success(locale === "ar" ? "تمت الإضافة" : "Client added");
      const refreshed: any = await listClientsFn();
      setClients(refreshed ?? []);
      setClientId(row.id);
      setAddingNew(false);
      setNewClient({ name: "", phone: "", email: "" });
    } catch (e: any) { toast.error(e.message); }
  }

  async function submit() {
    if (!clientId || !client) { toast.error("Select a client"); return; }
    const ids = Object.keys(selInv).filter((k) => selInv[k]);
    if (ids.length === 0) { toast.error("Select at least one invoice"); return; }
    if (!firstDue) { toast.error("First due date required"); return; }
    setSaving(true);
    try {
      const res: any = await createPlanFn({ data: {
        client_id: clientId, client_name: client.name, invoice_ids: ids,
        installments, first_due_date: firstDue, description, create_debt_case: createDebt,
      } });
      toast.success(locale === "ar" ? `تم إنشاء خطة من ${res.count} أقساط` : `Created ${res.count}-installment plan`);
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{locale === "ar" ? "خطة سداد جديدة" : "New payment plan"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {/* Client selector */}
        <div>
          <Label>{locale === "ar" ? "العميل" : "Client"}</Label>
          {addingNew ? (
            <div className="mt-1.5 space-y-2 rounded-md border p-3">
              <Input placeholder={locale === "ar" ? "الاسم" : "Name"} value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}/>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={locale === "ar" ? "الهاتف" : "Phone"} value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}/>
                <Input placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}/>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button>
                <Button size="sm" variant="gold" onClick={createClient} disabled={!newClient.name.trim()}>{locale === "ar" ? "إضافة العميل" : "Add client"}</Button>
              </div>
            </div>
          ) : (
            <div className="mt-1.5 flex gap-2">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder={locale === "ar" ? "اختر عميلاً" : "Select client"}/></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setAddingNew(true)}><Plus className="size-4"/>{locale === "ar" ? "جديد" : "New"}</Button>
            </div>
          )}
        </div>

        {/* Invoices */}
        {clientId && (
          <div>
            <Label>{locale === "ar" ? "الفواتير غير المسددة" : "Unpaid invoices"}</Label>
            <div className="mt-1.5 max-h-56 overflow-auto rounded-md border">
              {loadingInv ? <div className="p-4 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin"/></div>
                : invoices.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">{locale === "ar" ? "لا توجد فواتير غير مسددة." : "No unpaid invoices for this client."}</div>
                : (
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {invoices.map((i) => (
                        <tr key={i.id} className="hover:bg-secondary/40">
                          <td className="w-8 px-2"><Checkbox checked={!!selInv[i.id]} onCheckedChange={(v) => setSelInv({ ...selInv, [i.id]: !!v })}/></td>
                          <td className="px-2 py-2 font-medium">{i.number}</td>
                          <td className="px-2 py-2 text-muted-foreground">{i.due_date || i.issue_date}</td>
                          <td className="px-2 py-2 text-end font-mono tabular-nums">{fmt(i._remaining, i.currency)}</td>
                          <td className="px-2 py-2"><StatusBadge status={i.status}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        )}

        {/* Installments */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{locale === "ar" ? "عدد الأقساط" : "Split into"}</Label>
            <div className="mt-1.5 flex gap-2">
              {[3, 6, 12].map((n) => (
                <Button key={n} type="button" size="sm" variant={installments === n ? "gold" : "outline"} onClick={() => setInstallments(n as 3 | 6 | 12)}>{n}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label>{locale === "ar" ? "استحقاق أول قسط" : "First due date"}</Label>
            <Input type="date" className="mt-1.5" value={firstDue} onChange={(e) => setFirstDue(e.target.value)}/>
          </div>
        </div>

        <div>
          <Label>{locale === "ar" ? "وصف" : "Description (optional)"}</Label>
          <Input className="mt-1.5" value={description} onChange={(e) => setDescription(e.target.value)}/>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={createDebt} onCheckedChange={(v) => setCreateDebt(!!v)}/>
          {locale === "ar" ? "إنشاء ملف تحصيل تلقائي بالتذكيرات (قبل 3 أيام، عند الاستحقاق، والتأخر)" : "Auto-create debt collection case with reminders (3 days before, on due, overdue)"}
        </label>

        {/* Summary */}
        {total > 0 && (
          <div className="rounded-md border bg-secondary/40 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "الإجمالي" : "Total"}</span><span className="font-mono tabular-nums">{fmt(total, selectedInvoices[0]?.currency || "USD")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "كل قسط" : "Per installment"}</span><span className="font-mono tabular-nums">{fmt(perInstallment, selectedInvoices[0]?.currency || "USD")}</span></div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button>
        <Button variant="gold" onClick={submit} disabled={saving || !clientId || total <= 0}>{saving && <Loader2 className="size-4 animate-spin"/>}{locale === "ar" ? "إنشاء الخطة" : "Create plan"}</Button>
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
  const sweep = useServerFn(sweepOverdueInvoices);
  const setStatusFn = useServerFn(setInvoiceStatus);
  const markPaidFn = useServerFn(markInvoicePaid);
  const [rows, setRows] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payBusy, setPayBusy] = useState(false);

  async function load() {
    if (!org) return;
    try { await sweep(); } catch { /* non-fatal */ }
    const { data } = await supabase.from("tax_invoices").select("*").eq("org_id", org.id).order("created_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, [org?.id]);

  async function remove(id: string) { if (!confirm("Delete?")) return; await supabase.from("tax_invoices").delete().eq("id", id); load(); }
  async function changeStatus(id: string, next: "issued" | "void" | "paid") {
    try { await setStatusFn({ data: { id, status: next } }); toast.success(locale === "ar" ? "تم التحديث" : "Updated"); load(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function confirmMarkPaid() {
    if (!payTarget) return;
    setPayBusy(true);
    try {
      await markPaidFn({ data: { id: payTarget.id, paid_at: payDate, method: "bank_transfer" } });
      toast.success(locale === "ar" ? "تم تعليمها كمدفوعة" : "Marked as paid");
      setPayTarget(null); load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setPayBusy(false); }
  }

  const statuses = useMemo(() => ["all", "draft", "issued", "partial", "paid", "overdue", "void"], []);
  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.client_name ?? "").toLowerCase().includes(s) || (r.number ?? "").toLowerCase().includes(s);
  }), [rows, q, status]);
  const overdueCount = rows.filter((r) => r.status === "overdue").length;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="text-sm font-semibold mr-auto">
            {locale === "ar" ? "الفواتير الضريبية" : "Tax invoices"}
            <span className="ms-2 text-xs font-normal text-muted-foreground">({filtered.length}/{rows.length})</span>
            {overdueCount > 0 && (
              <button onClick={() => setStatus("overdue")} className="ms-3 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/20">
                <XCircle className="size-3" /> {overdueCount} {locale === "ar" ? "متأخرة" : "overdue"}
              </button>
            )}
          </div>
          <TableFilter q={q} setQ={setQ} status={status} setStatus={setStatus} statuses={statuses} placeholder={locale === "ar" ? "ابحث برقم/عميل…" : "Search by #/client…"} locale={locale as any} />
          {can("edit_financials") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4"/>{locale === "ar" ? "فاتورة جديدة" : "New invoice"}</Button></DialogTrigger>
              <DocFormDialog kind="invoice" onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />
            </Dialog>
          )}
        </div>
        {loading ? <Loading/> : filtered.length === 0 ? <Empty msg={locale === "ar" ? "لا نتائج." : "No matches."}/> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><Th>#</Th><Th>{locale === "ar" ? "العميل" : "Client"}</Th><Th>{locale === "ar" ? "الإصدار" : "Issued"}</Th><Th>{locale === "ar" ? "الاستحقاق" : "Due"}</Th><Th className="text-end">{locale === "ar" ? "الإجمالي" : "Total"}</Th><Th className="text-end">{locale === "ar" ? "المدفوع" : "Paid"}</Th><Th>{locale === "ar" ? "الحالة" : "Status"}</Th><Th></Th></tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <Td className="font-mono text-xs">{r.number}</Td><Td className="font-medium">{r.client_name}</Td>
                  <Td>{r.issue_date}</Td>
                  <Td className={r.status === "overdue" ? "text-destructive font-semibold" : "text-muted-foreground"}>{r.due_date || "—"}</Td>
                  <Td className="text-end font-mono tabular-nums">{fmt(r.total, r.currency)}</Td>
                  <Td className="text-end font-mono tabular-nums">{fmt(r.amount_paid, r.currency)}</Td>
                  <Td><StatusBadge status={r.status}/></Td>
                  <Td className="text-end whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => setPreview(r)} title="Preview"><Eye className="size-4"/></Button>
                    <Button size="icon" variant="ghost" onClick={() => downloadInvoicePdf("invoice", r, org as any)} title={locale === "ar" ? "تنزيل PDF" : "Download PDF"}><Download className="size-4"/></Button>
                    {can("edit_financials") && r.status === "draft" && (
                      <Button size="icon" variant="ghost" onClick={() => changeStatus(r.id, "issued")} title={locale === "ar" ? "إرسال" : "Send"}><Send className="size-4 text-primary" /></Button>
                    )}
                    {can("edit_financials") && (r.status === "issued" || r.status === "overdue" || r.status === "partial") && (
                      <Button size="icon" variant="ghost" onClick={() => { setPayTarget(r); setPayDate(new Date().toISOString().slice(0,10)); }} title={locale === "ar" ? "مدفوع" : "Paid"}><CheckCircle2 className="size-4 text-emerald-600" /></Button>
                    )}
                    {can("edit_financials") && r.status !== "void" && r.status !== "paid" && (
                      <Button size="icon" variant="ghost" onClick={() => changeStatus(r.id, "void")} title={locale === "ar" ? "إلغاء" : "Cancel"}><XCircle className="size-4 text-amber-600" /></Button>
                    )}
                    {can("delete_financials") && <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive"/></Button>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {preview && <DocumentPreview kind="invoice" doc={preview} onClose={() => setPreview(null)} />}

      <Dialog open={!!payTarget} onOpenChange={(o) => { if (!o) setPayTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{locale === "ar" ? "تعليم الفاتورة كمدفوعة" : "Mark invoice as paid"}</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-secondary/40 p-3 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">#</span><span className="font-mono">{payTarget.number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "العميل" : "Client"}</span><span className="font-medium">{payTarget.client_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "الاستحقاق" : "Due"}</span><span>{payTarget.due_date || "—"}</span></div>
                <div className="flex justify-between border-t pt-1 font-semibold"><span>{locale === "ar" ? "المتبقي" : "Remaining"}</span><span className="font-mono">{fmt(Number(payTarget.total) - Number(payTarget.amount_paid || 0), payTarget.currency)}</span></div>
              </div>
              <div>
                <Label>{locale === "ar" ? "تاريخ الدفع" : "Payment date"}</Label>
                <Input type="date" className="mt-1.5" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                {locale === "ar" ? "سيتم تسجيل الدفعة وتحديث حالة الفاتورة إلى مدفوعة." : "A payment will be recorded and the invoice status will be set to paid."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayTarget(null)}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={confirmMarkPaid} disabled={payBusy}>
              {payBusy && <Loader2 className="size-4 animate-spin me-1.5"/>}
              {locale === "ar" ? "تأكيد الدفع" : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

// ---------- DRAFT INVOICES (proforma) ----------
type SortKey = "issue_date" | "due_date" | "client_name" | "total" | "status";
type SortDir = "asc" | "desc";

function SortableTh({ label, k, sort, setSort }: { label: string; k: SortKey; sort: { key: SortKey; dir: SortDir }; setSort: (s: { key: SortKey; dir: SortDir }) => void }) {
  const active = sort.key === k;
  return (
    <th className="px-5 py-3 text-start font-medium">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort({ key: k, dir: active && sort.dir === "asc" ? "desc" : "asc" })}
      >
        {label}
        {!active && <ArrowUpDown className="size-3 opacity-50" />}
        {active && (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );
}

function DraftInvoicesTab() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { can, org } = useOrg();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const listFn = useServerFn(listDraftInvoices);
  const acceptFn = useServerFn(acceptDraftInvoice);
  const bulkAcceptFn = useServerFn(bulkAcceptDraftInvoices);
  const rejectFn = useServerFn(rejectDraftInvoice);
  const deleteFn = useServerFn(deleteDraftInvoice);
  const getEntries = useServerFn(getTimeEntriesByIds);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "issue_date", dir: "desc" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [pendingAccept, setPendingAccept] = useState<any | null>(null);
  const [acceptDueDate, setAcceptDueDate] = useState("");
  const [acceptEntries, setAcceptEntries] = useState<any[] | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDue, setBulkDue] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const q = search.q;
  const status = search.status;
  const dueFrom = search.dueFrom;
  const dueTo = search.dueTo;
  const payment = search.payment;
  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ to: "/app/financials", search: { ...search, ...patch } });

  async function load() {
    setLoading(true);
    try { setRows((await listFn()) as any[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!pendingAccept) { setAcceptEntries(null); setAcceptDueDate(""); return; }
    setAcceptDueDate(pendingAccept.due_date ?? "");
    const ids: string[] = pendingAccept.time_entry_ids ?? [];
    if (ids.length === 0) { setAcceptEntries([]); return; }
    setAcceptEntries(null);
    getEntries({ data: { ids } })
      .then((r) => setAcceptEntries(r as any[]))
      .catch(() => setAcceptEntries([]));
  }, [pendingAccept]);

  const filtered = useMemo(() => {
    let out = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (dueFrom && (!r.due_date || r.due_date < dueFrom)) return false;
      if (dueTo && (!r.due_date || r.due_date > dueTo)) return false;
      if (payment === "paid" && r.status !== "accepted") return false;
      if (payment === "unpaid" && r.status === "accepted") return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (r.client_name ?? "").toLowerCase().includes(s) || (r.notes ?? "").toLowerCase().includes(s);
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = a[sort.key]; const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return out;
  }, [rows, q, status, dueFrom, dueTo, payment, sort]);

  const selectableIds = useMemo(() => filtered.filter((r) => r.status === "draft").map((r) => r.id), [filtered]);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selectableIds.some((id) => selected.has(id));
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableIds));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  async function accept(row: any) {
    setBusyId(row.id);
    try {
      await acceptFn({ data: { id: row.id, due_date: acceptDueDate || null } });
      toast.success(ar ? "تم قبول الفاتورة وتحويلها إلى فاتورة ضريبية" : "Accepted — moved to Tax invoices");
      setPendingAccept(null); load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  }
  async function reject(row: any) {
    setBusyId(row.id);
    try { await rejectFn({ data: { id: row.id } }); toast.success(ar ? "تم الرفض" : "Rejected"); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  }
  async function remove(row: any) {
    setBusyId(row.id);
    try { await deleteFn({ data: { id: row.id } }); toast.success(ar ? "تم الحذف" : "Deleted"); setPendingDelete(null); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  }
  async function runBulkAccept() {
    setBulkBusy(true);
    try {
      const ids = Array.from(selected).filter((id) => selectableIds.includes(id));
      const res = (await bulkAcceptFn({ data: { ids, due_date: bulkDue || null } })) as any[];
      const ok = res.filter((r) => r.ok).length;
      const fail = res.length - ok;
      toast.success(ar ? `تم قبول ${ok} من ${res.length}` : `Accepted ${ok} of ${res.length}${fail ? ` (${fail} failed)` : ""}`);
      setSelected(new Set()); setBulkOpen(false); setBulkDue(""); load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBulkBusy(false); }
  }

  const acceptEntryIds = (pendingAccept?.time_entry_ids ?? []) as string[];

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="text-sm font-semibold mr-auto">
            {ar ? "الفواتير (مسودات)" : "Invoices (drafts)"}
            <span className="ms-2 text-xs font-normal text-muted-foreground">({filtered.length}/{rows.length})</span>
          </div>
          {selected.size > 0 && can("edit_financials") && (
            <Button size="sm" variant="gold" onClick={() => setBulkOpen(true)}>
              <Check className="size-4" /> {ar ? `قبول ${selected.size}` : `Accept ${selected.size}`}
            </Button>
          )}
          <TableFilter q={q} setQ={(v) => setSearch({ q: v })} status={status} setStatus={(v) => setSearch({ status: v })}
            statuses={["all", "draft", "accepted", "rejected"]}
            placeholder={ar ? "ابحث بالعميل أو الملاحظات…" : "Search by client or notes…"} locale={locale as any} />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b bg-secondary/20 px-4 py-2 text-xs">
          <span className="text-muted-foreground">{ar ? "الاستحقاق" : "Due"}</span>
          <Input type="date" value={dueFrom} onChange={(e) => setSearch({ dueFrom: e.target.value })} className="h-8 w-40" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" value={dueTo} onChange={(e) => setSearch({ dueTo: e.target.value })} className="h-8 w-40" />
          <span className="ms-4 text-muted-foreground">{ar ? "الدفع" : "Payment"}</span>
          <div className="flex gap-1">
            {(["all", "paid", "unpaid"] as const).map((p) => (
              <Button key={p} size="sm" variant={payment === p ? "default" : "ghost"} className="h-7 px-2 capitalize" onClick={() => setSearch({ payment: p })}>
                {p === "all" ? (ar ? "الكل" : "All") : p === "paid" ? (ar ? "مدفوعة" : "Paid") : (ar ? "غير مدفوعة" : "Unpaid")}
              </Button>
            ))}
          </div>
          {(dueFrom || dueTo || payment !== "all" || status !== "all" || q) && (
            <Button size="sm" variant="ghost" className="h-7 px-2 ms-auto" onClick={() => setSearch({ q: "", status: "all", dueFrom: "", dueTo: "", payment: "all" })}>
              <X className="size-3" /> {ar ? "مسح" : "Clear"}
            </Button>
          )}
        </div>
        {loading ? <Loading/> : filtered.length === 0 ? <Empty msg={ar ? "لا مسودات. أنشئ واحدة من تتبع الوقت." : "No drafts yet. Create one from Time tracking."}/> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 w-8">
                  <Checkbox checked={allSelected ? true : someSelected ? ("indeterminate" as any) : false} onCheckedChange={toggleAll} disabled={selectableIds.length === 0} />
                </th>
                <SortableTh label={ar ? "الإصدار" : "Issued"} k="issue_date" sort={sort} setSort={setSort} />
                <SortableTh label={ar ? "العميل" : "Client"} k="client_name" sort={sort} setSort={setSort} />
                <SortableTh label={ar ? "الاستحقاق" : "Due"} k="due_date" sort={sort} setSort={setSort} />
                <SortableTh label={ar ? "الإجمالي" : "Total"} k="total" sort={sort} setSort={setSort} />
                <SortableTh label={ar ? "الحالة" : "Status"} k="status" sort={sort} setSort={setSort} />
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <Td>
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
                      disabled={r.status !== "draft"}
                    />
                  </Td>
                  <Td>{r.issue_date}</Td>
                  <Td className="font-medium">{r.client_name}</Td>
                  <Td className="text-muted-foreground">{r.due_date || "—"}</Td>
                  <Td className="text-end font-mono tabular-nums">{fmt(r.total, r.currency)}</Td>
                  <Td><StatusBadge status={r.status}/></Td>
                  <Td className="text-end whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => setPreview({ ...r, number: r.id.slice(0, 8).toUpperCase() })} title={ar ? "معاينة" : "Preview"}><Eye className="size-4"/></Button>
                    <Button size="icon" variant="ghost" onClick={() => downloadInvoicePdf("invoice", { ...r, number: r.id.slice(0,8).toUpperCase() }, org as any)} title={ar ? "تنزيل PDF" : "Download PDF"}><Download className="size-4"/></Button>
                    {can("edit_financials") && r.status === "draft" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setPendingAccept(r)} disabled={busyId === r.id} title={ar ? "قبول" : "Accept"}>
                          <Check className="size-4 text-emerald-600"/>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => reject(r)} disabled={busyId === r.id} title={ar ? "رفض" : "Reject"}>
                          <XCircle className="size-4 text-amber-600"/>
                        </Button>
                      </>
                    )}
                    {can("delete_financials") && (
                      <Button size="icon" variant="ghost" onClick={() => setPendingDelete(r)} disabled={busyId === r.id}><Trash2 className="size-4 text-destructive"/></Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? `قبول ${selected.size} مسودة` : `Accept ${selected.size} drafts`}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {ar ? "سيتم تحويل جميع المسودات المحددة إلى فواتير ضريبية بأرقام متسلسلة." : "All selected drafts will be converted into tax invoices with sequential numbers."}
            </p>
            <div>
              <Label>{ar ? "تاريخ استحقاق موحد (اختياري)" : "Uniform due date (optional)"}</Label>
              <Input type="date" className="mt-1.5" value={bulkDue} onChange={(e) => setBulkDue(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">{ar ? "اتركه فارغاً لاستخدام تاريخ استحقاق كل مسودة." : "Leave blank to keep each draft's own due date."}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={runBulkAccept} disabled={bulkBusy}>
              {bulkBusy && <Loader2 className="size-4 animate-spin me-1.5"/>}
              {ar ? "قبول الكل" : "Accept all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {preview && <DocumentPreview kind="invoice" doc={{ ...preview, tax_rate: preview.tax_rate ?? 0 }} onClose={() => setPreview(null)} />}

      <Dialog open={!!pendingAccept} onOpenChange={(o) => { if (!o) setPendingAccept(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{ar ? "قبول المسودة وتحويلها إلى فاتورة ضريبية" : "Accept draft & convert to tax invoice"}</DialogTitle>
          </DialogHeader>
          {pendingAccept && (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="rounded-lg border bg-secondary/40 p-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "العميل" : "Client"}</span><span className="font-medium">{pendingAccept.client_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الإصدار" : "Issued"}</span><span>{pendingAccept.issue_date}</span></div>
                <div className="flex justify-between border-t pt-1 font-semibold"><span>{ar ? "الإجمالي" : "Total"}</span><span className="font-mono">{fmt(pendingAccept.total, pendingAccept.currency)}</span></div>
              </div>

              <div>
                <Label>{ar ? "تاريخ الاستحقاق (اختياري)" : "Due date (optional)"}</Label>
                <Input type="date" className="mt-1.5" value={acceptDueDate} onChange={(e) => setAcceptDueDate(e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {ar ? "يمكنك تعديل تاريخ الاستحقاق قبل الإصدار. ستتمكن من وضع علامة مدفوعة بعد القبول." : "You can adjust the due date before issuing. You'll be able to mark it as paid after acceptance."}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>{ar ? "البنود" : "Line items"}</Label>
                  <span className="text-xs text-muted-foreground">{(pendingAccept.items ?? []).length}</span>
                </div>
                <div className="rounded-lg border divide-y">
                  {(pendingAccept.items ?? []).map((it: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1"><div className="truncate">{it.description || "—"}</div><div className="text-xs text-muted-foreground">{it.quantity} × {fmt(Number(it.unit_price), pendingAccept.currency)}</div></div>
                      <div className="font-mono tabular-nums">{fmt(Number(it.quantity) * Number(it.unit_price), pendingAccept.currency)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {acceptEntryIds.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>{ar ? "سجلات الوقت المصدر" : "Source time entries"}</Label>
                    <Link
                      to="/app/time"
                      search={{ ids: acceptEntryIds.join(",") } as any}
                      onClick={() => setPendingAccept(null)}
                      className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
                    >
                      <ExternalLink className="size-3" /> {ar ? "عرض في تتبع الوقت" : "View in Time tracking"}
                    </Link>
                  </div>
                  <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                    {acceptEntries === null ? (
                      <div className="p-4 text-center text-xs text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin" /></div>
                    ) : acceptEntries.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">{ar ? "لم يعد بالإمكان الوصول للسجلات." : "Source entries no longer available."}</div>
                    ) : acceptEntries.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{e.description || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(e.started_at).toLocaleDateString()} · {e.cases?.title ?? "—"} · {e.clients?.name ?? "—"}
                          </div>
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground">{(e.duration_seconds / 3600).toFixed(2)} h</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {ar ? "سيتم إنشاء فاتورة ضريبية رسمية برقم متسلسل. لا يمكن التراجع." : "An official tax invoice will be created with a sequential number. This cannot be undone."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingAccept(null)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="outline" onClick={() => pendingAccept && setPreview({ ...pendingAccept, number: pendingAccept.id.slice(0, 8).toUpperCase() })}>
              <Eye className="size-4"/> {ar ? "معاينة كاملة" : "Full preview"}
            </Button>
            <Button variant="gold" onClick={() => pendingAccept && accept(pendingAccept)} disabled={busyId === pendingAccept?.id}>
              {busyId === pendingAccept?.id && <Loader2 className="size-4 animate-spin me-1.5"/>}
              {ar ? "قبول وتحويل" : "Accept & convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "حذف المسودة؟" : "Delete draft?"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {ar ? "سيتم حذف هذه المسودة نهائياً." : "This draft will be permanently deleted."}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => pendingDelete && remove(pendingDelete)} disabled={busyId === pendingDelete?.id}>
              {busyId === pendingDelete?.id && <Loader2 className="size-4 animate-spin me-1.5"/>}
              {ar ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


function CollectionsTab() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const listFn = useServerFn(listOrgDebtPayments);
  const { data: rows, isLoading } = useCollectionsQuery(listFn);
  const [q, setQ] = useState("");

  const totals = (rows ?? []).reduce((a, r: any) => ({
    received: a.received + Number(r.amount_received || 0),
    fee: a.fee + Number(r.service_fee || 0),
    forwarded: a.forwarded + Number(r.amount_forwarded || 0),
  }), { received: 0, fee: 0, forwarded: 0 });

  const filtered = (rows ?? []).filter((r: any) =>
    !q || r.debt_cases?.title?.toLowerCase().includes(q.toLowerCase())
      || r.debt_case_payers?.name?.toLowerCase().includes(q.toLowerCase())
      || r.forwarder_name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="text-sm font-semibold mr-auto">
          {ar ? "مدفوعات تحصيل الديون" : "Debt collection payments"}
          <span className="ms-2 text-xs font-normal text-muted-foreground">({filtered.length})</span>
        </div>
        <div className="text-xs text-muted-foreground flex gap-4">
          <span>{ar ? "المُستلم" : "Received"}: <b className="text-foreground">{totals.received.toFixed(2)}</b></span>
          <span>{ar ? "المُحوَّل" : "Forwarded"}: <b className="text-foreground">{totals.forwarded.toFixed(2)}</b></span>
          <span>{ar ? "الرسوم" : "Fees"}: <b className="text-gold">{totals.fee.toFixed(2)}</b></span>
        </div>
        <div className="relative w-56">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "بحث…" : "Search…"} className="h-9 ps-9" />
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to="/app/debt-collection">{ar ? "إدارة القضايا" : "Manage cases"}</Link>
        </Button>
      </div>
      {isLoading ? <Loading /> : filtered.length === 0 ? <Empty msg={ar ? "لا مدفوعات تحصيل" : "No collection payments yet"} /> : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <Th>{ar ? "التاريخ" : "Date"}</Th>
              <Th>{ar ? "القضية" : "Case"}</Th>
              <Th>{ar ? "الدافع" : "Payer"}</Th>
              <Th className="text-end">{ar ? "المُستلم" : "Received"}</Th>
              <Th className="text-end">{ar ? "الرسوم" : "Fee"}</Th>
              <Th className="text-end">{ar ? "المُحوَّل" : "Forwarded"}</Th>
              <Th>{ar ? "المستلم النهائي" : "Forwarder"}</Th>
              <Th>{ar ? "الطريقة" : "Method"}</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r: any) => (
              <tr key={r.id} className="hover:bg-secondary/40">
                <Td>{r.paid_at}</Td>
                <Td>
                  {r.debt_cases ? (
                    <Link to="/app/debt-collection/$id" params={{ id: r.debt_cases.id }} className="font-medium hover:text-gold">{r.debt_cases.title}</Link>
                  ) : "—"}
                </Td>
                <Td>{r.debt_case_payers?.name ?? "—"}</Td>
                <Td className="text-end font-mono tabular-nums">{Number(r.amount_received).toFixed(2)} {r.currency}</Td>
                <Td className="text-end font-mono tabular-nums text-gold">{Number(r.service_fee).toFixed(2)}</Td>
                <Td className="text-end font-mono tabular-nums">{Number(r.amount_forwarded).toFixed(2)}</Td>
                <Td>{r.forwarder_name ?? "—"}</Td>
                <Td className="capitalize">{r.method.replace("_", " ")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function useCollectionsQuery(fn: () => Promise<any>) {
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fn().then((rows) => { if (!cancelled) { setData(rows); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { data, isLoading };
}

export { DocumentHeader };
