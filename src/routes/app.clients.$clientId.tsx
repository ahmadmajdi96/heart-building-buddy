import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { getClient, addInteraction, deleteInteraction, updateInteraction, attachCaseToClient, detachCaseFromClient, listUnassignedCases, createInstallmentPlan } from "@/lib/clients.functions";
import { deleteDocument } from "@/lib/documents.functions";
import { deleteMeeting } from "@/lib/meetings.functions";
import { deleteAppointment } from "@/lib/appointments.functions";
import { deleteInvoice, deletePayment } from "@/lib/invoicing.functions";
import { ArrowLeft, Loader2, Trash2, Plus, Pencil, ClipboardList, MessageSquare, Briefcase, Building, User, FileText, CalendarClock, Video, Receipt, Wallet, Coins, Link as LinkIcon, Unlink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/clients/$clientId")({ component: ClientProfilePage });

function ClientProfilePage() {
  const { clientId } = Route.useParams();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const get = useServerFn(getClient);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setData(await get({ data: { id: clientId } })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [clientId]);

  if (loading) return <div className="grid place-items-center p-12"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  if (!data?.client) return (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">{ar ? "الموكل غير موجود" : "Client not found"}</p>
      <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: "/app/clients" })}>{ar ? "رجوع" : "Back"}</Button>
    </div>
  );

  const c = data.client;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/clients" className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-4" />{ar ? "كل الموكلين" : "All clients"}</Link>
      </div>
      <PageHeader
        title={c.name}
        subtitle={[c.company, c.country].filter(Boolean).join(" · ") || undefined}
        actions={<span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-secondary text-muted-foreground">{c.status ?? "active"}</span>}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full flex-wrap gap-1 bg-card border h-auto p-1">
          <TabsTrigger value="overview" className="gap-1.5"><ClipboardList className="size-3.5" />{ar ? "نظرة عامة" : "Overview"}</TabsTrigger>
          <TabsTrigger value="cases" className="gap-1.5"><Briefcase className="size-3.5" />{ar ? "القضايا" : "Cases"}</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="size-3.5" />{ar ? "المستندات" : "Documents"}</TabsTrigger>
          <TabsTrigger value="meetings" className="gap-1.5"><Video className="size-3.5" />{ar ? "الاجتماعات" : "Meetings"}</TabsTrigger>
          <TabsTrigger value="appointments" className="gap-1.5"><CalendarClock className="size-3.5" />{ar ? "المواعيد" : "Appointments"}</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="size-3.5" />{ar ? "الفواتير" : "Invoices"}</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5"><Wallet className="size-3.5" />{ar ? "المدفوعات" : "Payments"}</TabsTrigger>
          <TabsTrigger value="owed" className="gap-1.5"><Coins className="size-3.5" />{ar ? "مستحقات" : "Owed"}</TabsTrigger>
          <TabsTrigger value="interactions" className="gap-1.5"><MessageSquare className="size-3.5" />{ar ? "التفاعلات" : "Interactions"}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab data={data} /></TabsContent>
        <TabsContent value="cases" className="mt-6"><CasesTab data={data} clientId={clientId} onChange={refresh} /></TabsContent>
        <TabsContent value="documents" className="mt-6">
          <SimpleList items={data.documents} kind="documents" empty={ar ? "لا مستندات" : "No documents"}
            render={(d: any) => ({ title: d.name, sub: `${d.cases?.title ?? "—"} · ${formatBytes(d.size)}`, date: d.created_at })}
            onDelete={async (row) => { await (useServerFn as any); }}
            deleteFn={deleteDocument} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="meetings" className="mt-6">
          <SimpleList items={data.meetings} kind="meetings" empty={ar ? "لا اجتماعات" : "No meetings"}
            render={(m: any) => ({ title: m.title || "—", sub: m.cases?.title ?? "", date: m.starts_at })}
            deleteFn={deleteMeeting} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="appointments" className="mt-6">
          <SimpleList items={data.appointments} kind="appointments" empty={ar ? "لا مواعيد" : "No appointments"}
            render={(a: any) => ({ title: a.title || "—", sub: `${a.cases?.title ?? ""} · ${a.location ?? ""}`, date: a.starts_at })}
            deleteFn={deleteAppointment} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-6"><InvoicesTab items={data.invoices} onChange={refresh} /></TabsContent>
        <TabsContent value="payments" className="mt-6"><PaymentsTab items={data.payments} onChange={refresh} /></TabsContent>
        <TabsContent value="owed" className="mt-6"><OwedTab data={data} clientId={clientId} onChange={refresh} /></TabsContent>
        <TabsContent value="interactions" className="mt-6"><InteractionsTab clientId={clientId} data={data} onChange={refresh} /></TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ data }: { data: any }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const c = data.client;
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-[160px_1fr] gap-3 py-2 border-b last:border-b-0">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="card-elev rounded-xl border bg-card p-5 md:col-span-2">
        <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
          {c.type === "company" ? <Building className="size-4 text-gold" /> : <User className="size-4 text-gold" />}
          {ar ? "تفاصيل الموكل" : "Client details"}
        </h3>
        <Row label={ar ? "النوع" : "Type"} value={c.type ?? "individual"} />
        <Row label={ar ? "الشركة" : "Company"} value={c.company} />
        <Row label={ar ? "البريد" : "Email"} value={c.email} />
        <Row label={ar ? "الهاتف" : "Phone"} value={c.phone} />
        <Row label={ar ? "الرقم الوطني" : "National ID"} value={c.national_id} />
        <Row label={ar ? "الرقم الضريبي" : "Tax ID"} value={c.tax_id} />
        <Row label={ar ? "الدولة" : "Country"} value={c.country} />
        <Row label={ar ? "العنوان" : "Address"} value={c.address} />
        <Row label={ar ? "ملاحظات" : "Notes"} value={c.notes ? <p className="whitespace-pre-wrap">{c.notes}</p> : null} />
      </div>
      <div className="card-elev rounded-xl border bg-card p-5">
        <h3 className="font-serif text-lg mb-3">{ar ? "ملخص" : "Summary"}</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "القضايا" : "Cases"}</span><span className="font-medium">{data.cases.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "قضايا نشطة" : "Active cases"}</span><span className="font-medium">{data.cases.filter((cs: any) => ["open", "pending"].includes(cs.status)).length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "المستندات" : "Documents"}</span><span className="font-medium">{data.documents.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الفواتير" : "Invoices"}</span><span className="font-medium">{data.invoices.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "التفاعلات" : "Interactions"}</span><span className="font-medium">{data.interactions.length}</span></div>
        </div>
      </div>
    </div>
  );
}

