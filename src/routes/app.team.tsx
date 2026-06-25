import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { useOrg, roleLabel, type OrgRole } from "@/lib/org-context";
import { PageHeader } from "@/components/app/primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, Plus, Trash2, Briefcase, Users, CalendarDays, FileText,
  TrendingUp, Sparkles, Activity, Search, Crown, Mail, Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { listTeamMembers, inviteTeamMember, removeTeamMember, updateTeamMemberRole } from "@/lib/team.functions";
import { getTeamOverview } from "@/lib/team-overview.functions";

export const Route = createFileRoute("/app/team")({ component: TeamPage });

/* ---------- shared helpers ---------- */
function initials(s: string) {
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "·";
}
const GOLD = "oklch(0.91 0.17 100)";
const CHAMPAGNE = "oklch(0.93 0.04 85)";
const ONYX = "oklch(0.13 0.012 60)";
const PALETTE = [GOLD, "oklch(0.65 0.13 60)", "oklch(0.55 0.08 30)", CHAMPAGNE, "oklch(0.45 0.05 250)", "oklch(0.70 0.10 140)"];

function TeamPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { org, loading, can } = useOrg();

  if (loading) return <div className="grid min-h-[40vh] place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  if (!org) return (
    <div className="space-y-6">
      <PageHeader title={ar ? "الفريق" : "Team"} />
      <Card className="p-8 text-center">
        <p className="mb-4 text-muted-foreground">{ar ? "أكمل إعداد مؤسستك أولاً." : "Complete organization setup first."}</p>
        <Button asChild variant="gold"><Link to="/app/onboarding">{ar ? "إعداد" : "Start onboarding"}</Link></Button>
      </Card>
    </div>
  );
  if (org.type !== "firm") return (
    <div className="space-y-6">
      <PageHeader title={ar ? "الفريق" : "Team"} />
      <Card className="p-8 text-center text-sm text-muted-foreground">
        {ar ? "إدارة الفريق متاحة لحسابات مكاتب المحاماة فقط." : "Team management is available for law firm accounts only."}
      </Card>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={ar ? "الفريق" : "Team"}
        subtitle={ar ? "إدارة الأعضاء، التحليلات، والأعمال المشتركة." : "Members, analytics, and shared work in one place."}
      />
      <TeamAnalytics />
      <Tabs defaultValue="members">
        <TabsList className="bg-secondary/60 backdrop-blur">
          <TabsTrigger value="members">{ar ? "الأعضاء" : "Members"}</TabsTrigger>
          <TabsTrigger value="workload">{ar ? "الحِمل" : "Workload"}</TabsTrigger>
          <TabsTrigger value="shared">{ar ? "المشترك" : "Shared work"}</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-6"><MembersPanel editable={can("manage_members")} /></TabsContent>
        <TabsContent value="workload" className="mt-6"><WorkloadPanel /></TabsContent>
        <TabsContent value="shared" className="mt-6"><SharedPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

/* =====================================================================
   ANALYTICS HEADER — KPI cards + charts
   ===================================================================== */
function TeamAnalytics() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const listFn = useServerFn(listTeamMembers);
  const overviewFn = useServerFn(getTeamOverview);
  const [members, setMembers] = useState<any[]>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof getTeamOverview>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, o] = await Promise.all([listFn(), overviewFn()]);
        setMembers(m as any[]); setData(o);
      } catch (e) { toast.error((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, []);

  const analytics = useMemo(() => {
    if (!data) return null;
    const active = members.filter(m => m.status === "active").length;
    const pending = members.filter(m => m.status !== "active").length;
    const openCases = data.cases.filter((c: any) => c.status === "open" || c.status === "active").length;

    // Workload bar — cases per member
    const workload = members.filter(m => m.user_id).map((m) => {
      const owned = data.cases.filter((c: any) => c.owner_id === m.user_id || c.responsible_lawyer === m.user_id).length;
      const assigned = data.caseMembers.filter((cm: any) => cm.user_id === m.user_id).length;
      return {
        name: (m.name || m.email || "—").split(" ")[0].slice(0, 10),
        lead: owned,
        assist: Math.max(0, assigned - owned),
      };
    }).slice(0, 8);

    // Roles distribution
    const roleCounts: Record<string, number> = {};
    for (const m of members) roleCounts[m.role] = (roleCounts[m.role] || 0) + 1;
    const roles = Object.entries(roleCounts).map(([role, value]) => ({ name: roleLabel(role as OrgRole, locale), value }));

    // Activity over last 14 days (cases opened + documents uploaded + appointments scheduled)
    const days: { day: string; cases: number; docs: number; events: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const inDay = (iso?: string) => { if (!iso) return false; const t = new Date(iso); return t >= d && t < next; };
      days.push({
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        cases: data.cases.filter((c: any) => inDay(c.opened_at) || inDay(c.created_at)).length,
        docs: data.documents.filter((x: any) => inDay(x.created_at)).length,
        events: data.appointments.filter((a: any) => inDay(a.starts_at)).length,
      });
    }

    // capacity gauge (avg cases per active member)
    const capacity = active ? Math.min(100, Math.round((data.cases.length / (active * 6)) * 100)) : 0;

    return { active, pending, openCases, totalDocs: data.documents.length, totalClients: data.clients.length, workload, roles, days, capacity };
  }, [members, data, locale]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-28 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }
  if (!analytics) return null;

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label={ar ? "أعضاء فعّالون" : "Active members"} value={analytics.active} accent="gold"
             sub={analytics.pending ? `${analytics.pending} ${ar ? "بانتظار" : "pending"}` : undefined} />
        <Kpi icon={Briefcase} label={ar ? "قضايا مفتوحة" : "Open cases"} value={analytics.openCases} accent="champagne" />
        <Kpi icon={FileText} label={ar ? "مستندات" : "Documents"} value={analytics.totalDocs} accent="onyx" />
        <Kpi icon={TrendingUp} label={ar ? "موكلون" : "Clients"} value={analytics.totalClients} accent="gold" />
      </div>

      {/* charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity area chart */}
        <Card className="lg:col-span-2 p-5 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-56 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                <Activity className="size-3.5 text-gold" /> {ar ? "نشاط الفريق" : "Team activity"}
              </div>
              <h3 className="font-serif text-xl mt-1">{ar ? "آخر ١٤ يوماً" : "Last 14 days"}</h3>
            </div>
            <Badge variant="outline" className="border-gold/40 text-gold gap-1"><Sparkles className="size-3" /> live</Badge>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.days} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.55} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDocs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHAMPAGNE} stopOpacity={0.55} />
                    <stop offset="95%" stopColor={CHAMPAGNE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="currentColor" className="text-muted-foreground/15" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                <Tooltip contentStyle={{ background: ONYX, border: `1px solid ${GOLD}`, borderRadius: 8, color: "#fff", fontSize: 12 }} />
                <Area type="monotone" dataKey="cases" stroke={GOLD} strokeWidth={2} fill="url(#gCases)" name={ar ? "قضايا" : "Cases"} />
                <Area type="monotone" dataKey="docs" stroke={CHAMPAGNE} strokeWidth={2} fill="url(#gDocs)" name={ar ? "مستندات" : "Docs"} />
                <Area type="monotone" dataKey="events" stroke="oklch(0.55 0.08 30)" strokeWidth={2} fill="transparent" name={ar ? "مواعيد" : "Events"} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Capacity radial + roles pie */}
        <Card className="p-5 relative overflow-hidden">
          <div className="absolute -bottom-16 -left-16 size-40 rounded-full bg-champagne/30 blur-3xl pointer-events-none" />
          <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground mb-1">
            {ar ? "السعة" : "Capacity"}
          </div>
          <h3 className="font-serif text-xl mb-3">{ar ? "حِمل الفريق" : "Team load"}</h3>
          <div className="h-[140px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: "load", value: analytics.capacity, fill: GOLD }]} startAngle={210} endAngle={-30}>
                <RadialBar background={{ fill: "oklch(0.93 0.04 85 / 0.3)" } as any} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="font-serif text-3xl">{analytics.capacity}%</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{ar ? "مستخدم" : "utilized"}</div>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-3 border-t border-border/60">
            <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground mb-2">{ar ? "الأدوار" : "Roles"}</div>
            <div className="h-[90px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.roles} dataKey="value" innerRadius={22} outerRadius={40} paddingAngle={3} stroke="none">
                    {analytics.roles.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: ONYX, border: `1px solid ${GOLD}`, borderRadius: 8, color: "#fff", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {analytics.roles.map((r, i) => (
                <span key={r.name} className="text-[10px] flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  {r.name} <span className="text-muted-foreground">·{r.value}</span>
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Workload distribution */}
      {analytics.workload.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{ar ? "توزيع القضايا" : "Caseload"}</div>
              <h3 className="font-serif text-xl">{ar ? "قضايا لكل عضو" : "Cases per member"}</h3>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.workload} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="currentColor" className="text-muted-foreground/15" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
                <Tooltip cursor={{ fill: "oklch(0.91 0.17 100 / 0.08)" }} contentStyle={{ background: ONYX, border: `1px solid ${GOLD}`, borderRadius: 8, color: "#fff", fontSize: 12 }} />
                <Bar dataKey="lead" stackId="a" fill={GOLD} radius={[0, 0, 0, 0]} name={ar ? "مسؤول" : "Lead"} />
                <Bar dataKey="assist" stackId="a" fill={CHAMPAGNE} radius={[6, 6, 0, 0]} name={ar ? "مساعد" : "Assist"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: number; sub?: string; accent: "gold" | "champagne" | "onyx" }) {
  const ring = accent === "gold" ? "from-gold/20 to-transparent" : accent === "champagne" ? "from-champagne/40 to-transparent" : "from-onyx/15 to-transparent";
  return (
    <Card className="relative overflow-hidden p-5 group transition-all duration-300 hover:shadow-[0_12px_40px_-12px_oklch(0.91_0.17_100/0.35)] hover:-translate-y-0.5">
      <div className={`absolute inset-0 bg-gradient-to-br ${ring} opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{label}</div>
          <div className="font-serif text-4xl mt-2 tabular-nums">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className="size-10 rounded-full grid place-items-center bg-gold/10 text-gold ring-1 ring-gold/30 group-hover:scale-110 transition-transform">
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

/* =====================================================================
   MEMBERS — cards grid (modern) instead of table
   ===================================================================== */
function MembersPanel({ editable }: { editable: boolean }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { userId } = useOrg();
  const listFn = useServerFn(listTeamMembers);
  const removeFn = useServerFn(removeTeamMember);
  const updateFn = useServerFn(updateTeamMemberRole);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    try { setMembers(await listFn()); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function changeRole(id: string, role: string) {
    try { await updateFn({ data: { id, role: role as any } }); toast.success(ar ? "تم تحديث الدور" : "Role updated"); load(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function remove(id: string) {
    if (!confirm(ar ? "إزالة العضو؟" : "Remove member?")) return;
    try { await removeFn({ data: { id } }); toast.success(ar ? "تمت الإزالة" : "Removed"); load(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const roles: OrgRole[] = ["owner","partner","associate","paralegal","accountant","assistant"];
  const filtered = members.filter((m) => {
    if (!q) return true;
    const s = (m.name || "") + " " + (m.email || "") + " " + (m.invited_email || "");
    return s.toLowerCase().includes(q.toLowerCase());
  });

  if (loading) return <div className="p-12 text-center"><Loader2 className="mx-auto size-6 animate-spin text-gold" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "بحث عن عضو…" : "Search members…"} className="ps-9" />
        </div>
        {editable && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gold" className="gap-1.5"><Plus className="size-4" />{ar ? "دعوة عضو" : "Invite member"}</Button>
            </DialogTrigger>
            <InviteDialog onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m, idx) => {
          const isYou = m.user_id === userId;
          const isOwner = m.role === "owner";
          const display = isYou ? (ar ? "أنت" : "You") : (m.name || m.email || m.invited_email || "—");
          return (
            <Card
              key={m.id}
              className="group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_-20px_oklch(0.78_0.13_82/0.45)] animate-fade-in"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {isOwner && (
                <div className="absolute top-3 end-3"><Badge className="bg-gold/15 text-gold border border-gold/30 gap-1"><Crown className="size-3" /> {ar ? "مالك" : "Owner"}</Badge></div>
              )}
              <div className="flex items-start gap-3">
                <Avatar className="size-12 ring-2 ring-gold/30">
                  <AvatarFallback className="bg-gradient-to-br from-gold/30 to-champagne text-onyx font-serif text-base">
                    {initials(display)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{display}</div>
                  {m.email && m.name && <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="size-3" />{m.email}</div>}
                  {!m.user_id && m.invited_email && (
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Clock className="size-3" />{m.invited_email}</div>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider">
                    <span className={`size-1.5 rounded-full ${m.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                    <span className="text-muted-foreground">{m.status}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                {editable && !isYou ? (
                  <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{roleLabel(r, locale)}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">{roleLabel(m.role as OrgRole, locale)}</span>
                )}
                {editable && !isYou && (
                  <Button size="icon" variant="ghost" onClick={() => remove(m.id)} className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3 p-10 text-center text-sm text-muted-foreground">
            {ar ? "لا يوجد أعضاء" : "No members"}
          </Card>
        )}
      </div>

      <Card className="p-3 text-xs text-muted-foreground bg-muted/30 text-center">
        {ar
          ? "تُرسل الدعوة رابط دخول إلى بريد العضو. عند الدخول لأول مرة سيختار كلمة المرور الخاصة به."
          : "Inviting sends a sign-in link to the member's email. On first login they choose their own password."}
      </Card>
    </div>
  );
}

function InviteDialog({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const inviteFn = useServerFn(inviteTeamMember);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("associate");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await inviteFn({ data: { email, role, redirectTo: window.location.origin + "/set-password" } });
      toast.success(ar ? "تمت الدعوة — تم إرسال رابط البريد." : "Invited — sign-in link sent.");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  const roles: OrgRole[] = ["partner","associate","paralegal","accountant","assistant"];
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{ar ? "دعوة عضو" : "Invite member"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>{ar ? "البريد" : "Email"}</Label><Input type="email" className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label>{ar ? "الدور" : "Role"}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{roleLabel(r, locale)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{ar ? "إلغاء" : "Cancel"}</Button>
        <Button variant="gold" onClick={save} disabled={saving || !email}>{saving && <Loader2 className="size-4 animate-spin" />}{ar ? "إرسال الدعوة" : "Send invite"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* =====================================================================
   WORKLOAD — richer per-member cards with progress bars
   ===================================================================== */
function WorkloadPanel() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const listFn = useServerFn(listTeamMembers);
  const overviewFn = useServerFn(getTeamOverview);
  const [members, setMembers] = useState<any[]>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof getTeamOverview>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, o] = await Promise.all([listFn(), overviewFn()]);
        setMembers(m as any[]); setData(o);
      } catch (e) { toast.error((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return members.filter((m) => m.user_id).map((m) => {
      const uid = m.user_id;
      const ownedCases = data.cases.filter((c: any) => c.owner_id === uid || c.responsible_lawyer === uid);
      const memberOf = data.caseMembers.filter((cm: any) => cm.user_id === uid).map((cm: any) => cm.case_id);
      const assignedCases = data.cases.filter((c: any) => memberOf.includes(c.id) && !ownedCases.some((o: any) => o.id === c.id));
      const clients = data.clients.filter((c: any) => c.owner_id === uid);
      const upcomingAppts = data.appointments.filter((a: any) => a.owner_id === uid && new Date(a.starts_at) >= new Date()).slice(0, 5);
      return { member: m, ownedCases, assignedCases, clients, upcomingAppts };
    });
  }, [members, data]);

  const maxLoad = Math.max(1, ...rows.map(r => r.ownedCases.length + r.assignedCases.length));
  if (loading) return <div className="p-12 text-center"><Loader2 className="mx-auto size-6 animate-spin text-gold" /></div>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map(({ member: m, ownedCases, assignedCases, clients, upcomingAppts }, i) => {
        const display = m.name || m.email || "—";
        const load = ownedCases.length + assignedCases.length;
        const loadPct = Math.round((load / maxLoad) * 100);
        return (
          <Card key={m.id} className="p-5 animate-fade-in hover:shadow-[0_12px_40px_-12px_oklch(0.78_0.13_82/0.35)] transition-shadow" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-start gap-3 mb-4">
              <Avatar className="size-11 ring-2 ring-gold/30">
                <AvatarFallback className="bg-gradient-to-br from-gold/30 to-champagne text-onyx font-serif">{initials(display)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{display}</div>
                <div className="text-xs text-muted-foreground">{roleLabel(m.role as OrgRole, locale)}</div>
              </div>
              <div className="text-end">
                <div className="font-serif text-xl tabular-nums">{load}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{ar ? "حِمل" : "Load"}</div>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{ar ? "الاستخدام" : "Utilization"}</span><span>{loadPct}%</span>
              </div>
              <Progress value={loadPct} className="h-1.5" />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <Stat icon={Briefcase} label={ar ? "مسؤول" : "Lead"} value={ownedCases.length} />
              <Stat icon={Users} label={ar ? "موكلون" : "Clients"} value={clients.length} />
              <Stat icon={CalendarDays} label={ar ? "قادمة" : "Upcoming"} value={upcomingAppts.length} />
            </div>

            {ownedCases.length > 0 && (
              <div className="mb-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{ar ? "قضايا مسؤول عنها" : "Lead cases"}</div>
                <ul className="space-y-1 text-sm">{ownedCases.slice(0, 3).map((c: any) => (
                  <li key={c.id}><Link to="/app/cases/$caseId" params={{ caseId: c.id }} className="hover:text-gold story-link">{c.title}</Link></li>
                ))}</ul>
              </div>
            )}
            {upcomingAppts.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{ar ? "القادم" : "Upcoming"}</div>
                <ul className="space-y-1 text-xs text-muted-foreground">{upcomingAppts.slice(0, 3).map((a: any) => (
                  <li key={a.id} className="flex items-center gap-2"><Clock className="size-3 text-gold" />{new Date(a.starts_at).toLocaleString()} — {a.title}</li>
                ))}</ul>
              </div>
            )}
          </Card>
        );
      })}
      {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2">{ar ? "لا يوجد أعضاء فعّالون بعد" : "No active members yet"}</Card>}
    </div>
  );
}

/* =====================================================================
   SHARED — clean lists with subtle motion
   ===================================================================== */
function SharedPanel() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const overviewFn = useServerFn(getTeamOverview);
  const [data, setData] = useState<Awaited<ReturnType<typeof getTeamOverview>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await overviewFn()); }
      catch (e) { toast.error((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="p-12 text-center"><Loader2 className="mx-auto size-6 animate-spin text-gold" /></div>;
  if (!data) return null;

  const tiles = [
    { icon: Briefcase, title: ar ? "القضايا المشتركة" : "Shared cases", items: data.cases.slice(0, 8).map((c: any) => ({ id: c.id, primary: c.title, secondary: c.status, link: { to: "/app/cases/$caseId", params: { caseId: c.id } } })) },
    { icon: Users, title: ar ? "الموكلون" : "Clients", items: data.clients.slice(0, 8).map((c: any) => ({ id: c.id, primary: c.name })) },
    { icon: CalendarDays, title: ar ? "المواعيد القادمة" : "Upcoming events", items: data.appointments.filter((a: any) => new Date(a.starts_at) >= new Date()).slice(0, 8).map((a: any) => ({ id: a.id, primary: a.title, secondary: new Date(a.starts_at).toLocaleString() })) },
    { icon: FileText, title: ar ? "أحدث المستندات" : "Recent documents", items: data.documents.slice(0, 8).map((d: any) => ({ id: d.id, primary: d.name, secondary: new Date(d.created_at).toLocaleDateString() })) },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tiles.map((t, ti) => (
        <Card key={t.title} className="p-5 animate-fade-in" style={{ animationDelay: `${ti * 60}ms` }}>
          <div className="flex items-center gap-2 mb-1"><t.icon className="size-4 text-gold" /><h3 className="font-serif text-lg">{t.title}</h3></div>
          <div className="h-px bg-gradient-to-r from-gold/50 to-transparent mb-3" />
          <ul className="divide-y text-sm">
            {t.items.map((it: any) => (
              <li key={it.id} className="py-2.5 flex items-center justify-between gap-3 group">
                {it.link ? (
                  <Link to={it.link.to} params={it.link.params} className="truncate hover:text-gold transition-colors">{it.primary}</Link>
                ) : (
                  <span className="truncate">{it.primary}</span>
                )}
                {it.secondary && <span className="text-xs text-muted-foreground capitalize shrink-0">{it.secondary}</span>}
              </li>
            ))}
            {t.items.length === 0 && <li className="py-4 text-sm text-muted-foreground text-center">{ar ? "لا يوجد" : "Nothing yet"}</li>}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-md bg-secondary/50 p-2 transition-colors hover:bg-gold/10">
      <Icon className="mx-auto size-4 text-gold mb-1" />
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
