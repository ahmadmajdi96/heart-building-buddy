import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getClient, addInteraction, deleteInteraction } from "@/lib/clients.functions";
import { ArrowLeft, Loader2, Trash2, Plus, ClipboardList, MessageSquare, Briefcase, Building, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/clients/$clientId")({ component: ClientProfilePage });

function ClientProfilePage() {
  const { clientId } = Route.useParams();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const get = useServerFn(getClient);
  const [data, setData] = useState<Awaited<ReturnType<typeof getClient>> | null>(null);
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

  const c = data.client as any;
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
          <TabsTrigger value="interactions" className="gap-1.5"><MessageSquare className="size-3.5" />{ar ? "التفاعلات" : "Interactions"}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab data={data} />
        </TabsContent>
        <TabsContent value="cases" className="mt-6">
          <CasesTab data={data} />
        </TabsContent>
        <TabsContent value="interactions" className="mt-6">
          <InteractionsTab clientId={clientId} data={data} onChange={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ data }: { data: NonNullable<Awaited<ReturnType<typeof getClient>>> }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const c = data.client as any;
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
          <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "تفاعلات" : "Interactions"}</span><span className="font-medium">{data.interactions.length}</span></div>
        </div>
      </div>
    </div>
  );
}

function CasesTab({ data }: { data: NonNullable<Awaited<ReturnType<typeof getClient>>> }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const cases = data.cases ?? [];
  if (cases.length === 0) {
    return <div className="card-elev rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">{ar ? "لا توجد قضايا لهذا الموكل بعد." : "No cases for this client yet."}</div>;
  }
  return (
    <div className="card-elev rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-5 py-3 text-start font-medium">{ar ? "الرقم" : "Ref"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "العنوان" : "Title"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "الحالة" : "Status"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "الأولوية" : "Priority"}</th>
            <th className="px-5 py-3 text-start font-medium">{ar ? "افتُتحت" : "Opened"}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {cases.map((cs: any) => (
            <tr key={cs.id} className="hover:bg-secondary/40">
              <td className="px-5 py-3 font-mono text-xs">{cs.case_number ?? "—"}</td>
              <td className="px-5 py-3 font-medium">
                <Link to="/app/cases/$caseId" params={{ caseId: cs.id }} className="hover:text-gold">{cs.title}</Link>
              </td>
              <td className="px-5 py-3"><StatusBadge status={cs.status} /></td>
              <td className="px-5 py-3 text-muted-foreground capitalize">{cs.priority ?? "—"}</td>
              <td className="px-5 py-3 text-muted-foreground text-xs">{cs.opened_at ? new Date(cs.opened_at).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InteractionsTab({ clientId, data, onChange }: { clientId: string; data: NonNullable<Awaited<ReturnType<typeof getClient>>>; onChange: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const add = useServerFn(addInteraction);
  const del = useServerFn(deleteInteraction);
  const [form, setForm] = useState<{ kind: "call" | "session" | "note" | "email"; title: string; body: string }>({ kind: "note", title: "", body: "" });
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.title.trim()) { toast.error(ar ? "العنوان مطلوب" : "Title is required"); return; }
    setSaving(true);
    try {
      await add({ data: { client_id: clientId, ...form } });
      toast.success(ar ? "تمت إضافة التفاعل بنجاح" : "Interaction added");
      setForm({ kind: "note", title: "", body: "" });
      onChange();
    } catch (e) {
      toast.error((ar ? "فشل الإضافة: " : "Add failed: ") + (e as Error).message);
    } finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await del({ data: { id: pendingDelete.id } });
      toast.success(ar ? "تم الحذف بنجاح" : "Interaction deleted");
      setPendingDelete(null); onChange();
    } catch (e) { toast.error((e as Error).message); }
    finally { setDeleting(false); }
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
        {data.interactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا توجد تفاعلات" : "No interactions yet"}</div>
        ) : (
          <ul className="divide-y">
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
          </ul>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? "حذف التفاعل؟" : "Delete interaction?"}</AlertDialogTitle>
            <AlertDialogDescription>{ar ? "لا يمكن التراجع عن هذا الإجراء." : "This cannot be undone."}</AlertDialogDescription>
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
