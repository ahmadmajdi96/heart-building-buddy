import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { listDeadlines, saveDeadline, completeDeadline, deleteDeadline, deadlineStats } from "@/lib/deadlines.functions";
import { listCases } from "@/lib/cases.functions";
import { listClients } from "@/lib/clients.functions";
import { AlertTriangle, CalendarClock, Check, Loader2, Plus, Trash2, Pencil, Gavel, FileSignature, Scale, Download } from "lucide-react";
import { toast } from "sonner";
import { toCsv, downloadCsv } from "@/lib/csv-export";

export const Route = createFileRoute("/app/deadlines")({ component: DeadlinesPage });

const KINDS = [
  { v: "hearing", ar: "جلسة", en: "Hearing", icon: Gavel },
  { v: "filing", ar: "إيداع", en: "Filing", icon: FileSignature },
  { v: "appeal", ar: "استئناف", en: "Appeal", icon: Scale },
  { v: "limitation", ar: "تقادم", en: "Limitation", icon: AlertTriangle },
  { v: "follow_up", ar: "متابعة", en: "Follow-up", icon: CalendarClock },
  { v: "deadline", ar: "موعد نهائي", en: "Deadline", icon: CalendarClock },
];

function DeadlinesPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listDeadlines);
  const stats = useServerFn(deadlineStats);
  const save = useServerFn(saveDeadline);
  const done = useServerFn(completeDeadline);
  const del = useServerFn(deleteDeadline);
  const lCases = useServerFn(listCases);
  const lClients = useServerFn(listClients);

  const [rows, setRows] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<{ today: any[]; week: any[]; overdue: any[] } | null>(null);
  const [cases, setCases] = useState<Array<{ id: string; title: string; client_id: string | null }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterCase, setFilterCase] = useState<string>("all");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [es, st, cs, cls] = await Promise.all([
        list({ data: { status: filterStatus === "all" ? undefined : (filterStatus as any), case_id: filterCase === "all" ? undefined : filterCase } }),
        stats(),
        lCases(),
        lClients(),
      ]);
      setRows(es as any[]);
      setStatsData(st as any);
      setCases((cs as any[]).map((c) => ({ id: c.id, title: c.title, client_id: c.client_id ?? null })));
      setClients((cls as any[]).map((c) => ({ id: c.id, name: c.name })));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [filterStatus, filterCase]);

  // Cases available in the toolbar case filter, filtered by selected client.
  const casesForFilter = useMemo(
    () => filterClient === "all" ? cases : cases.filter((c) => c.client_id === filterClient),
    [cases, filterClient],
  );
  // Cases available in the edit dialog, filtered by client selected inside the dialog.
  const casesForDialog = useMemo(() => {
    const cid = editing?.client_id;
    return cid ? cases.filter((c) => c.client_id === cid) : cases;
  }, [cases, editing?.client_id]);

  function openNew() {
    setEditing({
      kind: "deadline", title: "", due_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
      case_id: "", description: "", location: "", court: "", reminder_days: [7, 3, 1],
    });
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editing?.title || !editing?.due_at) {
      toast.error(ar ? "العنوان والتاريخ مطلوبان" : "Title and due date are required");
      return;
    }
    setBusy(true);
    try {
      await save({ data: {
        id: editing.id || undefined,
        kind: editing.kind,
        title: editing.title,
        case_id: editing.case_id || null,
        description: editing.description || null,
        location: editing.location || null,
        court: editing.court || null,
        due_at: new Date(editing.due_at).toISOString(),
        reminder_days: editing.reminder_days,
        assigned_to: editing.assigned_to || null,
      }});
      toast.success(ar ? "تم الحفظ" : "Saved");
      setEditOpen(false); setEditing(null); refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const kindMeta = (k: string) => KINDS.find((x) => x.v === k) ?? KINDS[KINDS.length - 1];
  const kindLabel = (k: string) => { const m = kindMeta(k); return ar ? m.ar : m.en; };

  const filteredRows = useMemo(() => {
    const fromMs = fromDate ? new Date(fromDate).getTime() : null;
    const toMs = toDate ? (() => { const d = new Date(toDate); d.setHours(23,59,59,999); return d.getTime(); })() : null;
    return rows.filter((r) => {
      if (filterKind !== "all" && r.kind !== filterKind) return false;
      const t = new Date(r.due_at).getTime();
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
      return true;
    });
  }, [rows, filterKind, fromDate, toDate]);

  const groups = useMemo(() => {
    const now = Date.now();
    const eod = new Date(); eod.setHours(23, 59, 59, 999);
    const week = now + 7 * 86400000;
    const overdue: any[] = [], today: any[] = [], soon: any[] = [], later: any[] = [], completed: any[] = [];
    for (const r of filteredRows) {
      const t = new Date(r.due_at).getTime();
      if (r.status === "completed") completed.push(r);
      else if (t < now) overdue.push(r);
      else if (t <= eod.getTime()) today.push(r);
      else if (t <= week) soon.push(r);
      else later.push(r);
    }
    return { overdue, today, soon, later, completed };
  }, [filteredRows]);

  function handleExport() {
    const caseMap = new Map(cases.map((c) => [c.id, c.title] as const));
    const headers = ["Kind","Title","Due at","Status","Matter","Court","Notes"];
    const csv = toCsv(headers, filteredRows.map((r) => [
      kindLabel(r.kind), r.title, new Date(r.due_at).toISOString(),
      r.status, r.case_id ? (caseMap.get(r.case_id) ?? "") : "",
      r.court ?? "", (r.description ?? "").replace(/\s+/g, " "),
    ]));
    downloadCsv(`deadlines-${new Date().toISOString().slice(0,10)}.csv`, csv);
    toast.success(ar ? `تم تصدير ${filteredRows.length} موعد` : `Exported ${filteredRows.length} deadlines`);
  }

  const hasExtraFilters = filterKind !== "all" || fromDate || toDate;


  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "المواعيد والجلسات" : "Deadlines & Hearings"}
        subtitle={ar ? "تتبع جلسات المحكمة، الإيداعات، وأي مواعيد قانونية حساسة" : "Court hearings, filings and any time-critical legal deadlines"}
        actions={<Button variant="gold" size="sm" className="gap-1.5" onClick={openNew}><Plus className="size-4" />{ar ? "إضافة موعد" : "Add deadline"}</Button>}
      />

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile color="destructive" label={ar ? "متأخرة" : "Overdue"} value={statsData?.overdue.length ?? 0} icon={<AlertTriangle className="size-5" />} />
        <Tile color="gold" label={ar ? "اليوم" : "Due today"} value={statsData?.today.length ?? 0} icon={<CalendarClock className="size-5" />} />
        <Tile color="primary" label={ar ? "خلال أسبوع" : "Due this week"} value={statsData?.week.length ?? 0} icon={<CalendarClock className="size-5" />} />
      </div>

      {/* Filters + export */}
      <div className="card-elev rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{ar ? "الحالة" : "Status"}</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{ar ? "مفتوحة" : "Open"}</SelectItem>
                <SelectItem value="completed">{ar ? "مكتملة" : "Completed"}</SelectItem>
                <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{ar ? "النوع" : "Kind"}</Label>
            <Select value={filterKind} onValueChange={setFilterKind}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
                {KINDS.map((k) => <SelectItem key={k.v} value={k.v}>{ar ? k.ar : k.en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{ar ? "القضية" : "Matter"}</Label>
            <Select value={filterCase} onValueChange={setFilterCase}>
              <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "الكل" : "All matters"}</SelectItem>
                {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{ar ? "من تاريخ" : "From"}</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{ar ? "إلى تاريخ" : "To"}</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-[150px]" />
          </div>
          {hasExtraFilters && (
            <Button size="sm" variant="ghost" onClick={() => { setFilterKind("all"); setFromDate(""); setToDate(""); }}>
              {ar ? "مسح" : "Clear"}
            </Button>
          )}
          <div className="ms-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">{filteredRows.length} / {rows.length}</span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExport} disabled={filteredRows.length === 0}>
              <Download className="size-4" />{ar ? "تصدير CSV" : "Export CSV"}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
      ) : rows.length === 0 ? (
        <div className="card-elev rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد مواعيد. ابدأ بإضافة جلسة أو موعد." : "No deadlines yet. Add a hearing or deadline to begin."}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.overdue.length > 0 && <Group title={ar ? "متأخرة" : "Overdue"} tone="destructive" items={groups.overdue} kindLabel={kindLabel} kindMeta={kindMeta} ar={ar} onEdit={(r) => { setEditing({ ...r, due_at: new Date(r.due_at).toISOString().slice(0, 16) }); setEditOpen(true); }} onDone={async (id) => { try { await done({ data: { id, completed: true } }); toast.success(ar ? "تم الإكمال" : "Marked complete"); refresh(); } catch (e) { toast.error((e as Error).message); } }} onDel={async (id) => { if (!confirm(ar ? "حذف؟" : "Delete?")) return; try { await del({ data: { id } }); toast.success(ar ? "تم الحذف" : "Deleted"); refresh(); } catch (e) { toast.error((e as Error).message); } }} />}
          {groups.today.length > 0 && <Group title={ar ? "اليوم" : "Today"} tone="gold" items={groups.today} kindLabel={kindLabel} kindMeta={kindMeta} ar={ar} onEdit={(r) => { setEditing({ ...r, due_at: new Date(r.due_at).toISOString().slice(0, 16) }); setEditOpen(true); }} onDone={async (id) => { try { await done({ data: { id, completed: true } }); toast.success(ar ? "تم الإكمال" : "Marked complete"); refresh(); } catch (e) { toast.error((e as Error).message); } }} onDel={async (id) => { if (!confirm(ar ? "حذف؟" : "Delete?")) return; try { await del({ data: { id } }); toast.success(ar ? "تم الحذف" : "Deleted"); refresh(); } catch (e) { toast.error((e as Error).message); } }} />}
          {groups.soon.length > 0 && <Group title={ar ? "هذا الأسبوع" : "This week"} tone="primary" items={groups.soon} kindLabel={kindLabel} kindMeta={kindMeta} ar={ar} onEdit={(r) => { setEditing({ ...r, due_at: new Date(r.due_at).toISOString().slice(0, 16) }); setEditOpen(true); }} onDone={async (id) => { try { await done({ data: { id, completed: true } }); toast.success(ar ? "تم الإكمال" : "Marked complete"); refresh(); } catch (e) { toast.error((e as Error).message); } }} onDel={async (id) => { if (!confirm(ar ? "حذف؟" : "Delete?")) return; try { await del({ data: { id } }); toast.success(ar ? "تم الحذف" : "Deleted"); refresh(); } catch (e) { toast.error((e as Error).message); } }} />}
          {groups.later.length > 0 && <Group title={ar ? "لاحقًا" : "Upcoming"} tone="muted" items={groups.later} kindLabel={kindLabel} kindMeta={kindMeta} ar={ar} onEdit={(r) => { setEditing({ ...r, due_at: new Date(r.due_at).toISOString().slice(0, 16) }); setEditOpen(true); }} onDone={async (id) => { try { await done({ data: { id, completed: true } }); toast.success(ar ? "تم الإكمال" : "Marked complete"); refresh(); } catch (e) { toast.error((e as Error).message); } }} onDel={async (id) => { if (!confirm(ar ? "حذف؟" : "Delete?")) return; try { await del({ data: { id } }); toast.success(ar ? "تم الحذف" : "Deleted"); refresh(); } catch (e) { toast.error((e as Error).message); } }} />}
          {groups.completed.length > 0 && <Group title={ar ? "مكتملة" : "Completed"} tone="muted" items={groups.completed} kindLabel={kindLabel} kindMeta={kindMeta} ar={ar} muted onEdit={(r) => { setEditing({ ...r, due_at: new Date(r.due_at).toISOString().slice(0, 16) }); setEditOpen(true); }} onDone={async (id) => { try { await done({ data: { id, completed: false } }); toast.success(ar ? "أُعيد فتحه" : "Reopened"); refresh(); } catch (e) { toast.error((e as Error).message); } }} onDel={async (id) => { if (!confirm(ar ? "حذف؟" : "Delete?")) return; try { await del({ data: { id } }); toast.success(ar ? "تم الحذف" : "Deleted"); refresh(); } catch (e) { toast.error((e as Error).message); } }} />}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? (ar ? "تعديل موعد" : "Edit deadline") : (ar ? "موعد جديد" : "New deadline")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{ar ? "النوع" : "Type"}</Label>
                  <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KINDS.map((k) => <SelectItem key={k.v} value={k.v}>{ar ? k.ar : k.en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{ar ? "القضية" : "Matter"}</Label>
                  <Select value={editing.case_id || "none"} onValueChange={(v) => setEditing({ ...editing, case_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                      {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>{ar ? "العنوان *" : "Title *"}</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>{ar ? "تاريخ الاستحقاق *" : "Due date *"}</Label><Input type="datetime-local" value={editing.due_at} onChange={(e) => setEditing({ ...editing, due_at: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{ar ? "المحكمة / المكان" : "Court / location"}</Label><Input value={editing.court || ""} onChange={(e) => setEditing({ ...editing, court: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>{ar ? "تفاصيل" : "Notes"}</Label><Textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>{ar ? "تذكيرات (أيام قبل)" : "Reminders (days before)"}</Label>
                <Input value={(editing.reminder_days ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, reminder_days: e.target.value.split(",").map((x: string) => Number(x.trim())).filter((n: number) => !isNaN(n) && n >= 0) })} placeholder="7, 3, 1" />
                <p className="text-xs text-muted-foreground">{ar ? "افصل بين الأيام بفاصلة." : "Comma-separated. Defaults to 7, 3, 1."}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" disabled={busy} onClick={submitEdit}>{busy && <Loader2 className="size-4 animate-spin" />}{ar ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: "destructive" | "gold" | "primary" }) {
  const tones: Record<string, string> = {
    destructive: "bg-destructive/12 text-destructive ring-destructive/30",
    gold: "bg-gold/15 text-gold ring-gold/30",
    primary: "bg-primary/12 text-primary ring-primary/30",
  };
  return (
    <div className="card-elev rounded-xl border bg-card p-5 flex items-center gap-4">
      <div className={`inline-grid size-11 place-items-center rounded-full ring-1 ${tones[color]}`}>{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-serif text-2xl tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function Group({ title, tone, items, kindLabel, kindMeta, ar, muted, onEdit, onDone, onDel }: {
  title: string; tone: "destructive" | "gold" | "primary" | "muted"; items: any[];
  kindLabel: (k: string) => string; kindMeta: (k: string) => { icon: any }; ar: boolean; muted?: boolean;
  onEdit: (r: any) => void; onDone: (id: string) => void; onDel: (id: string) => void;
}) {
  const dot: Record<string, string> = {
    destructive: "bg-destructive", gold: "bg-gold", primary: "bg-primary", muted: "bg-muted-foreground/50",
  };
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
        <span className={`size-2 rounded-full ${dot[tone] || dot.muted}`} />
        {title}
        <span className="text-xs font-normal text-muted-foreground">· {items.length}</span>
      </h3>
      <div className="card-elev rounded-xl border bg-card">
        <ul className="divide-y">
          {items.map((r: any) => {
            const KIcon = kindMeta(r.kind).icon;
            const due = new Date(r.due_at);
            return (
              <li key={r.id} className={`flex items-start justify-between gap-3 p-4 ${muted ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="inline-grid size-9 place-items-center rounded-full bg-secondary text-foreground/70 shrink-0"><KIcon className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-gold">{kindLabel(r.kind)}</span>
                      {r.cases?.title && <Link to="/app/cases/$caseId" params={{ caseId: r.case_id }} className="text-xs text-muted-foreground hover:text-foreground">· {r.cases.title}</Link>}
                    </div>
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {due.toLocaleString()}{r.court ? ` · ${r.court}` : ""}
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-2">{r.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => onDone(r.id)} title={r.status === "completed" ? (ar ? "إعادة فتح" : "Reopen") : (ar ? "إكمال" : "Complete")}>
                    <Check className={`size-4 ${r.status === "completed" ? "text-success" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(r)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDel(r.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
