import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listCases, saveCase, deleteCase } from "@/lib/cases.functions";
import { listClients, saveClient } from "@/lib/clients.functions";
import { Plus, Loader2, Pencil, Trash2, Search, UserPlus, Download, X } from "lucide-react";
import { toast } from "sonner";
import { toCsv, downloadCsv, inRange } from "@/lib/csv-export";
import { useOrg } from "@/lib/org-context";
import { PageSizeSelect, TablePager } from "@/components/data-table-pager";

export const Route = createFileRoute("/app/cases/")({ component: CasesPage });

type CaseRow = { id: string; title: string; case_number: string | null; court: string | null; court_room?: string | null; jurisdiction: string | null; status: string; priority: string | null; opened_at: string; client_id: string | null; description: string | null; clients?: { id: string; name: string } | null; judge?: string | null; opposing_party?: string | null; opposing_counsel?: string | null };
type ClientRow = { id: string; name: string };

// UI-level "final result" mapping. Under the hood we reuse the existing
// `status` enum values: won / lost / closed(=settled). "closed" acts as
// the neutral "settled/resolved" bucket without needing a schema change.
type CaseStage = "open" | "pending" | "closed";
type FinalResult = "won" | "lost" | "settled";

function stageOf(status: string): CaseStage {
  if (status === "open") return "open";
  if (status === "pending") return "pending";
  return "closed";
}
function finalResultOf(status: string): FinalResult | null {
  if (status === "won") return "won";
  if (status === "lost") return "lost";
  if (status === "closed") return "settled";
  return null;
}
function statusFrom(stage: CaseStage, result: FinalResult | null): string {
  if (stage !== "closed") return stage;
  if (result === "won") return "won";
  if (result === "lost") return "lost";
  return "closed"; // settled
}

function CasesPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const list = useServerFn(listCases);
  const save = useServerFn(saveCase);
  const del = useServerFn(deleteCase);
  const listC = useServerFn(listClients);
  const saveC = useServerFn(saveClient);

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CaseRow> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CaseRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClient, setQuickClient] = useState<{ name: string; email: string; phone: string; company: string; type: "individual" | "company" }>({ name: "", email: "", phone: "", company: "", type: "individual" });
  const [quickBusy, setQuickBusy] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  async function refresh() {
    setLoading(true);
    try {
      const [cs, cls] = await Promise.all([list(), listC()]);
      setCases(cs as CaseRow[]);
      setClients((cls as any[]).map((c) => ({ id: c.id, name: c.name })));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  const { org: activeOrg } = useOrg();
  useEffect(() => { refresh(); }, [activeOrg?.id]);

  const filtered = useMemo(() => cases.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (clientFilter !== "all") {
      if (clientFilter === "none" ? c.client_id : c.client_id !== clientFilter) return false;
    }
    if ((fromDate || toDate) && !inRange(c.opened_at, fromDate, toDate)) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return c.title.toLowerCase().includes(s)
      || (c.case_number ?? "").toLowerCase().includes(s)
      || (c.clients?.name ?? "").toLowerCase().includes(s);
  }), [cases, q, status, clientFilter, fromDate, toDate]);

  const analytics = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter((c) => c.status === "open").length;
    const pending = filtered.filter((c) => c.status === "pending").length;
    const closed = filtered.filter((c) => ["closed","won","lost"].includes(c.status)).length;
    const won = filtered.filter((c) => c.status === "won").length;
    const lost = filtered.filter((c) => c.status === "lost").length;
    const settled = filtered.filter((c) => c.status === "closed").length;
    const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    return { total, open, pending, closed, won, lost, settled, winRate };
  }, [filtered]);

  async function submit() {
    if (!editing?.title) { toast.error(ar ? "العنوان مطلوب" : "Title is required"); return; }
    const isNew = !editing.id;
    try {
      await save({ data: {
        id: editing.id, title: editing.title!, case_number: editing.case_number ?? undefined,
        court: editing.court ?? undefined, court_room: editing.court_room ?? undefined,
        jurisdiction: editing.jurisdiction ?? undefined,
        status: (editing.status ?? "open") as any, priority: (editing.priority ?? "medium") as any,
        description: editing.description ?? undefined, client_id: editing.client_id ?? null,
        judge: editing.judge ?? undefined,
        opposing_party: editing.opposing_party ?? undefined,
        opposing_counsel: editing.opposing_counsel ?? undefined,
        locale,
      }});

      setEditOpen(false); setEditing(null); refresh();
      toast.success(isNew
        ? (ar ? "تم إضافة القضية بنجاح" : "Case added successfully")
        : (ar ? "تم حفظ التغييرات بنجاح" : "Case saved successfully"));
    } catch (e) {
      toast.error((isNew ? (ar ? "فشل إضافة القضية: " : "Failed to add case: ")
        : (ar ? "فشل الحفظ: " : "Save failed: ")) + (e as Error).message);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await del({ data: { id: pendingDelete.id } });
      toast.success(ar ? "تم حذف القضية بنجاح" : "Case deleted successfully");
      setPendingDelete(null); refresh();
    } catch (e) {
      toast.error((ar ? "فشل الحذف: " : "Delete failed: ") + (e as Error).message);
    } finally { setDeleting(false); }
  }

  async function submitQuickClient() {
    if (!quickClient.name.trim()) { toast.error(ar ? "الاسم مطلوب" : "Name is required"); return; }
    setQuickBusy(true);
    try {
      const row: any = await saveC({ data: {
        name: quickClient.name.trim(),
        email: quickClient.email, phone: quickClient.phone,
        company: quickClient.company, type: quickClient.type, status: "active",
        locale,
      }});

      const newClient = { id: row.id as string, name: row.name as string };
      setClients((prev) => [newClient, ...prev]);
      setEditing((prev) => ({ ...(prev ?? {}), client_id: newClient.id }));
      setQuickClient({ name: "", email: "", phone: "", company: "", type: "individual" });
      setQuickClientOpen(false);
      toast.success(ar ? "تم إضافة الموكل بنجاح" : "Client added successfully");
    } catch (e) {
      toast.error((ar ? "فشل إضافة الموكل: " : "Failed to add client: ") + (e as Error).message);
    } finally { setQuickBusy(false); }
  }

  const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
    all: { ar: "الكل", en: "All" },
    open: { ar: "مفتوحة", en: "Open" },
    pending: { ar: "قيد الانتظار", en: "Pending" },
    closed: { ar: "مغلقة/مسواة", en: "Settled" },
    won: { ar: "ربح", en: "Won" },
    lost: { ar: "خسارة", en: "Lost" },
  };
  const PRIORITY_LABELS: Record<string, { ar: string; en: string }> = {
    low: { ar: "منخفضة", en: "Low" }, medium: { ar: "متوسطة", en: "Medium" },
    high: { ar: "عالية", en: "High" }, urgent: { ar: "عاجلة", en: "Urgent" },
  };
  const tr = (m: Record<string, { ar: string; en: string }>, k: string) => m[k]?.[ar ? "ar" : "en"] ?? k;
  const statuses = ["all", "open", "pending", "closed", "won", "lost"];

  function exportCsv() {
    const headers = ["Ref","Title","Client","Status","Final result","Priority","Court","Court room","Jurisdiction","Judge","Opposing party","Opposing counsel","Created at","Description"];
    const rows = filtered.map((c) => [
      c.case_number ?? "", c.title, c.clients?.name ?? "", c.status,
      finalResultOf(c.status) ?? "", c.priority ?? "", c.court ?? "", c.court_room ?? "",
      c.jurisdiction ?? "", c.judge ?? "", c.opposing_party ?? "", c.opposing_counsel ?? "",
      new Date(c.opened_at).toISOString(), c.description ?? "",
    ]);
    downloadCsv(`cases-${new Date().toISOString().slice(0,10)}.csv`, toCsv(headers, rows));
    toast.success(ar ? `تم تصدير ${rows.length} قضية` : `Exported ${rows.length} cases`);
  }

  function clearFilters() {
    setQ(""); setStatus("all"); setClientFilter("all"); setFromDate(""); setToDate("");
  }
  const hasFilters = q || status !== "all" || clientFilter !== "all" || fromDate || toDate;

  // Modal-scoped stage/result state derived from editing.status
  const editingStage = stageOf(editing?.status ?? "open");
  const editingResult = finalResultOf(editing?.status ?? "open");

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "إدارة القضايا" : "Case Management"}
        subtitle={ar ? `${cases.length} قضية` : `${cases.length} matters`}
        actions={<Button variant="gold" size="sm" className="gap-1.5" onClick={() => { setEditing({}); setEditOpen(true); }}><Plus className="size-4" />{ar ? "قضية جديدة" : "New matter"}</Button>}
      />

      {/* Analytics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: ar ? "الإجمالي" : "Total", v: analytics.total },
          { l: ar ? "مفتوحة" : "Open", v: analytics.open },
          { l: ar ? "قيد الانتظار" : "Pending", v: analytics.pending },
          { l: ar ? "مغلقة" : "Closed", v: analytics.closed },
          { l: ar ? "ربح" : "Won", v: analytics.won, tone: "text-success" },
          { l: ar ? "خسارة" : "Lost", v: analytics.lost, tone: "text-destructive" },
          { l: ar ? "مسواة" : "Settled", v: analytics.settled },
          { l: ar ? "معدل الربح" : "Win rate", v: `${analytics.winRate}%`, tone: "text-gold" },
        ].map((t, i) => (
          <div key={i} className="card-elev rounded-xl border bg-card p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.l}</div>
            <div className={`mt-1 font-serif text-2xl tabular-nums ${t.tone ?? ""}`}>{t.v}</div>
          </div>
        ))}
      </div>

      <div className="card-elev rounded-xl border bg-card">
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث بالعنوان، الرقم، الموكل…" : "Search title, ref, client…"} className="h-9 ps-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{ar ? "الموكل" : "Client"}</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? "كل الموكلين" : "All clients"}</SelectItem>
                  <SelectItem value="none">{ar ? "بدون موكل" : "No client"}</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{ar ? "من تاريخ" : "From"}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{ar ? "إلى تاريخ" : "To"}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-[160px]" />
            </div>
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1.5">
                <X className="size-3.5" />{ar ? "مسح" : "Clear"}
              </Button>
            )}
            <div className="ms-auto">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download className="size-4" />{ar ? "تصدير CSV" : "Export CSV"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "ghost"} onClick={() => setStatus(s)}>{tr(STATUS_LABELS, s)}</Button>
            ))}
          </div>
        </div>

        {loading ? <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm">{ar ? "لا توجد قضايا مطابقة." : "No matching cases."}</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr>
              <th className="px-5 py-3 text-start font-medium">{ar ? "الرقم" : "Ref"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "الموكل" : "Client"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "العنوان" : "Title"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "المحكمة" : "Court"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "الحالة" : "Status"}</th>
              <th className="px-5 py-3 text-start font-medium whitespace-nowrap">{ar ? "تاريخ الإنشاء" : "Created"}</th>
              <th className="px-5 py-3 text-end"></th>
            </tr></thead>
            <tbody className="divide-y">{filtered.map((c) => (
              <tr key={c.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => navigate({ to: "/app/cases/$caseId", params: { caseId: c.id } })}>
                <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{c.case_number || "—"}</td>
                <td className="px-5 py-4 text-muted-foreground">{c.clients?.name ?? "—"}</td>
                <td className="px-5 py-4 font-medium">{c.title}</td>
                <td className="px-5 py-4 text-muted-foreground">{c.court ?? "—"}</td>
                <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                <td className="px-5 py-4 text-muted-foreground whitespace-nowrap tabular-nums text-xs">
                  {new Date(c.opened_at).toLocaleDateString()}
                  <span className="ms-1 opacity-60">{new Date(c.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </td>
                <td className="px-5 py-4 text-end" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setEditOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setPendingDelete(c)}><Trash2 className="size-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? (ar ? "تعديل القضية" : "Edit case") : (ar ? "قضية جديدة" : "New case")}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5"><Label>{ar ? "العنوان *" : "Title *"}</Label><Input value={editing?.title ?? ""} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{ar ? "رقم القضية" : "Case number"}</Label><Input value={editing?.case_number ?? ""} onChange={(e) => setEditing({ ...editing!, case_number: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{ar ? "الاختصاص" : "Jurisdiction"}</Label><Input value={editing?.jurisdiction ?? ""} onChange={(e) => setEditing({ ...editing!, jurisdiction: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{ar ? "المحكمة" : "Court"}</Label><Input value={editing?.court ?? ""} onChange={(e) => setEditing({ ...editing!, court: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{ar ? "القاعة" : "Court room"}</Label><Input value={editing?.court_room ?? ""} onChange={(e) => setEditing({ ...editing!, court_room: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{ar ? "القاضي" : "Judge"}</Label><Input value={editing?.judge ?? ""} onChange={(e) => setEditing({ ...editing!, judge: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{ar ? "الموكل" : "Client"}</Label>
                <Select value={editing?.client_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, client_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="p-1 border-b mb-1">
                      <button type="button"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setQuickClientOpen(true); }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-gold hover:bg-gold/10 focus:bg-gold/10 outline-none">
                        <UserPlus className="size-4" />
                        {ar ? "إضافة موكل جديد" : "Add new client"}
                      </button>
                    </div>
                    <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{ar ? "الطرف المعارض" : "Opposing party"}</Label><Input value={editing?.opposing_party ?? ""} onChange={(e) => setEditing({ ...editing!, opposing_party: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{ar ? "محامي الخصم" : "Opposing counsel"}</Label><Input value={editing?.opposing_counsel ?? ""} onChange={(e) => setEditing({ ...editing!, opposing_counsel: e.target.value })} /></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{ar ? "المرحلة" : "Stage"}</Label>
                <Select value={editingStage} onValueChange={(v) => {
                  const nextStage = v as CaseStage;
                  // When leaving "closed", drop any final result choice.
                  const nextStatus = statusFrom(nextStage, nextStage === "closed" ? (editingResult ?? "settled") : null);
                  setEditing({ ...editing!, status: nextStatus });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{ar ? "مفتوحة" : "Open"}</SelectItem>
                    <SelectItem value="pending">{ar ? "قيد الانتظار" : "Pending"}</SelectItem>
                    <SelectItem value="closed">{ar ? "إغلاق" : "Close case"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{ar ? "الأولوية" : "Priority"}</Label>
                <Select value={editing?.priority ?? "medium"} onValueChange={(v) => setEditing({ ...editing!, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","urgent"].map((p) => <SelectItem key={p} value={p}>{tr(PRIORITY_LABELS, p)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {editingStage === "closed" && (
              <div className="space-y-1.5 rounded-lg border border-gold/40 bg-gold/5 p-3">
                <Label className="text-gold">{ar ? "النتيجة النهائية *" : "Final result *"}</Label>
                <Select value={editingResult ?? "settled"} onValueChange={(v) => {
                  setEditing({ ...editing!, status: statusFrom("closed", v as FinalResult) });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">{ar ? "ربح" : "Won"}</SelectItem>
                    <SelectItem value="lost">{ar ? "خسارة" : "Lost"}</SelectItem>
                    <SelectItem value="settled">{ar ? "تسوية / مغلقة" : "Settled / Closed"}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {ar ? "يتم تسجيل النتيجة النهائية فقط عند إغلاق القضية." : "Final result is recorded only when closing the case."}
                </p>
              </div>
            )}

            <div className="space-y-1.5"><Label>{ar ? "الوصف" : "Description"}</Label><Textarea rows={3} value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button><Button variant="gold" onClick={submit}>{ar ? "حفظ" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickClientOpen} onOpenChange={setQuickClientOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "موكل جديد" : "New client"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{ar ? "النوع" : "Type"}</Label>
                <Select value={quickClient.type} onValueChange={(v) => setQuickClient({ ...quickClient, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{ar ? "فرد" : "Individual"}</SelectItem>
                    <SelectItem value="company">{ar ? "شركة" : "Company"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{ar ? "الشركة" : "Company"}</Label><Input value={quickClient.company} onChange={(e) => setQuickClient({ ...quickClient, company: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>{ar ? "الاسم *" : "Name *"}</Label><Input value={quickClient.name} onChange={(e) => setQuickClient({ ...quickClient, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{ar ? "البريد" : "Email"}</Label><Input type="email" value={quickClient.email} onChange={(e) => setQuickClient({ ...quickClient, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{ar ? "الهاتف" : "Phone"}</Label><Input value={quickClient.phone} onChange={(e) => setQuickClient({ ...quickClient, phone: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuickClientOpen(false)} disabled={quickBusy}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={submitQuickClient} disabled={quickBusy}>
              {quickBusy && <Loader2 className="size-4 animate-spin me-1.5" />}
              {ar ? "إضافة الموكل" : "Add client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "حذف القضية؟" : "Delete case?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar
                ? `سيتم حذف "${pendingDelete?.title ?? ""}" وجميع بياناتها المرتبطة نهائياً. لا يمكن التراجع.`
                : `"${pendingDelete?.title ?? ""}" and all its related data will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="size-4 animate-spin me-1.5" />}
              {ar ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