function CasesTab({ data, clientId, onChange }: { data: any; clientId: string; onChange: () => void }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const cases = data.cases ?? [];
  const listUnassigned = useServerFn(listUnassignedCases);
  const attach = useServerFn(attachCaseToClient);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<any[]>([]);
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function openPicker() {
    try { setAvailable(await listUnassigned() as any[]); setOpen(true); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function submit() {
    if (!picking) return;
    setBusy(true);
    try {
      await attach({ data: { client_id: clientId, case_id: picking } });
      toast.success(ar ? "تم ربط القضية" : "Case attached");
      setOpen(false); setPicking(null); onChange();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="gold" size="sm" className="gap-1.5" onClick={openPicker}><LinkIcon className="size-4" />{ar ? "ربط قضية موجودة" : "Attach existing case"}</Button>
      </div>
      {cases.length === 0
        ? <div className="card-elev rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">{ar ? "لا توجد قضايا لهذا الموكل." : "No cases for this client yet."}</div>
        : <div className="card-elev rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr>
              <th className="px-5 py-3 text-start font-medium">{ar ? "الرقم" : "Ref"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "العنوان" : "Title"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "الحالة" : "Status"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "السعر المتفق" : "Agreed fee"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "افتُتحت" : "Opened"}</th>
            </tr></thead>
            <tbody className="divide-y">
              {cases.map((cs: any) => (
                <tr key={cs.id} className="hover:bg-secondary/40">
                  <td className="px-5 py-3 font-mono text-xs">{cs.case_number ?? "—"}</td>
                  <td className="px-5 py-3 font-medium"><Link to="/app/cases/$caseId" params={{ caseId: cs.id }} className="hover:text-gold">{cs.title}</Link></td>
                  <td className="px-5 py-3"><StatusBadge status={cs.status} /></td>
                  <td className="px-5 py-3 tabular-nums">{cs.agreed_fee ? `${Number(cs.agreed_fee).toFixed(2)} ${cs.fee_currency ?? ""}` : "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{cs.opened_at ? new Date(cs.opened_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "ربط قضية موجودة" : "Attach existing case"}</DialogTitle></DialogHeader>
          {available.length === 0
            ? <p className="text-sm text-muted-foreground">{ar ? "لا توجد قضايا بدون موكل حالياً." : "No unassigned cases available."}</p>
            : <Select value={picking ?? ""} onValueChange={setPicking}>
                <SelectTrigger><SelectValue placeholder={ar ? "اختر قضية" : "Select a case"} /></SelectTrigger>
                <SelectContent>{available.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}{c.case_number ? ` — ${c.case_number}` : ""}</SelectItem>)}</SelectContent>
              </Select>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" disabled={!picking || busy} onClick={submit}>{busy && <Loader2 className="size-4 animate-spin me-1.5" />}{ar ? "ربط" : "Attach"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfirmDelete({ open, onOpenChange, onConfirm, busy, title, description }: {
  open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void; busy: boolean;
  title: string; description: string;
}) {
  const { locale } = useI18n(); const ar = locale === "ar";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); onConfirm(); }} disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {busy && <Loader2 className="size-4 animate-spin me-1.5" />}{ar ? "حذف" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function useDeleter(fn: any, onChanged: () => void) {
  const call = useServerFn(fn);
  const [target, setTarget] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const { locale } = useI18n(); const ar = locale === "ar";
  async function confirm() {
    if (!target) return;
    setBusy(true);
    try { await call({ data: { id: target.id } }); toast.success(ar ? "تم الحذف" : "Deleted"); setTarget(null); onChanged(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  return { target, setTarget, busy, confirm };
}

function SimpleList({
  items, empty, render, kind, deleteFn, onChanged,
}: {
  items: any[]; empty: string; kind: string;
  render: (x: any) => { title: string; sub?: string; date?: string };
  deleteFn?: any; onChanged?: () => void;
}) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const del = useDeleter(deleteFn, onChanged ?? (() => {}));
  if (!items || items.length === 0) return <div className="card-elev rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <>
      <div className="card-elev rounded-xl border bg-card divide-y" data-kind={kind}>
        {items.map((x: any) => {
          const r = render(x);
          return (
            <div key={x.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                {r.sub && <div className="text-xs text-muted-foreground truncate">{r.sub}</div>}
              </div>
              <div className="flex items-center gap-2 ms-4">
                {r.date && <div className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(r.date).toLocaleString()}</div>}
                {deleteFn && <Button variant="ghost" size="icon" onClick={() => del.setTarget(x)}><Trash2 className="size-4 text-destructive" /></Button>}
              </div>
            </div>
          );
        })}
      </div>
      {deleteFn && (
        <ConfirmDelete open={!!del.target} onOpenChange={(o) => { if (!o) del.setTarget(null); }}
          onConfirm={del.confirm} busy={del.busy}
          title={ar ? "تأكيد الحذف" : "Confirm delete"}
          description={ar ? "لا يمكن التراجع." : "This cannot be undone."} />
      )}
    </>
  );
}

function InvoicesTab({ items, onChange }: { items: any[]; onChange: () => void }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const del = useDeleter(deleteInvoice, onChange);
  if (items.length === 0) return <div className="card-elev rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">{ar ? "لا توجد فواتير." : "No invoices."}</div>;
  return (
    <div className="card-elev rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr>
          <th className="px-5 py-3 text-start font-medium">{ar ? "الرقم" : "Number"}</th>
          <th className="px-5 py-3 text-start font-medium">{ar ? "القضية" : "Case"}</th>
          <th className="px-5 py-3 text-start font-medium">{ar ? "التاريخ" : "Issued"}</th>
          <th className="px-5 py-3 text-start font-medium">{ar ? "الاستحقاق" : "Due"}</th>
          <th className="px-5 py-3 text-end font-medium">{ar ? "الإجمالي" : "Total"}</th>
          <th className="px-5 py-3 text-end font-medium">{ar ? "المدفوع" : "Paid"}</th>
          <th className="px-5 py-3 text-start font-medium">{ar ? "الحالة" : "Status"}</th>
          <th className="px-5 py-3 text-end font-medium w-16"></th>
        </tr></thead>
        <tbody className="divide-y">
          {items.map((i: any) => (
            <tr key={i.id} className="hover:bg-secondary/40">
              <td className="px-5 py-3 font-mono text-xs">{i.number}</td>
              <td className="px-5 py-3 text-muted-foreground">{i.cases?.title ?? "—"}</td>
              <td className="px-5 py-3 text-xs">{new Date(i.issue_date).toLocaleDateString()}</td>
              <td className="px-5 py-3 text-xs">{i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}</td>
              <td className="px-5 py-3 text-end tabular-nums">{Number(i.total).toFixed(2)} {i.currency}</td>
              <td className="px-5 py-3 text-end tabular-nums">{Number(i.amount_paid ?? 0).toFixed(2)}</td>
              <td className="px-5 py-3"><StatusBadge status={i.status} /></td>
              <td className="px-5 py-3 text-end">
                <Button variant="ghost" size="icon" onClick={() => del.setTarget(i)}><Trash2 className="size-4 text-destructive" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmDelete open={!!del.target} onOpenChange={(o) => { if (!o) del.setTarget(null); }}
        onConfirm={del.confirm} busy={del.busy}
        title={ar ? "حذف الفاتورة؟" : "Delete invoice?"}
        description={ar ? "سيتم فصل المدفوعات المرتبطة ولن يتم حذفها." : "Linked payments will be detached, not deleted."} />
    </div>
  );
}

function PaymentsTab({ items, onChange }: { items: any[]; onChange: () => void }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const del = useDeleter(deletePayment, onChange);
  if (items.length === 0) return <div className="card-elev rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">{ar ? "لا توجد مدفوعات." : "No payments."}</div>;
  return (
    <div className="card-elev rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr>
          <th className="px-5 py-3 text-start font-medium">{ar ? "التاريخ" : "Date"}</th>
          <th className="px-5 py-3 text-start font-medium">{ar ? "المرجع" : "Reference"}</th>
          <th className="px-5 py-3 text-start font-medium">{ar ? "الفاتورة" : "Invoice"}</th>
          <th className="px-5 py-3 text-start font-medium">{ar ? "الطريقة" : "Method"}</th>
          <th className="px-5 py-3 text-end font-medium">{ar ? "المبلغ" : "Amount"}</th>
          <th className="px-5 py-3 text-end font-medium w-16"></th>
        </tr></thead>
        <tbody className="divide-y">
          {items.map((p: any) => {
            const isRetainer = typeof p.reference === "string" && p.reference.startsWith("retainer:");
            return (
              <tr key={p.id}>
                <td className="px-5 py-3 text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-3 text-xs">
                  {isRetainer
                    ? <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/10 text-gold">{ar ? "دفعة مقدمة" : "Retainer"}</span>
                    : (p.reference || "—")}
                </td>
                <td className="px-5 py-3 font-mono text-xs">{p.tax_invoices?.number ?? "—"}</td>
                <td className="px-5 py-3 text-xs capitalize">{(p.method ?? "").replace(/_/g, " ") || "—"}</td>
                <td className="px-5 py-3 text-end tabular-nums">{Number(p.amount ?? 0).toFixed(2)} {p.currency ?? ""}</td>
                <td className="px-5 py-3 text-end">
                  <Button variant="ghost" size="icon" onClick={() => del.setTarget(p)} title={isRetainer ? (ar ? "لحذفها، امسح مبلغ الدفعة المقدمة من ملف القضية" : "To remove, clear the retainer on the case profile") : ""}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ConfirmDelete open={!!del.target} onOpenChange={(o) => { if (!o) del.setTarget(null); }}
        onConfirm={del.confirm} busy={del.busy}
        title={ar ? "حذف الدفعة؟" : "Delete payment?"}
        description={ar ? "سيتم تحديث حالة الفاتورة المرتبطة." : "The linked invoice status will be recomputed."} />
    </div>
  );
}

function OwedTab({ data, clientId, onChange }: { data: any; clientId: string; onChange: () => void }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const navigate = useNavigate();
  const install = useServerFn(createInstallmentPlan);

  const invoicesOwed = useMemo(() =>
    (data.invoices ?? []).reduce((s: number, i: any) => s + Math.max(0, Number(i.total || 0) - Number(i.amount_paid || 0)), 0),
    [data.invoices]);
  const unbilledTime = useMemo(() =>
    (data.timeEntries ?? []).filter((t: any) => t.billable && t.status !== "invoiced")
      .reduce((s: number, t: any) => s + (Number(t.duration_seconds || 0) / 3600) * Number(t.hourly_rate || 0), 0),
    [data.timeEntries]);

  // Case-fee accounting: for each case with an agreed_fee, subtract invoiced+paid
  // and retainer already collected. What's left is receivable directly against
  // the client's engagement letter.
  const caseFeesOwed = useMemo(() => {
    const invByCase: Record<string, number> = {};
    for (const inv of (data.invoices ?? [])) {
      const cid = inv.case_id as string | null;
      if (!cid) continue;
      invByCase[cid] = (invByCase[cid] ?? 0) + Number(inv.total || 0);
    }
    return (data.cases ?? []).reduce((s: number, c: any) => {
      const fee = Number(c.agreed_fee || 0);
      if (fee <= 0) return s;
      const alreadyBilled = invByCase[c.id] ?? 0;
      const retainer = Number(c.retainer_amount || 0);
      return s + Math.max(0, fee - alreadyBilled - retainer);
    }, 0);
  }, [data.cases, data.invoices]);

  const total = invoicesOwed + unbilledTime + caseFeesOwed;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ count: 6, frequency: "monthly" as "weekly" | "monthly", start_date: new Date().toISOString().slice(0, 10), amount: 0, currency: "JOD" });
  const [busy, setBusy] = useState(false);

  function openDialog() {
    setForm((f) => ({ ...f, amount: Math.round(total * 100) / 100, currency: data.invoices?.[0]?.currency ?? "JOD" }));
    setOpen(true);
  }
  async function submit() {
    if (form.amount <= 0) { toast.error(ar ? "المبلغ يجب أن يكون أكبر من صفر" : "Amount must be positive"); return; }
    setBusy(true);
    try {
      const r = await install({ data: {
        client_id: clientId, title: ar ? `خطة أقساط - ${data.client.name}` : `Installments – ${data.client.name}`,
        total_amount: form.amount, currency: form.currency, count: form.count, frequency: form.frequency, start_date: form.start_date,
      }});
      toast.success(ar ? "تم إنشاء قضية التحصيل" : "Debt case created");
      setOpen(false); onChange();
      navigate({ to: "/app/debt-collection/$id", params: { id: (r as any).debt_case_id } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card-elev rounded-xl border bg-card p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{ar ? "فواتير غير مدفوعة" : "Unpaid invoices"}</div><div className="mt-1 font-serif text-2xl tabular-nums">{invoicesOwed.toFixed(2)}</div></div>
        <div className="card-elev rounded-xl border bg-card p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{ar ? "وقت غير مفوتر" : "Unbilled time"}</div><div className="mt-1 font-serif text-2xl tabular-nums">{unbilledTime.toFixed(2)}</div></div>
        <div className="card-elev rounded-xl border bg-card p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{ar ? "أتعاب القضايا" : "Case fees due"}</div><div className="mt-1 font-serif text-2xl tabular-nums">{caseFeesOwed.toFixed(2)}</div></div>
        <div className="card-elev rounded-xl border bg-card p-4 border-gold/50"><div className="text-[11px] uppercase tracking-wider text-gold">{ar ? "الإجمالي المستحق" : "Total owed"}</div><div className="mt-1 font-serif text-2xl tabular-nums text-gold">{total.toFixed(2)}</div></div>
      </div>
      <div className="flex justify-end">
        <Button variant="gold" onClick={openDialog} disabled={total <= 0} className="gap-1.5"><Coins className="size-4" />{ar ? "تحويل إلى أقساط" : "Convert to installments"}</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "خطة أقساط جديدة" : "New installment plan"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>{ar ? "المبلغ" : "Amount"}</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><Label>{ar ? "العملة" : "Currency"}</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
            <div><Label>{ar ? "عدد الأقساط" : "Number of installments"}</Label><Input type="number" min={1} max={60} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} /></div>
            <div><Label>{ar ? "التكرار" : "Frequency"}</Label>
              <Select value={form.frequency} onValueChange={(v: any) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{ar ? "أسبوعي" : "Weekly"}</SelectItem>
                  <SelectItem value="monthly">{ar ? "شهري" : "Monthly"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>{ar ? "تاريخ البداية" : "Start date"}</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">
            {ar ? `سيتم إنشاء قضية تحصيل واحدة و${form.count} قسط.` : `Creates one debt case and ${form.count} scheduled payments.`}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={submit} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin me-1.5" />}{ar ? "إنشاء" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InteractionsTab({ clientId, data, onChange }: { clientId: string; data: any; onChange: () => void }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const add = useServerFn(addInteraction);
  const del = useServerFn(deleteInteraction);
  const [form, setForm] = useState<{ kind: "call" | "session" | "note" | "email"; title: string; body: string }>({ kind: "note", title: "", body: "" });
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.title.trim()) { toast.error(ar ? "العنوان مطلوب" : "Title is required"); return; }
    setSaving(true);
    try { await add({ data: { client_id: clientId, ...form } }); toast.success(ar ? "تمت الإضافة" : "Interaction added"); setForm({ kind: "note", title: "", body: "" }); onChange(); }
    catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }
  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try { await del({ data: { id: pendingDelete.id } }); toast.success(ar ? "تم الحذف" : "Deleted"); setPendingDelete(null); onChange(); }
    catch (e) { toast.error((e as Error).message); } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-4">
      <div className="card-elev rounded-xl border bg-card p-5">
        <h3 className="font-serif text-lg mb-4">{ar ? "تسجيل تفاعل جديد" : "Log a new interaction"}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>{ar ? "النوع" : "Kind"}</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call">{ar ? "مكالمة" : "Call"}</SelectItem>
                <SelectItem value="session">{ar ? "جلسة" : "Session"}</SelectItem>
                <SelectItem value="email">{ar ? "بريد" : "Email"}</SelectItem>
                <SelectItem value="note">{ar ? "ملاحظة" : "Note"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{ar ? "العنوان *" : "Title *"}</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-3"><Label>{ar ? "تفاصيل" : "Details"}</Label>
            <Textarea rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
        </div>
        <Button variant="gold" size="sm" className="mt-4 gap-1.5" onClick={submit} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}<Plus className="size-4" />{ar ? "إضافة" : "Add"}
        </Button>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        {data.interactions.length === 0
          ? <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا توجد تفاعلات" : "No interactions yet"}</div>
          : <ul className="divide-y">
              {data.interactions.map((i: any) => (
                <li key={i.id} className="flex items-start justify-between p-4">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-gold">{i.kind}</div>
                    <div className="font-medium">{i.title}</div>
                    {i.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{i.body}</p>}
                    <div className="text-[11px] text-muted-foreground mt-1">{new Date(i.occurred_at).toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setPendingDelete(i)}><Trash2 className="size-4 text-destructive" /></Button>
                </li>
              ))}
            </ul>}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "حذف التفاعل؟" : "Delete interaction?"}</AlertDialogTitle>
            <AlertDialogDescription>{ar ? "لا يمكن التراجع." : "This cannot be undone."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="size-4 animate-spin me-1.5" />}
              {ar ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
