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
  listTimeEntries, saveTimeEntry, deleteTimeEntry,
  startTimer, stopTimer, getRunningTimer,
} from "@/lib/time-entries.functions";
import { listCases } from "@/lib/cases.functions";
import { listClients } from "@/lib/clients.functions";
import { Plus, Loader2, Pencil, Trash2, Play, Square, Clock, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/time")({ component: TimePage });

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
  const list = useServerFn(listTimeEntries);
  const save = useServerFn(saveTimeEntry);
  const del = useServerFn(deleteTimeEntry);
  const start = useServerFn(startTimer);
  const stop = useServerFn(stopTimer);
  const running = useServerFn(getRunningTimer);
  const lCases = useServerFn(listCases);
  const lClients = useServerFn(listClients);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [runningEntry, setRunningEntry] = useState<Entry | null>(null);
  const [now, setNow] = useState(Date.now());
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Entry> | null>(null);

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
  async function remove(id: string) {
    if (!confirm(ar ? "حذف السجل؟" : "Delete entry?")) return;
    try { await del({ data: { id } }); refresh(); } catch (e) { toast.error((e as Error).message); }
  }

  const filtered = useMemo(() => entries.filter((e) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return e.description.toLowerCase().includes(s)
      || (e.cases?.title ?? "").toLowerCase().includes(s)
      || (e.clients?.name ?? "").toLowerCase().includes(s);
  }), [entries, q]);

  const totals = useMemo(() => {
    const total = entries.reduce((acc, e) => acc + (e.duration_seconds || 0), 0);
    const billable = entries.filter((e) => e.billable).reduce((a, e) => a + (e.duration_seconds || 0), 0);
    const amount = entries.filter((e) => e.billable && e.hourly_rate).reduce((a, e) => a + ((e.duration_seconds / 3600) * (e.hourly_rate || 0)), 0);
    return { total, billable, amount };
  }, [entries]);

  const liveDuration = runningEntry
    ? Math.max(0, Math.floor((now - new Date(runningEntry.started_at).getTime()) / 1000))
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "تتبع الوقت" : "Time Tracking"}
        subtitle={ar ? `${entries.length} سجل` : `${entries.length} entries`}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setEditing({ started_at: new Date().toISOString(), duration_seconds: 0, billable: true, currency: "USD", status: "logged" }); setEditOpen(true); }}>
            <Plus className="size-4" />{ar ? "إدخال يدوي" : "Manual entry"}
          </Button>
        }
      />

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
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث…" : "Search…"} className="h-9 ps-9" />
          </div>
        </div>
        {loading ? <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">{ar ? "لا توجد سجلات بعد." : "No time entries yet."}</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr>
            <th className="px-5 py-3 text-start font-medium">{ar ? "التاريخ" : "Date"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "الوصف" : "Description"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "القضية" : "Matter"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "العميل" : "Client"}</th>
            <th className="px-5 py-3 text-end font-medium">{ar ? "المدة" : "Duration"}</th>
            <th className="px-5 py-3 text-end font-medium">{ar ? "المبلغ" : "Amount"}</th>
            <th className="px-5 py-3 text-end"></th>
          </tr></thead>
          <tbody className="divide-y">{filtered.map((e) => (
            <tr key={e.id} className="hover:bg-secondary/40">
              <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{new Date(e.started_at).toLocaleDateString()}</td>
              <td className="px-5 py-3">
                <div className="font-medium">{e.description || "—"}</div>
                {!e.billable && <div className="text-xs text-muted-foreground">{ar ? "غير قابل للفوترة" : "Non-billable"}</div>}
              </td>
              <td className="px-5 py-3 text-muted-foreground">{e.cases?.title ?? "—"}</td>
              <td className="px-5 py-3 text-muted-foreground">{e.clients?.name ?? "—"}</td>
              <td className="px-5 py-3 text-end tabular-nums">{formatDuration(e.duration_seconds)}</td>
              <td className="px-5 py-3 text-end tabular-nums">{e.billable && e.hourly_rate ? `$${((e.duration_seconds / 3600) * e.hourly_rate).toFixed(2)}` : "—"}</td>
              <td className="px-5 py-3 text-end">
                <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setEditOpen(true); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="size-4 text-destructive" /></Button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>}
      </div>

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
    </div>
  );
}
