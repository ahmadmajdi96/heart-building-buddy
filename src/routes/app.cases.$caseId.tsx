import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCase, addCaseEvent, deleteCaseEvent, closeCase, saveCase } from "@/lib/cases.functions";
import { saveDraftInvoice } from "@/lib/draft-invoices.functions";
import { createDocument, getSignedDownloadUrl, deleteDocument } from "@/lib/documents.functions";
import { saveAppointment } from "@/lib/appointments.functions";
import { saveDeadline, completeDeadline, deleteDeadline } from "@/lib/deadlines.functions";
import { listParties, saveParty, deleteParty, listNotes, addNote, deleteNote } from "@/lib/case-extras.functions";
import { listCaseMembers, addCaseMember, removeCaseMember, updateCaseMemberRole, listAssignableUsers } from "@/lib/case-members.functions";
import { supabase } from "@/integrations/supabase/client";
import { DocumentPreviewBody } from "@/components/documents/preview-body";
import { ArrowLeft, Loader2, Trash2, Upload, Download, Eye, Plus, Calendar as CalIcon, FileText, Users, StickyNote, ClipboardList, UserPlus, Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/cases/$caseId")({ component: CaseProfilePage });

function CaseProfilePage() {
  const { caseId } = Route.useParams();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const get = useServerFn(getCase);
  const [data, setData] = useState<Awaited<ReturnType<typeof getCase>> | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setData(await get({ data: { id: caseId } })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [caseId]);

  if (loading) return <div className="grid place-items-center p-12"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  if (!data?.case) return (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">{locale === "ar" ? "القضية غير موجودة" : "Case not found"}</p>
      <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: "/app/cases" })}>{locale === "ar" ? "رجوع" : "Back"}</Button>
    </div>
  );

  const c = data.case;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/cases" className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-4" />{locale === "ar" ? "كل القضايا" : "All cases"}</Link>
      </div>
      <PageHeader
        title={c.title}
        subtitle={[c.case_number && `#${c.case_number}`, c.court, c.jurisdiction].filter(Boolean).join(" · ") || undefined}
        actions={<div className="flex items-center gap-2">
          <StatusBadge status={c.status} />
          {!["closed","won","lost"].includes(c.status) && <CloseCaseButton caseId={caseId} onDone={refresh} />}
        </div>}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full flex-wrap gap-1 bg-card border h-auto p-1">
          <TabsTrigger value="overview" className="gap-1.5"><ClipboardList className="size-3.5" />{locale === "ar" ? "نظرة عامة" : "Overview"}</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5"><CalIcon className="size-3.5" />{locale === "ar" ? "الجلسات" : "Sessions"}</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="size-3.5" />{locale === "ar" ? "المستندات" : "Documents"}</TabsTrigger>
          <TabsTrigger value="parties" className="gap-1.5"><Users className="size-3.5" />{locale === "ar" ? "الأطراف" : "Parties"}</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><UserPlus className="size-3.5" />{locale === "ar" ? "الفريق" : "Team"}</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="size-3.5" />{locale === "ar" ? "الملاحظات" : "Notes"}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab data={data} onChange={refresh} />
        </TabsContent>
        <TabsContent value="sessions" className="mt-6">
          <SessionsTab caseId={caseId} data={data} onChange={refresh} />
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <DocumentsTab caseId={caseId} docs={data.documents} onChange={refresh} />
        </TabsContent>
        <TabsContent value="parties" className="mt-6">
          <PartiesTab caseId={caseId} />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <TeamTab caseId={caseId} />
        </TabsContent>
        <TabsContent value="notes" className="mt-6">
          <NotesTab caseId={caseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CloseCaseButton({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const close = useServerFn(closeCase);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<"won" | "lost" | "settled" | "withdrawn" | "other">("settled");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await close({ data: { id: caseId, result, note: note || undefined } });
      toast.success(ar ? "تم إغلاق القضية" : "Case closed");
      setOpen(false); onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{ar ? "إغلاق القضية" : "Close case"}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "إغلاق القضية" : "Close case"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{ar ? "النتيجة" : "Result"}</Label>
              <Select value={result} onValueChange={(v: any) => setResult(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="won">{ar ? "ربح" : "Won"}</SelectItem>
                  <SelectItem value="lost">{ar ? "خسارة" : "Lost"}</SelectItem>
                  <SelectItem value="settled">{ar ? "تسوية" : "Settled"}</SelectItem>
                  <SelectItem value="withdrawn">{ar ? "سحب" : "Withdrawn"}</SelectItem>
                  <SelectItem value="other">{ar ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{ar ? "ملاحظة (اختياري)" : "Note (optional)"}</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={submit} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin me-1.5" />}{ar ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



function OverviewTab({ data, onChange }: { data: NonNullable<Awaited<ReturnType<typeof getCase>>>; onChange: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const c = data.case! as any;
  const save = useServerFn(saveCase);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricing, setPricing] = useState({
    agreed_fee: c.agreed_fee ?? "", retainer_amount: c.retainer_amount ?? "",
    hourly_rate: c.hourly_rate ?? "", fee_currency: c.fee_currency ?? "JOD",
  });
  const [savingPricing, setSavingPricing] = useState(false);
  async function submitPricing() {
    setSavingPricing(true);
    try {
      await save({ data: {
        id: c.id, title: c.title, status: c.status, priority: c.priority ?? "medium",
        agreed_fee: pricing.agreed_fee === "" ? null : Number(pricing.agreed_fee),
        retainer_amount: pricing.retainer_amount === "" ? null : Number(pricing.retainer_amount),
        hourly_rate: pricing.hourly_rate === "" ? null : Number(pricing.hourly_rate),
        fee_currency: pricing.fee_currency,
      }});
      toast.success(ar ? "تم حفظ التسعير" : "Pricing saved");
      setPricingOpen(false); onChange();
    } catch (e) { toast.error((e as Error).message); } finally { setSavingPricing(false); }
  }

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-[160px_1fr] gap-3 py-2 border-b last:border-b-0">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
  const billableHours = data.timeEntries.filter((t: any) => t.billable).reduce((s: number, t: any) => s + Number(t.duration_seconds || 0), 0) / 3600;
  const cur = c.fee_currency ?? "";
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="card-elev rounded-xl border bg-card p-5 md:col-span-2">
        <h3 className="font-serif text-lg mb-3">{ar ? "تفاصيل القضية" : "Case details"}</h3>
        <Row label={ar ? "الرقم" : "Reference"} value={c.case_number} />
        <Row label={ar ? "الموكل" : "Client"} value={c.clients?.name} />
        <Row label={ar ? "المحكمة" : "Court"} value={c.court} />
        <Row label={ar ? "القاعة" : "Court room"} value={c.court_room} />
        <Row label={ar ? "الاختصاص" : "Jurisdiction"} value={c.jurisdiction} />
        <Row label={ar ? "القاضي" : "Judge"} value={c.judge} />
        <Row label={ar ? "الطرف المعارض" : "Opposing party"} value={c.opposing_party} />
        <Row label={ar ? "محامي الخصم" : "Opposing counsel"} value={c.opposing_counsel} />
        <Row label={ar ? "الأولوية" : "Priority"} value={c.priority} />
        <Row label={ar ? "تاريخ الفتح" : "Opened"} value={c.opened_at ? new Date(c.opened_at).toLocaleDateString() : null} />
        {c.closed_at && <Row label={ar ? "تاريخ الإغلاق" : "Closed"} value={`${new Date(c.closed_at).toLocaleDateString()}${c.close_result ? ` — ${c.close_result}` : ""}`} />}
        {c.close_note && <Row label={ar ? "ملاحظة الإغلاق" : "Close note"} value={<p className="whitespace-pre-wrap">{c.close_note}</p>} />}
        <Row label={ar ? "الوصف" : "Description"} value={c.description ? <p className="whitespace-pre-wrap">{c.description}</p> : null} />
      </div>
      <div className="space-y-6">
        <div className="card-elev rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg">{ar ? "التسعير" : "Pricing"}</h3>
            <Button size="sm" variant="ghost" onClick={() => setPricingOpen(true)}>{ar ? "تعديل" : "Edit"}</Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "السعر المتفق" : "Agreed fee"}</span><span className="font-medium tabular-nums">{c.agreed_fee != null ? `${Number(c.agreed_fee).toFixed(2)} ${cur}` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الدفعة المقدمة" : "Retainer"}</span><span className="font-medium tabular-nums">{c.retainer_amount != null ? `${Number(c.retainer_amount).toFixed(2)} ${cur}` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الأجر بالساعة" : "Hourly rate"}</span><span className="font-medium tabular-nums">{c.hourly_rate != null ? `${Number(c.hourly_rate).toFixed(2)} ${cur}` : "—"}</span></div>
          </div>
        </div>
        <div className="card-elev rounded-xl border bg-card p-5">
          <h3 className="font-serif text-lg mb-3">{ar ? "ملخص" : "Summary"}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الجلسات" : "Sessions"}</span><span className="font-medium">{data.appointments.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "المستندات" : "Documents"}</span><span className="font-medium">{data.documents.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الأحداث" : "Events"}</span><span className="font-medium">{data.events.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "ساعات قابلة للفوترة" : "Billable hours"}</span><span className="font-medium">{billableHours.toFixed(1)}</span></div>
          </div>
        </div>
      </div>

      <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "تعديل التسعير" : "Edit pricing"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>{ar ? "السعر المتفق" : "Agreed fee"}</Label><Input type="number" step="0.01" value={pricing.agreed_fee} onChange={(e) => setPricing({ ...pricing, agreed_fee: e.target.value })} /></div>
            <div><Label>{ar ? "الدفعة المقدمة" : "Retainer"}</Label><Input type="number" step="0.01" value={pricing.retainer_amount} onChange={(e) => setPricing({ ...pricing, retainer_amount: e.target.value })} /></div>
            <div><Label>{ar ? "الأجر بالساعة" : "Hourly rate"}</Label><Input type="number" step="0.01" value={pricing.hourly_rate} onChange={(e) => setPricing({ ...pricing, hourly_rate: e.target.value })} /></div>
            <div><Label>{ar ? "العملة" : "Currency"}</Label><Input value={pricing.fee_currency} onChange={(e) => setPricing({ ...pricing, fee_currency: e.target.value.toUpperCase() })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPricingOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={submitPricing} disabled={savingPricing}>{savingPricing && <Loader2 className="size-4 animate-spin me-1.5" />}{ar ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoicesTab({ data, onChange }: { data: NonNullable<Awaited<ReturnType<typeof getCase>>>; onChange: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const invoices = data.invoices ?? [];
  const c = data.case as any;
  const save = useServerFn(saveDraftInvoice);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  type Line = { description: string; quantity: number; unit_price: number };
  const [form, setForm] = useState<{ due_date: string; tax_rate: string; notes: string; items: Line[] }>({
    due_date: "",
    tax_rate: "",
    notes: "",
    items: [{ description: "", quantity: 1, unit_price: 0 }],
  });

  function update(i: number, patch: Partial<Line>) {
    setForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));
  }
  const subtotal = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const taxAmt = subtotal * (Number(form.tax_rate) || 0) / 100;
  const total = subtotal + taxAmt;

  async function submit() {
    if (!c.clients?.name) {
      toast.error(ar ? "أضف موكلاً للقضية أولاً" : "Link this case to a client first");
      return;
    }
    if (form.items.every((it) => !it.description && !it.quantity && !it.unit_price)) {
      toast.error(ar ? "أضف بنداً واحداً على الأقل" : "Add at least one line item");
      return;
    }
    setSaving(true);
    try {
      await save({ data: {
        client_name: c.clients.name,
        client_id: c.client_id || null,
        case_id: c.id,
        due_date: form.due_date || null,
        tax_rate: form.tax_rate ? Number(form.tax_rate) : 0,
        items: form.items.map((it) => ({
          description: it.description || "",
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
        })),
        notes: form.notes || undefined,
      }});
      toast.success(ar ? "تم إنشاء مسودة الفاتورة" : "Draft invoice created");
      setOpen(false);
      setForm({ due_date: "", tax_rate: "", notes: "", items: [{ description: "", quantity: 1, unit_price: 0 }] });
      onChange();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {ar ? "المسودات تُقبل من صفحة الماليات لتصبح فواتير ضريبية." : "Drafts are accepted from Financials to become tax invoices."}
        </p>
        <Button size="sm" variant="gold" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-4" />{ar ? "مسودة فاتورة" : "New draft invoice"}
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="card-elev rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد فواتير لهذه القضية بعد." : "No invoices for this matter yet."}
        </div>
      ) : (
        <div className="card-elev rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-start font-medium">#</th>
                <th className="px-5 py-3 text-start font-medium">{ar ? "الإصدار" : "Issued"}</th>
                <th className="px-5 py-3 text-start font-medium">{ar ? "الاستحقاق" : "Due"}</th>
                <th className="px-5 py-3 text-end font-medium">{ar ? "الإجمالي" : "Total"}</th>
                <th className="px-5 py-3 text-end font-medium">{ar ? "المدفوع" : "Paid"}</th>
                <th className="px-5 py-3 text-start font-medium">{ar ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((iv: any) => (
                <tr key={iv.id} className="hover:bg-secondary/40">
                  <td className="px-5 py-3 font-mono text-xs">{iv.number}</td>
                  <td className="px-5 py-3">{iv.issue_date}</td>
                  <td className={`px-5 py-3 ${iv.status === "overdue" ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{iv.due_date || "—"}</td>
                  <td className="px-5 py-3 text-end font-mono">{Number(iv.total).toFixed(2)} {iv.currency}</td>
                  <td className="px-5 py-3 text-end font-mono">{Number(iv.amount_paid).toFixed(2)} {iv.currency}</td>
                  <td className="px-5 py-3"><StatusBadge status={iv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ar ? "مسودة فاتورة جديدة" : "New draft invoice"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="rounded-md border bg-secondary/40 p-3 text-sm">
              <div className="text-xs text-muted-foreground">{ar ? "الموكل" : "Client"}</div>
              <div className="font-medium">{c.clients?.name ?? (ar ? "غير مرتبط" : "Not linked")}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{ar ? "الاستحقاق" : "Due date"}</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div><Label>{ar ? "الضريبة %" : "Tax %"}</Label><Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>{ar ? "البنود" : "Line items"}</Label>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, items: [...form.items, { description: "", quantity: 1, unit_price: 0 }] })}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_90px_110px_36px] gap-2">
                    <Input placeholder={ar ? "الوصف" : "Description"} value={it.description} onChange={(e) => update(i, { description: e.target.value })} />
                    <Input type="number" step="0.01" placeholder={ar ? "الكمية" : "Qty"} value={it.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} />
                    <Input type="number" step="0.01" placeholder={ar ? "السعر" : "Unit price"} value={it.unit_price} onChange={(e) => update(i, { unit_price: Number(e.target.value) })} />
                    <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })} disabled={form.items.length === 1}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "المجموع الفرعي" : "Subtotal"}</span><span className="font-mono">{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الضريبة" : "Tax"}</span><span className="font-mono">{taxAmt.toFixed(2)}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><span>{ar ? "الإجمالي" : "Total"}</span><span className="font-mono">{total.toFixed(2)}</span></div>
            </div>
            <div><Label>{ar ? "ملاحظات" : "Notes"}</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" disabled={saving} onClick={submit}>
              {saving && <Loader2 className="size-4 animate-spin me-1.5" />}
              {ar ? "إنشاء المسودة" : "Create draft"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function SessionsTab({ caseId, data, onChange }: { caseId: string; data: NonNullable<Awaited<ReturnType<typeof getCase>>>; onChange: () => void }) {
  const { locale } = useI18n();
  const addEv = useServerFn(addCaseEvent);
  const delEv = useServerFn(deleteCaseEvent);
  const saveAppt = useServerFn(saveAppointment);
  const [form, setForm] = useState({ title: "", scheduled_at: "", body: "" });

  async function add() {
    if (!form.title || !form.scheduled_at) {
      toast.error(locale === "ar" ? "العنوان والتاريخ مطلوبان" : "Title and date are required");
      return;
    }
    try {
      await addEv({ data: { case_id: caseId, kind: "court_session", title: form.title, body: form.body || undefined, scheduled_at: form.scheduled_at } });
      const starts = new Date(form.scheduled_at).toISOString();
      const ends = new Date(new Date(form.scheduled_at).getTime() + 3600_000).toISOString();
      await saveAppt({ data: { title: form.title, starts_at: starts, ends_at: ends, all_day: false, kind: "court", case_id: caseId, description: form.body || undefined } });
      toast.success(locale === "ar" ? "أضيفت الجلسة إلى التقويم" : "Session added to calendar");
      setForm({ title: "", scheduled_at: "", body: "" });
      onChange();
    } catch (e) { toast.error((e as Error).message); }
  }

  const sessions = data.events.filter((e: any) => e.kind === "court_session");
  return (
    <div className="space-y-6">
      <div className="card-elev rounded-xl border bg-card p-5">
        <h3 className="font-serif text-lg mb-4">{locale === "ar" ? "إضافة جلسة" : "Add court session"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>{locale === "ar" ? "العنوان *" : "Title *"}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{locale === "ar" ? "التاريخ والوقت *" : "Date & time *"}</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{locale === "ar" ? "تفاصيل" : "Details"}</Label><Textarea rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        </div>
        <Button variant="gold" size="sm" className="mt-4 gap-1.5" onClick={add}><Plus className="size-4" />{locale === "ar" ? "إضافة" : "Add session"}</Button>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        <div className="border-b p-4"><h3 className="font-serif text-lg">{locale === "ar" ? "الجلسات والمواعيد" : "Sessions & appointments"}</h3></div>
        {data.appointments.length === 0 && sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{locale === "ar" ? "لا توجد جلسات بعد" : "No sessions yet"}</div>
        ) : (
          <ul className="divide-y">
            {data.appointments.map((a: any) => (
              <li key={a.id} className="flex items-start justify-between p-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gold">{locale === "ar" ? "موعد" : "Appointment"}</div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(a.starts_at).toLocaleString()}{a.location ? ` · ${a.location}` : ""}</div>
                </div>
              </li>
            ))}
            {sessions.map((e: any) => (
              <li key={e.id} className="flex items-start justify-between p-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gold">{locale === "ar" ? "جلسة" : "Session"}</div>
                  <div className="font-medium">{e.title}</div>
                  {e.scheduled_at && <div className="text-xs text-muted-foreground mt-1">{new Date(e.scheduled_at).toLocaleString()}</div>}
                  {e.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.body}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={async () => { if (!confirm(locale === "ar" ? "حذف الجلسة؟" : "Delete session?")) return; try { await delEv({ data: { id: e.id } }); toast.success(locale === "ar" ? "تم الحذف" : "Deleted"); onChange(); } catch (err) { toast.error((err as Error).message); } }}><Trash2 className="size-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ caseId, docs, onChange }: { caseId: string; docs: any[]; onChange: () => void }) {
  const { locale } = useI18n();
  const createDoc = useServerFn(createDocument);
  const signedUrl = useServerFn(getSignedDownloadUrl);
  const delDoc = useServerFn(deleteDocument);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<string>("other");
  const [filter, setFilter] = useState<string>("all");
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const ALLOWED_EXT = ["pdf", "doc", "docx", "csv", "jpg", "jpeg"];
  const MAX_BYTES = 4 * 1024 * 1024;

  const categories = [
    { v: "pleading", ar: "مذكرات", en: "Pleadings" },
    { v: "contract", ar: "عقود", en: "Contracts" },
    { v: "evidence", ar: "أدلة", en: "Evidence" },
    { v: "court_paper", ar: "أوراق المحكمة", en: "Court papers" },
    { v: "invoice", ar: "فواتير", en: "Invoices" },
    { v: "correspondence", ar: "مراسلات", en: "Correspondence" },
    { v: "other", ar: "أخرى", en: "Other" },
  ];
  const catLabel = (v: string | null) => categories.find((c) => c.v === v)?.[locale === "ar" ? "ar" : "en"] ?? (locale === "ar" ? "أخرى" : "Other");

  async function upload(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error(locale === "ar" ? "أنواع مسموحة فقط: PDF, Word, CSV, JPG" : "Allowed: PDF, Word, CSV, JPG");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(locale === "ar" ? "الحد الأقصى 4 ميغابايت" : "Max size 4 MB");
      return;
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/${caseId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) throw error;
      await createDoc({ data: { name: file.name, mime_type: file.type, size: file.size, storage_path: path, case_id: caseId, category } });
      toast.success(locale === "ar" ? "تم رفع المستند بنجاح" : "Document uploaded successfully");
      onChange();
    } catch (e) {
      toast.error(locale === "ar" ? `فشل الرفع: ${(e as Error).message}` : `Upload failed: ${(e as Error).message}`);
    }
    finally { setUploading(false); }
  }
  async function dl(id: string) {
    try { const { url, name } = await signedUrl({ data: { id } }); const a = document.createElement("a"); a.href = url; a.download = name; a.target = "_blank"; a.click(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function openPreview(d: any) {
    setPreviewLoading(true);
    try {
      const { url, name, mime_type } = await signedUrl({ data: { id: d.id } });
      setPreview({ url, name, mime: mime_type ?? d.mime_type ?? null });
    } catch (e) { toast.error((e as Error).message); }
    finally { setPreviewLoading(false); }
  }
  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await delDoc({ data: { id: pendingDelete.id } });
      toast.success(locale === "ar" ? "تم حذف المستند بنجاح" : "Document deleted");
      setPendingDelete(null);
      onChange();
    } catch (e) {
      toast.error((locale === "ar" ? "فشل الحذف: " : "Delete failed: ") + (e as Error).message);
    } finally { setDeleting(false); }
  }

  const filtered = filter === "all" ? docs : docs.filter((d) => (d.category ?? "other") === filter);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground hover:bg-secondary/40">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span>{locale === "ar" ? "رفع مستند (PDF · Word · CSV · JPG)" : "Upload a document (PDF · Word · CSV · JPG)"}</span>
          <input type="file" accept=".pdf,.doc,.docx,.csv,.jpg,.jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{locale === "ar" ? "الفئة" : "Category"}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c.v} value={c.v}>{locale === "ar" ? c.ar : c.en}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{locale === "ar" ? "تصفية" : "Filter"}</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{locale === "ar" ? "الكل" : "All categories"}</SelectItem>
            {categories.map((c) => <SelectItem key={c.v} value={c.v}>{locale === "ar" ? c.ar : c.en}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="card-elev rounded-xl border bg-card">
        {filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{locale === "ar" ? "لا توجد مستندات" : "No documents"}</div>
        : <ul className="divide-y">
          {filtered.map((d) => (
            <li key={d.id} className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider">{catLabel(d.category)}</span>
                  <span>{Math.round((d.size ?? 0) / 1024)} KB</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openPreview(d)} disabled={previewLoading} title={locale === "ar" ? "عرض" : "Preview"}><Eye className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => dl(d.id)} title={locale === "ar" ? "تنزيل" : "Download"}><Download className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setPendingDelete(d)} title={locale === "ar" ? "حذف" : "Delete"}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </li>
          ))}
        </ul>}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locale === "ar" ? "حذف المستند؟" : "Delete document?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {locale === "ar" ? `سيتم حذف "${pendingDelete?.name ?? ""}" نهائياً.` : `"${pendingDelete?.name ?? ""}" will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{locale === "ar" ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="size-4 animate-spin me-1.5" />}
              {locale === "ar" ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle className="truncate pe-6">{preview?.name}</DialogTitle></DialogHeader>
          {preview && <DocumentPreviewBody url={preview.url} name={preview.name} mime={preview.mime} locale={locale} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PartiesTab({ caseId }: { caseId: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listParties);
  const save = useServerFn(saveParty);
  const del = useServerFn(deleteParty);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", role: "other", contact: "", email: "", phone: "", notes: "" });
  const [loading, setLoading] = useState(true);

  const roles = [
    { value: "plaintiff", ar: "مدعي", en: "Plaintiff" },
    { value: "defendant", ar: "مدعى عليه", en: "Defendant" },
    { value: "counsel", ar: "محامي", en: "Counsel" },
    { value: "witness", ar: "شاهد", en: "Witness" },
    { value: "judge", ar: "قاضي", en: "Judge" },
    { value: "other", ar: "أخرى", en: "Other" },
  ];
  const roleLabel = (v: string) => roles.find((r) => r.value === v)?.[ar ? "ar" : "en"] ?? v;

  async function refresh() { setLoading(true); try { setRows(await list({ data: { case_id: caseId } })); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, [caseId]);

  async function add() {
    if (!form.name) { toast.error(ar ? "الاسم مطلوب" : "Name required"); return; }
    try {
      await save({ data: { case_id: caseId, ...form } });
      setForm({ name: "", role: "other", contact: "", email: "", phone: "", notes: "" });
      toast.success(ar ? "تمت إضافة الطرف" : "Party added");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(id: string) {
    if (!confirm(ar ? "حذف الطرف؟" : "Delete party?")) return;
    try { await del({ data: { id } }); toast.success(ar ? "تم الحذف" : "Deleted"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="card-elev rounded-xl border bg-card p-5">
        <h3 className="font-serif text-lg mb-4">{ar ? "إضافة طرف" : "Add party"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>{ar ? "الاسم *" : "Name *"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{ar ? "الدور" : "Role"}</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{roles.map((r) => <SelectItem key={r.value} value={r.value}>{ar ? r.ar : r.en}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{ar ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{ar ? "الهاتف" : "Phone"}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{ar ? "وسيلة تواصل أخرى" : "Other contact"}</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{ar ? "ملاحظات" : "Notes"}</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <Button variant="gold" size="sm" className="mt-4 gap-1.5" onClick={add}><Plus className="size-4" />{ar ? "إضافة" : "Add"}</Button>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        {loading ? <div className="p-8 grid place-items-center"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا توجد أطراف" : "No parties yet"}</div>
        : <ul className="divide-y">{rows.map((p) => (
          <li key={p.id} className="flex items-start justify-between p-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-gold">{roleLabel(p.role)}</div>
              <div className="font-medium">{p.name}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {p.email && <span>✉ {p.email}</span>}
                {p.phone && <span>☎ {p.phone}</span>}
                {p.contact && <span>{p.contact}</span>}
              </div>
              {p.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{p.notes}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </li>
        ))}</ul>}
      </div>
    </div>
  );
}

function NotesTab({ caseId }: { caseId: string }) {
  const { locale } = useI18n();
  const list = useServerFn(listNotes);
  const add = useServerFn(addNote);
  const del = useServerFn(deleteNote);
  const [rows, setRows] = useState<any[]>([]);
  const [body, setBody] = useState("");

  async function refresh() { setRows(await list({ data: { case_id: caseId } })); }
  useEffect(() => { refresh(); }, [caseId]);

  async function submit() {
    if (!body.trim()) return;
    try { await add({ data: { case_id: caseId, body: body.trim() } }); setBody(""); toast.success(locale === "ar" ? "تمت إضافة الملاحظة" : "Note added"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="card-elev rounded-xl border bg-card p-5">
        <Label>{locale === "ar" ? "ملاحظة جديدة" : "New note"}</Label>
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1.5" />
        <Button variant="gold" size="sm" className="mt-3 gap-1.5" onClick={submit}><Plus className="size-4" />{locale === "ar" ? "إضافة ملاحظة" : "Add note"}</Button>
      </div>
      <div className="card-elev rounded-xl border bg-card">
        {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{locale === "ar" ? "لا توجد ملاحظات" : "No notes yet"}</div>
        : <ul className="divide-y">{rows.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              <div className="mt-2 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={async () => { if (!confirm(locale === "ar" ? "حذف الملاحظة؟" : "Delete note?")) return; try { await del({ data: { id: n.id } }); toast.success(locale === "ar" ? "تم الحذف" : "Deleted"); refresh(); } catch (e) { toast.error((e as Error).message); } }}><Trash2 className="size-4 text-destructive" /></Button>
          </li>
        ))}</ul>}
      </div>
    </div>
  );
}

function TeamTab({ caseId }: { caseId: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listCaseMembers);
  const add = useServerFn(addCaseMember);
  const remove = useServerFn(removeCaseMember);
  const updateRole = useServerFn(updateCaseMemberRole);
  const listUsers = useServerFn(listAssignableUsers);
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<Array<{ user_id: string; full_name: string | null }>>([]);
  const [picking, setPicking] = useState<string>("");
  const [pickRole, setPickRole] = useState<string>("associate");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [ms, us] = await Promise.all([list({ data: { case_id: caseId } }), listUsers()]);
      setRows(ms as any[]);
      setUsers(us as any[]);
    } catch (e) { toast.error((e as Error).message); }
  }
  useEffect(() => { refresh(); }, [caseId]);

  const assignedIds = new Set(rows.map((r: any) => r.user_id));
  const available = users.filter((u) => !assignedIds.has(u.user_id));

  const roleLabels: Record<string, [string, string]> = {
    lead: ["محامي رئيسي", "Lead"],
    co_counsel: ["محامي مشارك", "Co-counsel"],
    associate: ["محامي", "Associate"],
    paralegal: ["مساعد قانوني", "Paralegal"],
    support: ["دعم", "Support"],
  };
  const tr = (k: string) => roleLabels[k]?.[ar ? 0 : 1] ?? k;

  return (
    <div className="space-y-4">
      <div className="card-elev rounded-xl border bg-card p-5">
        <Label>{ar ? "إضافة عضو فريق" : "Add team member"}</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <Select value={picking} onValueChange={setPicking}>
            <SelectTrigger><SelectValue placeholder={ar ? "اختر زميلًا…" : "Select a colleague…"} /></SelectTrigger>
            <SelectContent>
              {available.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{ar ? "لا يوجد زملاء متاحون" : "No available colleagues"}</div>}
              {available.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.user_id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pickRole} onValueChange={setPickRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(roleLabels).map((r) => <SelectItem key={r} value={r}>{tr(r)}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="gold" size="sm" className="gap-1.5" disabled={!picking || busy} onClick={async () => {
            setBusy(true);
            try {
              await add({ data: { case_id: caseId, user_id: picking, role: pickRole as any } });
              setPicking(""); setPickRole("associate"); refresh();
              toast.success(ar ? "أُضيف العضو" : "Member added");
            } catch (e) { toast.error((e as Error).message); }
            finally { setBusy(false); }
          }}><UserPlus className="size-4" />{ar ? "إضافة" : "Add"}</Button>
        </div>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا يوجد أعضاء بعد" : "No team members yet"}</div>
        : <ul className="divide-y">{rows.map((m: any) => (
          <li key={m.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-medium">{m.profiles?.full_name || m.user_id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{ar ? "أُضيف" : "Added"} {new Date(m.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={m.role} onValueChange={async (v) => {
                try { await updateRole({ data: { id: m.id, role: v as any } }); toast.success(ar ? "تم تحديث الدور" : "Role updated"); refresh(); }
                catch (e) { toast.error((e as Error).message); }
              }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(roleLabels).map((r) => <SelectItem key={r} value={r}>{tr(r)}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={async () => {
                if (!confirm(ar ? "إزالة العضو؟" : "Remove member?")) return;
                try { await remove({ data: { id: m.id } }); toast.success(ar ? "تمت الإزالة" : "Member removed"); refresh(); }
                catch (e) { toast.error((e as Error).message); }
              }}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          </li>
        ))}</ul>}
      </div>
    </div>
  );
}
