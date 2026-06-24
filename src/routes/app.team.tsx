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
import { Loader2, Plus, Trash2, Briefcase, Users, CalendarDays, FileText } from "lucide-react";
import { toast } from "sonner";
import { listTeamMembers, inviteTeamMember, removeTeamMember, updateTeamMemberRole } from "@/lib/team.functions";
import { getTeamOverview } from "@/lib/team-overview.functions";

export const Route = createFileRoute("/app/team")({ component: TeamPage });

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
    <div className="space-y-6">
      <PageHeader title={ar ? "الفريق" : "Team"} subtitle={ar ? "إدارة الأعضاء، التعيينات، وعرض الأعمال المشتركة." : "Manage members, assignments, and shared work."} />
      <Tabs defaultValue="members">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="members">{ar ? "الأعضاء" : "Members"}</TabsTrigger>
          <TabsTrigger value="workload">{ar ? "أعباء العمل" : "Workload"}</TabsTrigger>
          <TabsTrigger value="shared">{ar ? "المشترك" : "Shared work"}</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-6"><MembersPanel editable={can("manage_members")} /></TabsContent>
        <TabsContent value="workload" className="mt-6"><WorkloadPanel /></TabsContent>
        <TabsContent value="shared" className="mt-6"><SharedPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

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

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <div className="text-sm font-semibold">{ar ? "أعضاء المكتب" : "Firm members"} <span className="text-muted-foreground font-normal">({members.length})</span></div>
        {editable && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4" />{ar ? "دعوة عضو" : "Invite member"}</Button></DialogTrigger>
            <InviteDialog onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)} />
          </Dialog>
        )}
      </div>
      {loading ? <div className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></div> : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-start font-medium">{ar ? "العضو" : "Member"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "الدور" : "Role"}</th>
              <th className="px-5 py-3 text-start font-medium">{ar ? "الحالة" : "Status"}</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3">
                  <div className="font-medium">{m.user_id === userId ? (ar ? "أنت" : "You") : (m.name || m.email || "—")}</div>
                  {m.email && m.name && <div className="text-xs text-muted-foreground">{m.email}</div>}
                </td>
                <td className="px-5 py-3">
                  {editable && m.user_id !== userId ? (
                    <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                      <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{roleLabel(r, locale)}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <span className="text-muted-foreground">{roleLabel(m.role as OrgRole, locale)}</span>}
                </td>
                <td className="px-5 py-3 capitalize text-muted-foreground">{m.status}</td>
                <td className="px-5 py-3 text-end">{editable && m.user_id !== userId && <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="size-4 text-destructive" /></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="border-t bg-muted/30 p-3 text-xs text-muted-foreground">
        {ar
          ? "ندعو العضو بإرسال رابط دخول إلى بريده. عند الدخول لأول مرة سيختار كلمة المرور الخاصة به."
          : "Inviting sends a sign-in link to the member's email. On first login they choose their own password."}
      </div>
    </Card>
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

  if (loading) return <div className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map(({ member: m, ownedCases, assignedCases, clients, upcomingAppts }) => (
        <Card key={m.id} className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-semibold">{m.name || m.email || "—"}</div>
              <div className="text-xs text-muted-foreground">{roleLabel(m.role as OrgRole, locale)}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <Stat icon={Briefcase} label={ar ? "قضايا (مسؤول)" : "Cases (lead)"} value={ownedCases.length} />
            <Stat icon={Users} label={ar ? "موكلون" : "Clients"} value={clients.length} />
            <Stat icon={CalendarDays} label={ar ? "مواعيد قادمة" : "Upcoming"} value={upcomingAppts.length} />
          </div>
          {ownedCases.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{ar ? "قضايا مسؤول عنها" : "Lead cases"}</div>
              <ul className="space-y-1 text-sm">{ownedCases.slice(0, 4).map((c: any) => (
                <li key={c.id}><Link to="/app/cases/$caseId" params={{ caseId: c.id }} className="hover:text-gold">{c.title}</Link></li>
              ))}</ul>
            </div>
          )}
          {assignedCases.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{ar ? "قضايا مساعدة" : "Assigned cases"}</div>
              <ul className="space-y-1 text-sm">{assignedCases.slice(0, 4).map((c: any) => (
                <li key={c.id}><Link to="/app/cases/$caseId" params={{ caseId: c.id }} className="hover:text-gold">{c.title}</Link></li>
              ))}</ul>
            </div>
          )}
          {upcomingAppts.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{ar ? "المواعيد القادمة" : "Upcoming events"}</div>
              <ul className="space-y-1 text-xs text-muted-foreground">{upcomingAppts.map((a: any) => (
                <li key={a.id}>{new Date(a.starts_at).toLocaleString()} — {a.title}</li>
              ))}</ul>
            </div>
          )}
        </Card>
      ))}
      {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2">{ar ? "لا يوجد أعضاء فعّالون بعد" : "No active members yet"}</Card>}
    </div>
  );
}

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

  if (loading) return <div className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><Briefcase className="size-4 text-gold" /><h3 className="font-serif text-lg">{ar ? "القضايا المشتركة" : "Shared cases"}</h3></div>
        <ul className="divide-y text-sm">{data.cases.slice(0, 10).map((c: any) => (
          <li key={c.id} className="py-2 flex justify-between gap-3">
            <Link to="/app/cases/$caseId" params={{ caseId: c.id }} className="hover:text-gold truncate">{c.title}</Link>
            <span className="text-xs text-muted-foreground capitalize">{c.status}</span>
          </li>
        ))}</ul>
        {data.cases.length === 0 && <div className="text-sm text-muted-foreground">{ar ? "لا توجد قضايا" : "No cases"}</div>}
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><Users className="size-4 text-gold" /><h3 className="font-serif text-lg">{ar ? "الموكلون" : "Clients"}</h3></div>
        <ul className="divide-y text-sm">{data.clients.slice(0, 10).map((c: any) => (
          <li key={c.id} className="py-2">{c.name}</li>
        ))}</ul>
        {data.clients.length === 0 && <div className="text-sm text-muted-foreground">{ar ? "لا يوجد موكلون" : "No clients"}</div>}
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><CalendarDays className="size-4 text-gold" /><h3 className="font-serif text-lg">{ar ? "المواعيد القادمة" : "Upcoming events"}</h3></div>
        <ul className="divide-y text-sm">{data.appointments.filter((a: any) => new Date(a.starts_at) >= new Date()).slice(0, 10).map((a: any) => (
          <li key={a.id} className="py-2">
            <div className="font-medium">{a.title}</div>
            <div className="text-xs text-muted-foreground">{new Date(a.starts_at).toLocaleString()} · <span className="capitalize">{a.kind}</span></div>
          </li>
        ))}</ul>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><FileText className="size-4 text-gold" /><h3 className="font-serif text-lg">{ar ? "أحدث المستندات" : "Recent documents"}</h3></div>
        <ul className="divide-y text-sm">{data.documents.slice(0, 10).map((d: any) => (
          <li key={d.id} className="py-2">
            <div className="truncate">{d.name}</div>
            <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</div>
          </li>
        ))}</ul>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-md bg-secondary/50 p-2">
      <Icon className="mx-auto size-4 text-gold mb-1" />
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
