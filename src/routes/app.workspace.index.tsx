import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Users, Briefcase, ChevronRight, Crown, TrendingUp, Activity, CheckCircle2, AlertCircle, Building2, Plus, Pencil, Trash2, LogOut, Check } from "lucide-react";
import { toast } from "sonner";
import { getWorkspaceOverview } from "@/lib/workspace.functions";
import { createOrganization, renameOrganization, deleteOrganization, leaveOrganization } from "@/lib/organizations.functions";
import { useOrg } from "@/lib/org-context";

export const Route = createFileRoute("/app/workspace/")({
  component: WorkspacePage,
  validateSearch: (s: Record<string, unknown>) => ({
    user: typeof s.user === "string" ? s.user : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function initials(s?: string | null) {
  if (!s) return "·";
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "·";
}

const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  closed: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  won: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  lost: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

function WorkspacePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const load = useServerFn(getWorkspaceOverview);
  const { org: activeOrg, orgs, switchOrg, refresh: refreshOrg } = useOrg();

  const [data, setData] = useState<{ teammates: any[]; cases: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [directoryQ, setDirectoryQ] = useState("");
  const [manageOpen, setManageOpen] = useState(false);

  function loadOverview() {
    setLoading(true);
    load()
      .then((r) => setData(r as any))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOverview(); }, [activeOrg?.id]);

  const q = search.q ?? "";
  const activeUser = search.user;

  const teammates = data?.teammates ?? [];
  const cases = data?.cases ?? [];

  const filteredTeammates = useMemo(() => {
    const s = directoryQ.trim().toLowerCase();
    if (!s) return teammates;
    return teammates.filter((t: any) =>
      (t.full_name ?? "").toLowerCase().includes(s) ||
      (t.email ?? "").toLowerCase().includes(s)
    );
  }, [teammates, directoryQ]);

  const filteredCases = useMemo(() => {
    return cases.filter((c: any) => {
      if (activeUser && !c.members.some((m: any) => m.user_id === activeUser)) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (c.title ?? "").toLowerCase().includes(s)
        || (c.case_number ?? "").toLowerCase().includes(s)
        || (c.clients?.name ?? "").toLowerCase().includes(s);
    });
  }, [cases, activeUser, q]);

  const activeTeammate = teammates.find((t: any) => t.user_id === activeUser);

  // ── Workspace analytics ──────────────────────────────────────────────
  const analytics = useMemo(() => {
    const total = cases.length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const c of cases as any[]) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] ?? 0) + 1;
    }
    const won = byStatus["won"] ?? 0;
    const lost = byStatus["lost"] ?? 0;
    const closed = byStatus["closed"] ?? 0;
    const open = byStatus["open"] ?? 0;
    const pending = byStatus["pending"] ?? 0;
    const active = open + pending;
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;
    // Cases per teammate — top 5
    const perUser: Record<string, number> = {};
    for (const c of cases as any[]) for (const m of c.members) perUser[m.user_id] = (perUser[m.user_id] ?? 0) + 1;
    const nameByUser: Record<string, string | null> = {};
    for (const t of teammates as any[]) nameByUser[t.user_id] = t.full_name || t.email || null;
    const leaderboard = Object.entries(perUser)
      .map(([uid, n]) => ({ uid, n, name: nameByUser[uid] || uid.slice(0, 8) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
    const maxLB = leaderboard[0]?.n ?? 1;
    return { total, active, closed, won, lost, byPriority, winRate, leaderboard, maxLB };
  }, [cases, teammates]);

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "مساحة العمل" : "Workspace"}
        subtitle={ar
          ? "دليل الفريق والقضايا المشتركة ومواردها في مكان واحد."
          : "Team directory, shared cases and their resources — in one place."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {orgs.length > 1 && (
              <Select value={activeOrg?.id ?? ""} onValueChange={(v) => { if (v && v !== activeOrg?.id) switchOrg(v); }}>
                <SelectTrigger className="h-9 min-w-[200px]">
                  <div className="flex items-center gap-2 min-w-0"><Building2 className="size-4 text-gold shrink-0"/><SelectValue placeholder={ar ? "اختر" : "Choose"} /></div>
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((m) => (
                    <SelectItem key={m.org.id} value={m.org.id}>
                      <span className="flex items-center gap-2">
                        {m.org.display_name || m.org.legal_name}
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.role}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
              <Building2 className="size-4"/>{ar ? "إدارة مساحات العمل" : "Manage workspaces"}
            </Button>
          </div>
        }
      />

      <ManageWorkspacesDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onChanged={async () => { await refreshOrg(); }}
      />

      {/* Analytics strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{ar ? "قضايا" : "Total cases"}</div>
              <div className="mt-1 text-2xl font-serif">{analytics.total}</div>
            </div>
            <div className="grid size-10 place-items-center rounded-full bg-gold/15 text-gold"><Briefcase className="size-4" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{ar ? "نشطة" : "Active"}</div>
              <div className="mt-1 text-2xl font-serif">{analytics.active}</div>
              <div className="text-xs text-muted-foreground">{ar ? "مفتوحة + قيد الانتظار" : "open + pending"}</div>
            </div>
            <div className="grid size-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-700"><Activity className="size-4" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{ar ? "معدل الفوز" : "Win rate"}</div>
              <div className="mt-1 text-2xl font-serif">{analytics.winRate == null ? "—" : `${analytics.winRate}%`}</div>
              <div className="text-xs text-muted-foreground">{analytics.won} {ar ? "فوز" : "won"} · {analytics.lost} {ar ? "خسارة" : "lost"}</div>
            </div>
            <div className="grid size-10 place-items-center rounded-full bg-sky-500/15 text-sky-700"><TrendingUp className="size-4" /></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">{ar ? "مغلقة" : "Closed"}</div>
              <div className="mt-1 text-2xl font-serif">{analytics.closed}</div>
              <div className="text-xs text-muted-foreground">{teammates.length} {ar ? "زميل" : "teammates"}</div>
            </div>
            <div className="grid size-10 place-items-center rounded-full bg-slate-500/15 text-slate-700"><CheckCircle2 className="size-4" /></div>
          </div>
        </Card>
      </div>

      {/* Case-load leaderboard + priority mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4 text-gold" />
            {ar ? "عبء القضايا لكل زميل" : "Case load per teammate"}
          </div>
          {analytics.leaderboard.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">{ar ? "لا توجد بيانات بعد" : "No data yet"}</div>
          ) : (
            <ul className="space-y-2.5">
              {analytics.leaderboard.map((r) => (
                <li key={r.uid} className="flex items-center gap-3">
                  <div className="w-32 truncate text-sm">{r.name}</div>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="absolute inset-y-0 left-0 bg-gold" style={{ width: `${(r.n / analytics.maxLB) * 100}%` }} />
                  </div>
                  <div className="w-8 text-end text-sm font-mono tabular-nums">{r.n}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="size-4 text-gold" />
            {ar ? "الأولوية" : "Priority mix"}
          </div>
          <div className="space-y-2 text-sm">
            {(["urgent", "high", "medium", "low"] as const).map((p) => (
              <div key={p} className="flex items-center justify-between">
                <span className="capitalize text-muted-foreground">{p}</span>
                <span className="font-mono tabular-nums">{analytics.byPriority[p] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>


      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left: teammates directory */}
        <Card className="h-fit overflow-hidden">
          <div className="border-b p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-gold" />
              {ar ? "الفريق" : "Teammates"}
              <span className="ms-auto text-xs font-normal text-muted-foreground">{teammates.length}</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={directoryQ}
                onChange={(e) => setDirectoryQ(e.target.value)}
                placeholder={ar ? "ابحث…" : "Search…"}
                className="h-9 ps-9"
              />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto py-2">
            <button
              type="button"
              onClick={() => navigate({ search: (prev: any) => ({ ...prev, user: undefined }) })}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-secondary/50 ${!activeUser ? "bg-secondary/70 font-medium" : ""}`}
            >
              <div className="grid size-8 place-items-center rounded-full bg-gold/15 text-gold">
                <Briefcase className="size-4" />
              </div>
              <span>{ar ? "كل القضايا" : "All cases"}</span>
              <span className="ms-auto text-xs text-muted-foreground">{cases.length}</span>
            </button>

            {filteredTeammates.map((t: any) => {
              const casesForUser = cases.filter((c: any) => c.members.some((m: any) => m.user_id === t.user_id)).length;
              const active = activeUser === t.user_id;
              return (
                <button
                  key={t.user_id}
                  type="button"
                  onClick={() => navigate({ search: (prev: any) => ({ ...prev, user: t.user_id }) })}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-secondary/50 ${active ? "bg-secondary/70" : ""}`}
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-gold/15 text-xs text-gold">{initials(t.full_name || t.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate ${active ? "font-medium" : ""}`}>
                      {t.full_name || t.email || t.user_id?.slice(0, 8)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground capitalize">{t.role}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{casesForUser}</span>
                </button>
              );
            })}
            {filteredTeammates.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">{ar ? "لا نتائج" : "No matches"}</div>
            )}
          </div>
        </Card>

        {/* Right: cases hub */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            <div className="text-sm font-semibold">
              {activeTeammate
                ? (ar ? `قضايا ${activeTeammate.full_name || activeTeammate.email || ""}` : `Cases with ${activeTeammate.full_name || activeTeammate.email || ""}`)
                : (ar ? "كل قضايا المكتب" : "All firm cases")}
              <span className="ms-2 text-xs font-normal text-muted-foreground">({filteredCases.length})</span>
            </div>
            <div className="relative ms-auto w-72 max-w-full">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => navigate({ search: (prev: any) => ({ ...prev, q: e.target.value || undefined }) })}
                placeholder={ar ? "ابحث بعنوان أو رقم أو عميل…" : "Search by title, #, or client…"}
                className="h-9 ps-9"
              />
            </div>
            {activeTeammate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate({ search: (prev: any) => ({ ...prev, user: undefined }) })}
              >
                {ar ? "مسح المرشح" : "Clear filter"}
              </Button>
            )}
          </div>

          {filteredCases.length === 0 ? (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              {ar ? "لا قضايا تطابق التصفية." : "No cases match this filter."}
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredCases.map((c: any) => (
                <Link
                  key={c.id}
                  to="/app/workspace/$caseId"
                  params={{ caseId: c.id }}
                  className="group block rounded-xl border bg-card p-4 transition hover:border-gold/50 hover:shadow-md"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 font-semibold">{c.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {c.case_number || "—"} · {c.clients?.name || (ar ? "بدون عميل" : "No client")}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-gold" />
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_COLOR[c.status] ?? "bg-muted"}`}>
                      {c.status}
                    </span>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{c.priority}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {c.members.slice(0, 4).map((m: any) => (
                        <Avatar key={m.user_id} className="size-7 border-2 border-card">
                          <AvatarFallback className="bg-gold/15 text-[10px] text-gold">{initials(m.full_name)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {c.members.length > 4 && (
                        <div className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary text-[10px] font-medium">
                          +{c.members.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {c.members.some((m: any) => m.role === "owner") && <Crown className="size-3 text-gold" />}
                      {c.member_count} {ar ? "عضو" : c.member_count === 1 ? "member" : "members"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Workspaces CRUD panel
// ────────────────────────────────────────────────────────────────────────

function ManageWorkspacesDialog({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => Promise<void> | void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { orgs, org: activeOrg, switchOrg } = useOrg();

  const createFn = useServerFn(createOrganization);
  const renameFn = useServerFn(renameOrganization);
  const deleteFn = useServerFn(deleteOrganization);
  const leaveFn = useServerFn(leaveOrganization);

  const [busy, setBusy] = useState<string | null>(null); // orgId under action
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"solo" | "firm">("firm");
  const [renameOf, setRenameOf] = useState<{ id: string; legal_name: string; display_name: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; role: string } | null>(null);
  const [pendingLeave, setPendingLeave] = useState<{ id: string; name: string } | null>(null);

  async function createWs() {
    if (!newName.trim()) { toast.error(ar ? "أدخل اسماً" : "Enter a name"); return; }
    setBusy("__new__");
    try {
      const org: any = await createFn({ data: { legal_name: newName.trim(), display_name: newName.trim(), type: newType } });
      toast.success(ar ? "تم إنشاء المساحة" : "Workspace created");
      setShowCreate(false); setNewName(""); setNewType("firm");
      await onChanged();
      if (org?.id) await switchOrg(org.id);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  async function saveRename() {
    if (!renameOf) return;
    setBusy(renameOf.id);
    try {
      await renameFn({ data: { id: renameOf.id, legal_name: renameOf.legal_name, display_name: renameOf.display_name } });
      toast.success(ar ? "تم الحفظ" : "Renamed");
      setRenameOf(null);
      await onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(pendingDelete.id);
    try {
      await deleteFn({ data: { id: pendingDelete.id } });
      toast.success(ar ? "تم الحذف" : "Workspace deleted");
      setPendingDelete(null);
      await onChanged();
    } catch (e) {
      toast.error(ar
        ? `تعذّر الحذف: ${(e as Error).message}. تأكد من عدم وجود بيانات مرتبطة.`
        : `Delete failed: ${(e as Error).message}. Ensure the workspace has no linked data.`);
    }
    finally { setBusy(null); }
  }

  async function confirmLeave() {
    if (!pendingLeave) return;
    setBusy(pendingLeave.id);
    try {
      await leaveFn({ data: { id: pendingLeave.id } });
      toast.success(ar ? "تم مغادرة المساحة" : "Left workspace");
      setPendingLeave(null);
      await onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-gold" /> {ar ? "إدارة مساحات العمل" : "Manage workspaces"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {orgs.length === 0 ? (
              <div className="text-sm text-muted-foreground">{ar ? "لا مساحات عمل بعد." : "No workspaces yet."}</div>
            ) : (
              <ul className="divide-y rounded-md border">
                {orgs.map((m) => {
                  const isActive = activeOrg?.id === m.org.id;
                  const canManage = m.role === "owner" || m.role === "partner";
                  const canDelete = m.role === "owner";
                  return (
                    <li key={m.org.id} className="flex flex-wrap items-center gap-3 p-3">
                      <div className="grid size-10 place-items-center rounded-lg bg-gold/15 text-gold shrink-0">
                        <Building2 className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{m.org.display_name || m.org.legal_name}</div>
                          {isActive && <span className="text-[10px] font-medium uppercase tracking-wider text-gold bg-gold/10 rounded-full px-2 py-0.5 inline-flex items-center gap-1"><Check className="size-3"/>{ar ? "نشطة" : "active"}</span>}
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.role}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{m.org.legal_name} · {m.org.type} · {m.org.currency}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isActive && (
                          <Button size="sm" variant="outline" onClick={() => switchOrg(m.org.id)}>{ar ? "تفعيل" : "Switch"}</Button>
                        )}
                        {canManage && (
                          <Button size="icon" variant="ghost" onClick={() => setRenameOf({ id: m.org.id, legal_name: m.org.legal_name, display_name: m.org.display_name ?? "" })} title={ar ? "إعادة تسمية" : "Rename"}>
                            <Pencil className="size-4"/>
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="icon" variant="ghost" onClick={() => setPendingDelete({ id: m.org.id, name: m.org.display_name || m.org.legal_name, role: m.role })} title={ar ? "حذف" : "Delete"}>
                            <Trash2 className="size-4 text-destructive"/>
                          </Button>
                        )}
                        {!canDelete && orgs.length > 1 && (
                          <Button size="icon" variant="ghost" onClick={() => setPendingLeave({ id: m.org.id, name: m.org.display_name || m.org.legal_name })} title={ar ? "مغادرة" : "Leave"}>
                            <LogOut className="size-4"/>
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {showCreate ? (
              <div className="space-y-2 rounded-md border p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ar ? "مساحة عمل جديدة" : "New workspace"}</div>
                <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                  <div>
                    <Label>{ar ? "الاسم" : "Name"}</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={ar ? "مثلاً: مكتب الشرق" : "e.g. East Firm"} autoFocus />
                  </div>
                  <div>
                    <Label>{ar ? "النوع" : "Type"}</Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                      <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo">{ar ? "منفرد" : "Solo"}</SelectItem>
                        <SelectItem value="firm">{ar ? "مكتب" : "Firm"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewName(""); }}>{ar ? "إلغاء" : "Cancel"}</Button>
                  <Button size="sm" variant="gold" onClick={createWs} disabled={busy === "__new__"}>
                    {busy === "__new__" && <Loader2 className="size-4 animate-spin"/>} {ar ? "إنشاء" : "Create"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="w-full">
                <Plus className="size-4"/>{ar ? "إضافة مساحة عمل جديدة" : "Add a new workspace"}
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>{ar ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameOf} onOpenChange={(o) => { if (!o) setRenameOf(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "إعادة تسمية مساحة العمل" : "Rename workspace"}</DialogTitle></DialogHeader>
          {renameOf && (
            <div className="space-y-3">
              <div>
                <Label>{ar ? "الاسم القانوني" : "Legal name"}</Label>
                <Input value={renameOf.legal_name} onChange={(e) => setRenameOf({ ...renameOf, legal_name: e.target.value })} />
              </div>
              <div>
                <Label>{ar ? "الاسم المعروض" : "Display name"}</Label>
                <Input value={renameOf.display_name} onChange={(e) => setRenameOf({ ...renameOf, display_name: e.target.value })} placeholder={ar ? "اختياري" : "optional"} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOf(null)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={saveRename} disabled={!!busy}>{busy && <Loader2 className="size-4 animate-spin"/>}{ar ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "حذف مساحة العمل؟" : "Delete workspace?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar
                ? `سيتم حذف "${pendingDelete?.name ?? ""}" نهائياً. لن يتم الحذف إذا كانت هناك قضايا/موكلون/فواتير مرتبطة بها.`
                : `"${pendingDelete?.name ?? ""}" will be permanently removed. Deletion will fail if the workspace still has linked cases, clients or invoices.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction disabled={!!busy} onClick={(e) => { e.preventDefault(); confirmDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy && <Loader2 className="size-4 animate-spin me-1.5"/>}{ar ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave confirm */}
      <AlertDialog open={!!pendingLeave} onOpenChange={(o) => { if (!o) setPendingLeave(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "مغادرة مساحة العمل؟" : "Leave workspace?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar ? `ستفقد الوصول إلى "${pendingLeave?.name ?? ""}". يمكن إعادة دعوتك من قبل المالك.` : `You will lose access to "${pendingLeave?.name ?? ""}". You can be re-invited by an owner.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction disabled={!!busy} onClick={(e) => { e.preventDefault(); confirmLeave(); }}>
              {busy && <Loader2 className="size-4 animate-spin me-1.5"/>}{ar ? "مغادرة" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

