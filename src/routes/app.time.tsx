import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  listTimeEntries, saveTimeEntry, deleteTimeEntry, bulkDeleteTimeEntries,
  startTimer, stopTimer, getRunningTimer, exportTimeEntriesCsv,
} from "@/lib/time-entries.functions";
import { createDraftFromTime } from "@/lib/draft-invoices.functions";
import { listCases } from "@/lib/cases.functions";
import { listClients } from "@/lib/clients.functions";
import { Plus, Loader2, Pencil, Trash2, Play, Square, Clock, Search, Receipt, Download } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/time")({
  component: TimePage,
  validateSearch: (s: Record<string, unknown>) => ({ ids: typeof s.ids === "string" ? s.ids : undefined }),
});

type Entry = {
  id: string; case_id: string | null; client_id: string | null;
  description: string; activity_type: string;
  started_at: string; ended_at: string | null;
  duration_seconds: number; hourly_rate: number | null; currency: string;
  billable: boolean; status: string; is_running: boolean;
  cases?: { id: string; title: string; case_number: string | null } | null;
  clients?: { id: string; name: string } | null;
};
type CaseRow = { id: string; title: string; case_number: string | null };
type ClientRow = { id: string; name: string };

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TimePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const search = Route.useSearch();
  const filterIds = useMemo(() => new Set((search.ids ?? "").split(",").filter(Boolean)), [search.ids]);
  const navigate = Route.useNavigate();
  const list = useServerFn(listTimeEntries);
  const save = useServerFn(saveTimeEntry);
  const del = useServerFn(deleteTimeEntry);
  const start = useServerFn(startTimer);
  const stop = useServerFn(stopTimer);
  const running = useServerFn(getRunningTimer);
  const lCases = useServerFn(listCases);
  const lClients = useServerFn(listClients);
  const draftFromTime = useServerFn(createDraftFromTime);
  const bulkDel = useServerFn(bulkDeleteTimeEntries);
  const exportCsv = useServerFn(exportTimeEntriesCsv);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [runningEntry, setRunningEntry] = useState<Entry | null>(null);
  const [now, setNow] = useState(Date.now());
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Entry> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ client_name: "", client_id: "" as string | "", case_id: "" as string | "", tax_rate: "", default_rate: "", due_date: "", notes: "" });
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [pendingSingle, setPendingSingle] = useState<Entry | null>(null);
  const [pendingBulk, setPendingBulk] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Timer form
  const [tDesc, setTDesc] = useState("");
  const [tCase, setTCase] = useState<string>("none");
  const [tClient, setTClient] = useState<string>("none");
  const [tRate, setTRate] = useState<string>("");

  async function refresh() {
    setLoading(true);
    try {
      const [es, cs, cls, run] = await Promise.all([list(), lCases(), lClients(), running()]);
      setEntries(es as Entry[]);
      setCases((cs as any[]).map((c) => ({ id: c.id, title: c.title, case_number: c.case_number })));
      setClients((cls as any[]).map((c) => ({ id: c.id, name: c.name })));
      setRunningEntry((run as Entry | null) ?? null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!runningEntry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runningEntry]);

  async function handleStart() {
    try {
      await start({ data: {
        description: tDesc,
        case_id: tCase === "none" ? null : tCase,
        client_id: tClient === "none" ? null : tClient,
        hourly_rate: tRate ? Number(tRate) : null,
        currency: "USD", billable: true,
      }});
      setTDesc(""); setTRate("");
      await refresh();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function handleStop() {
    if (!runningEntry) return;
    try { await stop({ data: { id: runningEntry.id } }); await refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function submitEdit() {
    if (!editing) return;
    try {
      const started = editing.started_at ?? new Date().toISOString();
      const ended = editing.ended_at ?? null;
      const dur = editing.duration_seconds ?? (ended ? Math.max(0, Math.floor((new Date(ended).getTime() - new Date(started).getTime()) / 1000)) : 0);
      await save({ data: {
        id: editing.id,
        description: editing.description ?? "",
        activity_type: editing.activity_type ?? "work",
        case_id: editing.case_id || null,
        client_id: editing.client_id || null,
        started_at: started,
        ended_at: ended,
        duration_seconds: dur,
        hourly_rate: editing.hourly_rate ?? null,
        currency: editing.currency ?? "USD",
        billable: editing.billable ?? true,
        status: (editing.status as any) ?? "logged",
      }});
      setEditOpen(false); setEditing(null); refresh();
      toast.success(ar ? "تم الحفظ" : "Saved");
    } catch (e) { toast.error((e as Error).message); }
  }
  async function confirmSingle() {
    if (!pendingSingle) return;
    setDeleting(true);
    try {
      await del({ data: { id: pendingSingle.id } });
      toast.success(ar ? "تم حذف السجل" : "Entry deleted");
      setPendingSingle(null); refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setDeleting(false); }
  }
  async function confirmBulk() {
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const r: any = await bulkDel({ data: { ids } });
      toast.success(ar ? `تم حذف ${r.count} سجل` : `${r.count} entries deleted`);
      setPendingBulk(false); setSelected(new Set()); refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setDeleting(false); }
  }

  const filtered = useMemo(() => entries.filter((e) => {
    if (filterIds.size > 0 && !filterIds.has(e.id)) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return e.description.toLowerCase().includes(s)
      || (e.cases?.title ?? "").toLowerCase().includes(s)
      || (e.clients?.name ?? "").toLowerCase().includes(s);
  }), [entries, q, filterIds]);

  const totals = useMemo(() => {
    const total = entries.reduce((acc, e) => acc + (e.duration_seconds || 0), 0);
    const billable = entries.filter((e) => e.billable).reduce((a, e) => a + (e.duration_seconds || 0), 0);
    const amount = entries.filter((e) => e.billable && e.hourly_rate).reduce((a, e) => a + ((e.duration_seconds / 3600) * (e.hourly_rate || 0)), 0);
    return { total, billable, amount };
  }, [entries]);

  // Robust cross-browser timestamp parse: Postgres may return
  // "2026-07-06 12:34:56.789+00" which Firefox/older Edge on Windows reject
  // as NaN, causing the on-screen timer to freeze at 00:00:00.
  const parseTs = (v: string): number => {
    if (!v) return NaN;
    let s = v.trim().replace(" ", "T");
    // expand short offset "+00" or "-05" to "+00:00"
    s = s.replace(/([+-]\d{2})$/, "$1:00");
    // strip trailing microseconds beyond 3 digits
    s = s.replace(/(\.\d{3})\d+/, "$1");
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : Date.parse(v);
  };

  const liveDuration = runningEntry
    ? Math.max(0, Math.floor((now - parseTs(runningEntry.started_at)) / 1000))
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "تتبع الوقت" : "Time Tracking"}
        subtitle={ar ? `${entries.length} سجل` : `${entries.length} entries`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => {
              try {
                const r = await exportCsv({ data: {} });
                const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `time-entries-${new Date().toISOString().slice(0,10)}.csv`;
                a.click(); URL.revokeObjectURL(url);
                toast.success(ar ? `تم تصدير ${r.count} سجل` : `Exported ${r.count} entries`);
              } catch (e) { toast.error((e as Error).message); }
            }}>
              <Download className="size-4" />{ar ? "تصدير CSV" : "Export CSV"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setEditing({ started_at: new Date().toISOString(), duration_seconds: 0, billable: true, currency: "USD", status: "logged" }); setEditOpen(true); }}>
              <Plus className="size-4" />{ar ? "إدخال يدوي" : "Manual entry"}
            </Button>
          </div>
        }
      />

      {filterIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/5 px-4 py-2.5 text-sm">
          <div>
            {ar ? `تصفية إلى ${filterIds.size} سجل من فاتورة المسودة.` : `Filtered to ${filterIds.size} entr${filterIds.size === 1 ? "y" : "ies"} from a draft invoice.`}
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate({ search: {} as any })}>
            {ar ? "مسح التصفية" : "Clear filter"}
          </Button>
        </div>
      )}




      {/* Timer card */}
      <div className="card-elev rounded-xl border bg-card p-5">
        {runningEntry ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-grid size-12 place-items-center rounded-full bg-gold/15 text-gold">
              <Clock className="size-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{ar ? "قيد التشغيل" : "Running"}</div>
              <div className="font-medium truncate">{runningEntry.description || (ar ? "بدون وصف" : "No description")}</div>
              <div className="text-xs text-muted-foreground truncate">
                {runningEntry.cases?.title ?? (ar ? "بدون قضية" : "No matter")}
                {runningEntry.clients?.name ? ` · ${runningEntry.clients.name}` : ""}
              </div>
            </div>
            <div className="font-serif text-3xl tabular-nums">{formatDuration(liveDuration)}</div>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleStop}>
              <Square className="size-4" />{ar ? "إيقاف" : "Stop"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_140px_auto] md:items-end">
            <div className="space-y-1.5">
              <Label>{ar ? "ماذا تعمل؟" : "What are you working on?"}</Label>
              <Input value={tDesc} onChange={(e) => setTDesc(e.target.value)} placeholder={ar ? "وصف المهمة…" : "Task description…"} />
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? "القضية" : "Matter"}</Label>
              <Select value={tCase} onValueChange={setTCase}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                  {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? "العميل" : "Client"}</Label>
              <Select value={tClient} onValueChange={setTClient}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{ar ? "السعر/ساعة" : "Rate/hr"}</Label>
              <Input type="number" value={tRate} onChange={(e) => setTRate(e.target.value)} placeholder="0" />
            </div>
            <Button variant="gold" className="gap-1.5" onClick={handleStart}>
              <Play className="size-4" />{ar ? "ابدأ" : "Start"}
            </Button>
          </div>
        )}
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-elev rounded-xl border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{ar ? "إجمالي الوقت" : "Total time"}</div>
          <div className="mt-2 font-serif text-2xl tabular-nums">{formatDuration(totals.total)}</div>
        </div>
        <div className="card-elev rounded-xl border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{ar ? "الوقت القابل للفوترة" : "Billable"}</div>
          <div className="mt-2 font-serif text-2xl tabular-nums">{formatDuration(totals.billable)}</div>
        </div>
        <div className="card-elev rounded-xl border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{ar ? "المبلغ المقدر" : "Estimated amount"}</div>
          <div className="mt-2 font-serif text-2xl tabular-nums">${totals.amount.toFixed(2)}</div>
        </div>
      </div>

      {/* Entries table */}
      <div className="card-elev rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث…" : "Search…"} className="h-9 ps-9" />
          </div>
          {selected.size > 0 && (
            <div className="ms-auto flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{ar ? `محدد: ${selected.size}` : `${selected.size} selected`}</span>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{ar ? "مسح" : "Clear"}</Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPendingBulk(true)}>
                <Trash2 className="size-4 text-destructive" />{ar ? "حذف المحدد" : "Delete selected"}
              </Button>
              <Button size="sm" variant="gold" className="gap-1.5" onClick={() => {
                const sample = filtered.find((e) => selected.has(e.id));
                setInvoiceForm({
                  client_name: sample?.clients?.name ?? "",
                  client_id: sample?.client_id ?? "",
                  case_id: sample?.case_id ?? "",
                  tax_rate: "", default_rate: "", due_date: "", notes: "",
                });
                setInvoiceOpen(true);
              }}>
                <Receipt className="size-4" />{ar ? "إنشاء مسودة فاتورة" : "Create draft invoice"}
              </Button>
            </div>
          )}
        </div>
        {loading ? <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">{ar ? "لا توجد سجلات بعد." : "No time entries yet."}</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr>
            <th className="px-3 py-3 w-10"><Checkbox checked={filtered.filter((e) => e.billable && e.status !== "billed").every((e) => selected.has(e.id)) && filtered.some((e) => e.billable && e.status !== "billed")} onCheckedChange={(v) => {
              const next = new Set(selected);
              const billable = filtered.filter((e) => e.billable && e.status !== "billed").map((e) => e.id);
              if (v) billable.forEach((id) => next.add(id));
              else billable.forEach((id) => next.delete(id));
              setSelected(next);
            }} /></th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "التاريخ" : "Date"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "الوصف" : "Description"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "القضية" : "Matter"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "العميل" : "Client"}</th>
            <th className="px-5 py-3 text-end font-medium">{ar ? "المدة" : "Duration"}</th>
            <th className="px-5 py-3 text-end font-medium">{ar ? "المبلغ" : "Amount"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "الحالة" : "Status"}</th>
            <th className="px-5 py-3 text-end"></th>
          </tr></thead>
          <tbody className="divide-y">{filtered.map((e) => {
            const billed = e.status === "billed";
            return (
            <tr key={e.id} className={`hover:bg-secondary/40 ${billed ? "opacity-60" : ""}`}>
              <td className="px-3 py-3"><Checkbox disabled={!e.billable || billed} checked={selected.has(e.id)} onCheckedChange={(v) => {
                const next = new Set(selected); if (v) next.add(e.id); else next.delete(e.id); setSelected(next);
              }} /></td>
              <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{new Date(e.started_at).toLocaleDateString()}</td>
              <td className="px-5 py-3">
                <div className="font-medium">{e.description || "—"}</div>
                {!e.billable && <div className="text-xs text-muted-foreground">{ar ? "غير قابل للفوترة" : "Non-billable"}</div>}
              </td>
              <td className="px-5 py-3 text-muted-foreground">{e.cases?.title ?? "—"}</td>
              <td className="px-5 py-3 text-muted-foreground">{e.clients?.name ?? "—"}</td>
              <td className="px-5 py-3 text-end tabular-nums">{formatDuration(e.duration_seconds)}</td>
              <td className="px-5 py-3 text-end tabular-nums">{e.billable && e.hourly_rate ? `$${((e.duration_seconds / 3600) * e.hourly_rate).toFixed(2)}` : "—"}</td>
              <td className="px-5 py-3 text-xs">
                <span className={`inline-flex rounded-full px-2 py-0.5 ${billed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {billed ? (ar ? "مفوترة" : "Billed") : (ar ? "غير مفوترة" : "Unbilled")}
                </span>
              </td>
              <td className="px-5 py-3 text-end">
                <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setEditOpen(true); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setPendingSingle(e)}><Trash2 className="size-4 text-destructive" /></Button>
              </td>
            </tr>
          );})}</tbody>
        </table></div>}
      </div>

      {/* Create invoice from time */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "إنشاء مسودة فاتورة" : "Create draft invoice"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-md border bg-secondary/40 p-3 text-sm">
              {ar ? `سيتم تضمين ${selected.size} سجل. ستذهب إلى تبويب "الفواتير" وتصبح فاتورة ضريبية بعد قبولها.` : `${selected.size} entries will be included. Sent to the Invoices tab — accept it to become a tax invoice.`}
            </div>
            <div className="space-y-1.5"><Label>{ar ? "اسم العميل *" : "Client name *"}</Label>
              <Input value={invoiceForm.client_name} onChange={(e) => setInvoiceForm({ ...invoiceForm, client_name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{ar ? "العميل" : "Client (linked)"}</Label>
                <Select value={invoiceForm.client_id || "none"} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, client_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{ar ? "القضية" : "Matter"}</Label>
                <Select value={invoiceForm.case_id || "none"} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, case_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                    {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5"><Label>{ar ? "السعر الافتراضي/س" : "Default rate / hr"}</Label>
                <Input type="number" step="0.01" value={invoiceForm.default_rate} onChange={(e) => setInvoiceForm({ ...invoiceForm, default_rate: e.target.value })} placeholder={ar ? "يُستخدم إذا كان السجل بدون سعر" : "Used when entry has no rate"} />
              </div>
              <div className="space-y-1.5"><Label>{ar ? "الضريبة %" : "Tax %"}</Label>
                <Input type="number" step="0.01" value={invoiceForm.tax_rate} onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_rate: e.target.value })} placeholder={ar ? "افتراضي المؤسسة" : "Org default"} />
              </div>
              <div className="space-y-1.5"><Label>{ar ? "الاستحقاق" : "Due date"}</Label>
                <Input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5"><Label>{ar ? "ملاحظات" : "Notes"}</Label>
              <Textarea rows={2} value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInvoiceOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" disabled={creatingInvoice || !invoiceForm.client_name} onClick={async () => {
              setCreatingInvoice(true);
              try {
                await draftFromTime({ data: {
                  entry_ids: Array.from(selected),
                  client_name: invoiceForm.client_name,
                  client_id: invoiceForm.client_id || null,
                  case_id: invoiceForm.case_id || null,
                  tax_rate: invoiceForm.tax_rate ? Number(invoiceForm.tax_rate) : null,
                  default_rate: invoiceForm.default_rate ? Number(invoiceForm.default_rate) : null,
                  due_date: invoiceForm.due_date || null,
                  notes: invoiceForm.notes || undefined,
                }});
                toast.success(ar ? "تم إنشاء مسودة الفاتورة" : "Draft invoice created");
                setInvoiceOpen(false); setSelected(new Set()); refresh();
              } catch (e) { toast.error((e as Error).message); }
              finally { setCreatingInvoice(false); }
            }}>
              {creatingInvoice && <Loader2 className="size-4 animate-spin" />}{ar ? "إنشاء" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? (ar ? "تعديل السجل" : "Edit entry") : (ar ? "إدخال يدوي" : "Manual entry")}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5"><Label>{ar ? "الوصف" : "Description"}</Label><Textarea rows={2} value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{ar ? "القضية" : "Matter"}</Label>
                <Select value={editing?.case_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, case_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                    {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{ar ? "العميل" : "Client"}</Label>
                <Select value={editing?.client_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, client_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{ar ? "البداية" : "Start"}</Label>
                <Input type="datetime-local" value={editing?.started_at ? new Date(editing.started_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing!, started_at: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })} />
              </div>
              <div className="space-y-1.5"><Label>{ar ? "النهاية" : "End"}</Label>
                <Input type="datetime-local" value={editing?.ended_at ? new Date(editing.ended_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    const ended = e.target.value ? new Date(e.target.value).toISOString() : null;
                    const started = editing?.started_at ?? new Date().toISOString();
                    const dur = ended ? Math.max(0, Math.floor((new Date(ended).getTime() - new Date(started).getTime()) / 1000)) : 0;
                    setEditing({ ...editing!, ended_at: ended, duration_seconds: dur });
                  }} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5"><Label>{ar ? "المدة (دقائق)" : "Duration (min)"}</Label>
                <Input type="number" value={editing?.duration_seconds ? Math.round(editing.duration_seconds / 60) : 0}
                  onChange={(e) => setEditing({ ...editing!, duration_seconds: Math.max(0, Number(e.target.value) * 60) })} />
              </div>
              <div className="space-y-1.5"><Label>{ar ? "السعر/ساعة" : "Rate/hr"}</Label>
                <Input type="number" value={editing?.hourly_rate ?? ""} onChange={(e) => setEditing({ ...editing!, hourly_rate: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="space-y-1.5"><Label>{ar ? "العملة" : "Currency"}</Label>
                <Input value={editing?.currency ?? "USD"} onChange={(e) => setEditing({ ...editing!, currency: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={editing?.billable ?? true} onCheckedChange={(v) => setEditing({ ...editing!, billable: !!v })} />
              {ar ? "قابل للفوترة" : "Billable"}
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={submitEdit}>{ar ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingSingle} onOpenChange={(o) => { if (!o) setPendingSingle(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "حذف السجل؟" : "Delete entry?"}</AlertDialogTitle>
            <AlertDialogDescription>{ar ? "سيتم حذف هذا السجل نهائياً." : "This entry will be permanently deleted."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmSingle(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="size-4 animate-spin me-1.5" />}{ar ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingBulk} onOpenChange={(o) => { if (!o) setPendingBulk(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? `حذف ${selected.size} سجل؟` : `Delete ${selected.size} entries?`}</AlertDialogTitle>
            <AlertDialogDescription>{ar ? "سيتم حذف جميع السجلات المحددة نهائياً." : "All selected entries will be permanently deleted."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmBulk(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="size-4 animate-spin me-1.5" />}{ar ? "حذف الكل" : "Delete all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
