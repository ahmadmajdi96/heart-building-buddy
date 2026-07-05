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
import { Plus, Loader2, Pencil, Trash2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/cases/")({ component: CasesPage });

type CaseRow = { id: string; title: string; case_number: string | null; court: string | null; court_room?: string | null; jurisdiction: string | null; status: string; priority: string | null; opened_at: string; client_id: string | null; description: string | null; clients?: { id: string; name: string } | null; judge?: string | null; opposing_party?: string | null; opposing_counsel?: string | null };
type ClientRow = { id: string; name: string };

function CasesPage() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const list = useServerFn(listCases);
  const save = useServerFn(saveCase);
  const del = useServerFn(deleteCase);
  const listC = useServerFn(listClients);

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CaseRow> | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [cs, cls] = await Promise.all([list(), listC()]);
      setCases(cs as CaseRow[]);
      setClients((cls as any[]).map((c) => ({ id: c.id, name: c.name })));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => cases.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return c.title.toLowerCase().includes(s) || (c.case_number ?? "").toLowerCase().includes(s);
  }), [cases, q, status]);

  async function submit() {
    if (!editing?.title) { toast.error(locale === "ar" ? "العنوان مطلوب" : "Title required"); return; }
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
      }});
      setEditOpen(false); setEditing(null); refresh();
      toast.success(locale === "ar" ? "تم الحفظ" : "Saved");
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(id: string) {
    if (!confirm(locale === "ar" ? "حذف هذه القضية؟" : "Delete this case?")) return;
    try { await del({ data: { id } }); refresh(); } catch (e) { toast.error((e as Error).message); }
  }

  const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
    all: { ar: "الكل", en: "All" },
    open: { ar: "مفتوحة", en: "Open" },
    pending: { ar: "قيد الانتظار", en: "Pending" },
    closed: { ar: "مغلقة", en: "Closed" },
    won: { ar: "ربح", en: "Won" },
    lost: { ar: "خسارة", en: "Lost" },
  };
  const PRIORITY_LABELS: Record<string, { ar: string; en: string }> = {
    low: { ar: "منخفضة", en: "Low" },
    medium: { ar: "متوسطة", en: "Medium" },
    high: { ar: "عالية", en: "High" },
    urgent: { ar: "عاجلة", en: "Urgent" },
  };
  const tr = (m: Record<string, { ar: string; en: string }>, k: string) => m[k]?.[locale === "ar" ? "ar" : "en"] ?? k;
  const statuses = ["all", "open", "pending", "closed", "won", "lost"];

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "إدارة القضايا" : "Case Management"}
        subtitle={locale === "ar" ? `${cases.length} قضية` : `${cases.length} matters`}
        actions={<Button variant="gold" size="sm" className="gap-1.5" onClick={() => { setEditing({}); setEditOpen(true); }}><Plus className="size-4" />{locale === "ar" ? "قضية جديدة" : "New matter"}</Button>}
      />

      <div className="card-elev rounded-xl border bg-card">
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={locale === "ar" ? "ابحث…" : "Search…"} className="h-9 ps-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "ghost"} onClick={() => setStatus(s)}>{tr(STATUS_LABELS, s)}</Button>
            ))}
          </div>
        </div>

        {loading ? <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm">{locale === "ar" ? "لا توجد قضايا بعد." : "No cases yet — add your first matter."}</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الرقم" : "Ref"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "العنوان" : "Title"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الموكل" : "Client"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "المحكمة" : "Court"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الحالة" : "Status"}</th>
              <th className="px-5 py-3 text-end"></th>
            </tr></thead>
            <tbody className="divide-y">{filtered.map((c) => (
              <tr key={c.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => navigate({ to: "/app/cases/$caseId", params: { caseId: c.id } })}>
                <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{c.case_number || "—"}</td>
                <td className="px-5 py-4 font-medium">{c.title}</td>
                <td className="px-5 py-4 text-muted-foreground">{c.clients?.name ?? "—"}</td>
                <td className="px-5 py-4 text-muted-foreground">{c.court ?? "—"}</td>
                <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                <td className="px-5 py-4 text-end" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setEditOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? (locale === "ar" ? "تعديل القضية" : "Edit case") : (locale === "ar" ? "قضية جديدة" : "New case")}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5"><Label>{locale === "ar" ? "العنوان *" : "Title *"}</Label><Input value={editing?.title ?? ""} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{locale === "ar" ? "رقم القضية" : "Case number"}</Label><Input value={editing?.case_number ?? ""} onChange={(e) => setEditing({ ...editing!, case_number: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{locale === "ar" ? "الاختصاص" : "Jurisdiction"}</Label><Input value={editing?.jurisdiction ?? ""} onChange={(e) => setEditing({ ...editing!, jurisdiction: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{locale === "ar" ? "المحكمة" : "Court"}</Label><Input value={editing?.court ?? ""} onChange={(e) => setEditing({ ...editing!, court: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{locale === "ar" ? "القاعة" : "Court room"}</Label><Input value={editing?.court_room ?? ""} onChange={(e) => setEditing({ ...editing!, court_room: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{locale === "ar" ? "القاضي" : "Judge"}</Label><Input value={editing?.judge ?? ""} onChange={(e) => setEditing({ ...editing!, judge: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{locale === "ar" ? "الموكل" : "Client"}</Label>
                <Select value={editing?.client_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, client_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{locale === "ar" ? "بدون" : "None"}</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{locale === "ar" ? "الطرف المعارض" : "Opposing party"}</Label><Input value={editing?.opposing_party ?? ""} onChange={(e) => setEditing({ ...editing!, opposing_party: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{locale === "ar" ? "محامي الخصم" : "Opposing counsel"}</Label><Input value={editing?.opposing_counsel ?? ""} onChange={(e) => setEditing({ ...editing!, opposing_counsel: e.target.value })} /></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{locale === "ar" ? "الحالة" : "Status"}</Label>
                <Select value={editing?.status ?? "open"} onValueChange={(v) => setEditing({ ...editing!, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["open","pending","closed","won","lost"].map((s) => <SelectItem key={s} value={s}>{tr(STATUS_LABELS, s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{locale === "ar" ? "الأولوية" : "Priority"}</Label>
                <Select value={editing?.priority ?? "medium"} onValueChange={(v) => setEditing({ ...editing!, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","urgent"].map((p) => <SelectItem key={p} value={p}>{tr(PRIORITY_LABELS, p)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>{locale === "ar" ? "الوصف" : "Description"}</Label><Textarea rows={3} value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditOpen(false)}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button><Button variant="gold" onClick={submit}>{locale === "ar" ? "حفظ" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
