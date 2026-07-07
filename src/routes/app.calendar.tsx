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
import { listAppointments, saveAppointment, deleteAppointment } from "@/lib/appointments.functions";
import { listCases } from "@/lib/cases.functions";
import { listClients } from "@/lib/clients.functions";
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock, MapPin, Loader2, Download, Filter } from "lucide-react";
import { toCsv, downloadCsv } from "@/lib/csv-export";

import { toast } from "sonner";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfDay,
  startOfMonth, startOfWeek, subMonths, subWeeks, parseISO,
} from "date-fns";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

type Appt = { id: string; title: string; description: string | null; starts_at: string; ends_at: string; location: string | null; kind: string; color: string | null; case_id: string | null; client_id: string | null };
type View = "month" | "week" | "day";

const KIND_COLORS: Record<string, string> = {
  court: "bg-red-500/20 text-red-700 border-red-500/40 dark:text-red-300",
  meeting: "bg-blue-500/20 text-blue-700 border-blue-500/40 dark:text-blue-300",
  deadline: "bg-amber-500/20 text-amber-700 border-amber-500/40 dark:text-amber-300",
  reminder: "bg-emerald-500/20 text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
};

function CalendarPage() {
  const { locale } = useI18n();
  const list = useServerFn(listAppointments);
  const save = useServerFn(saveAppointment);
  const del = useServerFn(deleteAppointment);
  const listC = useServerFn(listCases);
  const listCl = useServerFn(listClients);

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [cases, setCases] = useState<{ id: string; title: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Appt> | null>(null);
  const [open, setOpen] = useState(false);


  const range = useMemo(() => {
    if (view === "month") return { from: startOfWeek(startOfMonth(cursor)), to: endOfWeek(endOfMonth(cursor)) };
    if (view === "week") return { from: startOfWeek(cursor), to: endOfWeek(cursor) };
    return { from: startOfDay(cursor), to: addDays(startOfDay(cursor), 1) };
  }, [view, cursor]);

  async function refresh() {
    setLoading(true);
    try {
      const [a, c, cl] = await Promise.all([
        list({ data: { from: range.from.toISOString(), to: range.to.toISOString() } }),
        listC(), listCl(),
      ]);
      setAppts(a as Appt[]);
      setCases((c as any[]).map((x) => ({ id: x.id, title: x.title })));
      setClients((cl as any[]).map((x) => ({ id: x.id, name: x.name })));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [view, cursor.toDateString()]);

  function nav(dir: number) {
    if (view === "month") setCursor(dir > 0 ? addMonths(cursor, 1) : subMonths(cursor, 1));
    else if (view === "week") setCursor(dir > 0 ? addWeeks(cursor, 1) : subWeeks(cursor, 1));
    else setCursor(addDays(cursor, dir));
  }

  function openNewAt(date: Date) {
    const start = new Date(date); start.setHours(9, 0, 0, 0);
    const end = new Date(start); end.setHours(10, 0, 0, 0);
    setEditing({ title: "", starts_at: start.toISOString(), ends_at: end.toISOString(), kind: "meeting" });
    setOpen(true);
  }
  function openEdit(a: Appt) { setEditing(a); setOpen(true); }

  async function submit() {
    if (!editing?.title || !editing.starts_at || !editing.ends_at) { toast.error("Title, start and end required"); return; }
    try {
      await save({ data: {
        id: editing.id, title: editing.title!,
        starts_at: editing.starts_at!, ends_at: editing.ends_at!,
        all_day: false, location: editing.location ?? undefined,
        description: editing.description ?? undefined,
        kind: (editing.kind ?? "meeting") as any,
        case_id: editing.case_id ?? null, client_id: editing.client_id ?? null,
      }});
      setOpen(false); setEditing(null); refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(id: string) {
    if (!confirm("Delete event?")) return;
    try { await del({ data: { id } }); setOpen(false); refresh(); } catch (e) { toast.error((e as Error).message); }
  }

  const heading = view === "month" ? format(cursor, "MMMM yyyy") : view === "week" ? `${format(startOfWeek(cursor), "MMM d")} – ${format(endOfWeek(cursor), "MMM d, yyyy")}` : format(cursor, "EEEE, MMMM d, yyyy");

  const filteredAppts = appts;

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "التقويم" : "Calendar"}
        subtitle={locale === "ar" ? "جلسات المحاكم والمواعيد." : "Court hearings, meetings and deadlines."}
        actions={<Button variant="gold" size="sm" className="gap-1.5" onClick={() => openNewAt(new Date())}><Plus className="size-4" />{locale === "ar" ? "موعد جديد" : "New event"}</Button>}
      />



      <div className="card-elev rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ChevronLeft className="size-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" onClick={() => nav(1)}><ChevronRight className="size-4" /></Button>
            <div className="ms-2 font-serif text-xl">{heading}</div>
          </div>
          <div className="flex gap-1">
            {(["month","week","day"] as View[]).map((v) => (
              <Button key={v} size="sm" variant={view === v ? "default" : "ghost"} className="capitalize" onClick={() => setView(v)}>{v}</Button>
            ))}
          </div>
        </div>

        {loading ? <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div> :
        view === "month" ? <MonthView cursor={cursor} appts={filteredAppts} onSlotClick={openNewAt} onEventClick={openEdit} /> :
        view === "week" ? <WeekView cursor={cursor} appts={filteredAppts} onSlotClick={openNewAt} onEventClick={openEdit} /> :
        <DayView cursor={cursor} appts={filteredAppts} onSlotClick={openNewAt} onEventClick={openEdit} />}
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title *</Label><Input value={editing?.title ?? ""} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Starts *</Label><Input type="datetime-local" value={toLocalInput(editing?.starts_at)} onChange={(e) => setEditing({ ...editing!, starts_at: new Date(e.target.value).toISOString() })} /></div>
              <div><Label>Ends *</Label><Input type="datetime-local" value={toLocalInput(editing?.ends_at)} onChange={(e) => setEditing({ ...editing!, ends_at: new Date(e.target.value).toISOString() })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kind</Label>
                <Select value={editing?.kind ?? "meeting"} onValueChange={(v) => setEditing({ ...editing!, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["court","meeting","deadline","reminder"].map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Location</Label><Input value={editing?.location ?? ""} onChange={(e) => setEditing({ ...editing!, location: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Case</Label>
                <Select value={editing?.case_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, case_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Client</Label>
                <Select value={editing?.client_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, client_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            {editing?.id && <Button variant="ghost" className="me-auto" onClick={() => remove(editing!.id!)}><Trash2 className="size-4 text-destructive" /></Button>}
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function MonthView({ cursor, appts, onSlotClick, onEventClick }: { cursor: Date; appts: Appt[]; onSlotClick: (d: Date) => void; onEventClick: (a: Appt) => void }) {
  const start = startOfWeek(startOfMonth(cursor));
  const end = endOfWeek(endOfMonth(cursor));
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const dows = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div>
      <div className="grid grid-cols-7 border-b">{dows.map((d) => <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}</div>
      <div className="grid grid-cols-7 auto-rows-[110px]">
        {days.map((d, i) => {
          const dayAppts = appts.filter((a) => isSameDay(parseISO(a.starts_at), d));
          const isToday = isSameDay(d, new Date());
          return (
            <div key={i} className={`border-b border-e p-1.5 overflow-hidden transition-colors ${isSameMonth(d, cursor) ? "bg-card" : "bg-muted/30 text-muted-foreground"} hover:bg-secondary/50 cursor-pointer`} onClick={() => onSlotClick(d)}>
              <div className={`text-xs font-medium mb-1 ${isToday ? "text-gold" : ""}`}>{format(d, "d")}</div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map((a) => (
                  <div key={a.id} onClick={(e) => { e.stopPropagation(); onEventClick(a); }} className={`truncate rounded px-1.5 py-0.5 text-[11px] border ${KIND_COLORS[a.kind] ?? KIND_COLORS.meeting}`}>
                    {format(parseISO(a.starts_at), "HH:mm")} {a.title}
                  </div>
                ))}
                {dayAppts.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayAppts.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, appts, onSlotClick, onEventClick }: { cursor: Date; appts: Appt[]; onSlotClick: (d: Date) => void; onEventClick: (a: Appt) => void }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am-7pm
  return (
    <div className="overflow-auto max-h-[640px]">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-card z-10">
        <div></div>
        {days.map((d) => (<div key={d.toISOString()} className="py-2 text-center text-xs font-medium">{format(d, "EEE d")}</div>))}
      </div>
      {hours.map((h) => (
        <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
          <div className="border-e p-1.5 text-[11px] text-muted-foreground">{`${String(h).padStart(2, "0")}:00`}</div>
          {days.map((d) => {
            const slot = new Date(d); slot.setHours(h, 0, 0, 0);
            const slotAppts = appts.filter((a) => { const sd = parseISO(a.starts_at); return isSameDay(sd, d) && sd.getHours() === h; });
            return (
              <div key={d.toISOString() + h} className="min-h-[56px] border-e p-1 hover:bg-secondary/40 cursor-pointer relative" onClick={() => onSlotClick(slot)}>
                {slotAppts.map((a) => (
                  <div key={a.id} onClick={(e) => { e.stopPropagation(); onEventClick(a); }} className={`mb-0.5 truncate rounded px-1.5 py-1 text-[11px] border ${KIND_COLORS[a.kind] ?? KIND_COLORS.meeting}`}>
                    <div className="font-medium">{a.title}</div>
                    <div>{format(parseISO(a.starts_at), "HH:mm")}–{format(parseISO(a.ends_at), "HH:mm")}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DayView({ cursor, appts, onSlotClick, onEventClick }: { cursor: Date; appts: Appt[]; onSlotClick: (d: Date) => void; onEventClick: (a: Appt) => void }) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  const dayAppts = appts.filter((a) => isSameDay(parseISO(a.starts_at), cursor));
  return (
    <div className="overflow-auto max-h-[640px]">
      {hours.map((h) => {
        const slotAppts = dayAppts.filter((a) => parseISO(a.starts_at).getHours() === h);
        const slot = new Date(cursor); slot.setHours(h, 0, 0, 0);
        return (
          <div key={h} className="grid grid-cols-[80px_1fr] border-b">
            <div className="border-e p-2 text-xs text-muted-foreground">{`${String(h).padStart(2, "0")}:00`}</div>
            <div className="min-h-[60px] p-2 hover:bg-secondary/40 cursor-pointer" onClick={() => onSlotClick(slot)}>
              {slotAppts.map((a) => (
                <div key={a.id} onClick={(e) => { e.stopPropagation(); onEventClick(a); }} className={`mb-1 rounded px-3 py-2 text-sm border ${KIND_COLORS[a.kind] ?? KIND_COLORS.meeting}`}>
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs flex flex-wrap gap-3 mt-1">
                    <span className="flex items-center gap-1"><Clock className="size-3" />{format(parseISO(a.starts_at), "HH:mm")}–{format(parseISO(a.ends_at), "HH:mm")}</span>
                    {a.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{a.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
