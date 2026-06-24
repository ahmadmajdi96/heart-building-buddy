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
import { getCase, addCaseEvent, deleteCaseEvent } from "@/lib/cases.functions";
import { createDocument, getSignedDownloadUrl, deleteDocument } from "@/lib/documents.functions";
import { saveAppointment } from "@/lib/appointments.functions";
import { listParties, saveParty, deleteParty, listNotes, addNote, deleteNote } from "@/lib/case-extras.functions";
import { listCaseMembers, addCaseMember, removeCaseMember, updateCaseMemberRole, listAssignableUsers } from "@/lib/case-members.functions";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Trash2, Upload, Download, Plus, Calendar as CalIcon, FileText, Users, StickyNote, ClipboardList, UserPlus, Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/cases/$caseId")({ component: CaseProfilePage });

function CaseProfilePage() {
  const { caseId } = Route.useParams();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const get = useServerFn(getCase);
  const [data, setData] = useState<Awaited<ReturnType<typeof getCase>> | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setData(await get({ data: { id: caseId } })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [caseId]);

  if (loading) return <div className="grid place-items-center p-12"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  if (!data?.case) return (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">{locale === "ar" ? "القضية غير موجودة" : "Case not found"}</p>
      <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: "/app/cases" })}>{locale === "ar" ? "رجوع" : "Back"}</Button>
    </div>
  );

  const c = data.case;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/cases" className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-4" />{locale === "ar" ? "كل القضايا" : "All cases"}</Link>
      </div>
      <PageHeader
        title={c.title}
        subtitle={[c.case_number && `#${c.case_number}`, c.court, c.jurisdiction].filter(Boolean).join(" · ") || undefined}
        actions={<StatusBadge status={c.status} />}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex w-full flex-wrap gap-1 bg-card border h-auto p-1">
          <TabsTrigger value="overview" className="gap-1.5"><ClipboardList className="size-3.5" />{locale === "ar" ? "نظرة عامة" : "Overview"}</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5"><CalIcon className="size-3.5" />{locale === "ar" ? "الجلسات" : "Sessions"}</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="size-3.5" />{locale === "ar" ? "المستندات" : "Documents"}</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="size-3.5" />{locale === "ar" ? "الفواتير" : "Invoices"}</TabsTrigger>
          <TabsTrigger value="parties" className="gap-1.5"><Users className="size-3.5" />{locale === "ar" ? "الأطراف" : "Parties"}</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><UserPlus className="size-3.5" />{locale === "ar" ? "الفريق" : "Team"}</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="size-3.5" />{locale === "ar" ? "الملاحظات" : "Notes"}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab data={data} />
        </TabsContent>
        <TabsContent value="sessions" className="mt-6">
          <SessionsTab caseId={caseId} data={data} onChange={refresh} />
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <DocumentsTab caseId={caseId} docs={data.documents} onChange={refresh} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-6">
          <InvoicesTab data={data} />
        </TabsContent>
        <TabsContent value="parties" className="mt-6">
          <PartiesTab caseId={caseId} />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <TeamTab caseId={caseId} />
        </TabsContent>
        <TabsContent value="notes" className="mt-6">
          <NotesTab caseId={caseId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


function OverviewTab({ data }: { data: NonNullable<Awaited<ReturnType<typeof getCase>>> }) {
  const { locale } = useI18n();
  const c = data.case! as any;
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-[160px_1fr] gap-3 py-2 border-b last:border-b-0">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
  const billableHours = data.timeEntries.filter((t: any) => t.billable).reduce((s: number, t: any) => s + Number(t.duration_seconds || 0), 0) / 3600;
  const invoicedTotal = data.invoices.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const paidTotal = data.invoices.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0);
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="card-elev rounded-xl border bg-card p-5 md:col-span-2">
        <h3 className="font-serif text-lg mb-3">{locale === "ar" ? "تفاصيل القضية" : "Case details"}</h3>
        <Row label={locale === "ar" ? "الرقم" : "Reference"} value={c.case_number} />
        <Row label={locale === "ar" ? "المحكمة" : "Court"} value={c.court} />
        <Row label={locale === "ar" ? "القاعة" : "Court room"} value={c.court_room} />
        <Row label={locale === "ar" ? "الاختصاص" : "Jurisdiction"} value={c.jurisdiction} />
        <Row label={locale === "ar" ? "القاضي" : "Judge"} value={c.judge} />
        <Row label={locale === "ar" ? "الطرف المعارض" : "Opposing party"} value={c.opposing_party} />
        <Row label={locale === "ar" ? "محامي الخصم" : "Opposing counsel"} value={c.opposing_counsel} />
        <Row label={locale === "ar" ? "الأولوية" : "Priority"} value={c.priority} />
        <Row label={locale === "ar" ? "تاريخ الفتح" : "Opened"} value={c.opened_at ? new Date(c.opened_at).toLocaleDateString() : null} />
        <Row label={locale === "ar" ? "الموكل" : "Client"} value={c.clients?.name} />
        <Row label={locale === "ar" ? "الوصف" : "Description"} value={c.description ? <p className="whitespace-pre-wrap">{c.description}</p> : null} />
      </div>
      <div className="card-elev rounded-xl border bg-card p-5">
        <h3 className="font-serif text-lg mb-3">{locale === "ar" ? "ملخص" : "Summary"}</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "الجلسات" : "Sessions"}</span><span className="font-medium">{data.appointments.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "المستندات" : "Documents"}</span><span className="font-medium">{data.documents.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "الأحداث" : "Events"}</span><span className="font-medium">{data.events.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "ساعات قابلة للفوترة" : "Billable hours"}</span><span className="font-medium">{billableHours.toFixed(1)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "إجمالي مفوتر" : "Invoiced"}</span><span className="font-medium">{invoicedTotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{locale === "ar" ? "مدفوع" : "Paid"}</span><span className="font-medium text-emerald-600">{paidTotal.toFixed(2)}</span></div>
          <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">{locale === "ar" ? "ربحية تقديرية" : "Estimated profit"}</span><span className="font-medium">{(paidTotal - 0).toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}

function InvoicesTab({ data }: { data: NonNullable<Awaited<ReturnType<typeof getCase>>> }) {
  const { locale } = useI18n();
  const invoices = data.invoices ?? [];
  if (invoices.length === 0) {
    return <div className="card-elev rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
      {locale === "ar" ? "لا توجد فواتير لهذه القضية بعد. أنشئ واحدة من صفحة الماليات أو من تتبع الوقت." : "No invoices yet for this matter. Create one from Financials or from Time tracking."}
    </div>;
  }
  return (
    <div className="card-elev rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-5 py-3 text-start font-medium">#</th>
            <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الإصدار" : "Issued"}</th>
            <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الاستحقاق" : "Due"}</th>
            <th className="px-5 py-3 text-end font-medium">{locale === "ar" ? "الإجمالي" : "Total"}</th>
            <th className="px-5 py-3 text-end font-medium">{locale === "ar" ? "المدفوع" : "Paid"}</th>
            <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الحالة" : "Status"}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invoices.map((iv: any) => (
            <tr key={iv.id} className="hover:bg-secondary/40">
              <td className="px-5 py-3 font-mono text-xs">{iv.number}</td>
              <td className="px-5 py-3">{iv.issue_date}</td>
              <td className={`px-5 py-3 ${iv.status === "overdue" ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{iv.due_date || "—"}</td>
              <td className="px-5 py-3 text-end font-mono">{Number(iv.total).toFixed(2)} {iv.currency}</td>
              <td className="px-5 py-3 text-end font-mono">{Number(iv.amount_paid).toFixed(2)} {iv.currency}</td>
              <td className="px-5 py-3"><StatusBadge status={iv.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function SessionsTab({ caseId, data, onChange }: { caseId: string; data: NonNullable<Awaited<ReturnType<typeof getCase>>>; onChange: () => void }) {
  const { locale } = useI18n();
  const addEv = useServerFn(addCaseEvent);
  const delEv = useServerFn(deleteCaseEvent);
  const saveAppt = useServerFn(saveAppointment);
  const [form, setForm] = useState({ title: "", scheduled_at: "", body: "" });

  async function add() {
    if (!form.title || !form.scheduled_at) {
      toast.error(locale === "ar" ? "العنوان والتاريخ مطلوبان" : "Title and date are required");
      return;
    }
    try {
      await addEv({ data: { case_id: caseId, kind: "court_session", title: form.title, body: form.body || undefined, scheduled_at: form.scheduled_at } });
      const starts = new Date(form.scheduled_at).toISOString();
      const ends = new Date(new Date(form.scheduled_at).getTime() + 3600_000).toISOString();
      await saveAppt({ data: { title: form.title, starts_at: starts, ends_at: ends, all_day: false, kind: "court", case_id: caseId, description: form.body || undefined } });
      toast.success(locale === "ar" ? "أضيفت الجلسة إلى التقويم" : "Session added to calendar");
      setForm({ title: "", scheduled_at: "", body: "" });
      onChange();
    } catch (e) { toast.error((e as Error).message); }
  }

  const sessions = data.events.filter((e: any) => e.kind === "court_session");
  return (
    <div className="space-y-6">
      <div className="card-elev rounded-xl border bg-card p-5">
        <h3 className="font-serif text-lg mb-4">{locale === "ar" ? "إضافة جلسة" : "Add court session"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>{locale === "ar" ? "العنوان *" : "Title *"}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{locale === "ar" ? "التاريخ والوقت *" : "Date & time *"}</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{locale === "ar" ? "تفاصيل" : "Details"}</Label><Textarea rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        </div>
        <Button variant="gold" size="sm" className="mt-4 gap-1.5" onClick={add}><Plus className="size-4" />{locale === "ar" ? "إضافة" : "Add session"}</Button>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        <div className="border-b p-4"><h3 className="font-serif text-lg">{locale === "ar" ? "الجلسات والمواعيد" : "Sessions & appointments"}</h3></div>
        {data.appointments.length === 0 && sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{locale === "ar" ? "لا توجد جلسات بعد" : "No sessions yet"}</div>
        ) : (
          <ul className="divide-y">
            {data.appointments.map((a: any) => (
              <li key={a.id} className="flex items-start justify-between p-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gold">{locale === "ar" ? "موعد" : "Appointment"}</div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(a.starts_at).toLocaleString()}{a.location ? ` · ${a.location}` : ""}</div>
                </div>
              </li>
            ))}
            {sessions.map((e: any) => (
              <li key={e.id} className="flex items-start justify-between p-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gold">{locale === "ar" ? "جلسة" : "Session"}</div>
                  <div className="font-medium">{e.title}</div>
                  {e.scheduled_at && <div className="text-xs text-muted-foreground mt-1">{new Date(e.scheduled_at).toLocaleString()}</div>}
                  {e.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.body}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={async () => { await delEv({ data: { id: e.id } }); onChange(); }}><Trash2 className="size-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ caseId, docs, onChange }: { caseId: string; docs: any[]; onChange: () => void }) {
  const { locale } = useI18n();
  const createDoc = useServerFn(createDocument);
  const signedUrl = useServerFn(getSignedDownloadUrl);
  const delDoc = useServerFn(deleteDocument);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<string>("other");
  const [filter, setFilter] = useState<string>("all");

  const categories = [
    { v: "pleading", ar: "مذكرات", en: "Pleadings" },
    { v: "contract", ar: "عقود", en: "Contracts" },
    { v: "evidence", ar: "أدلة", en: "Evidence" },
    { v: "court_paper", ar: "أوراق المحكمة", en: "Court papers" },
    { v: "invoice", ar: "فواتير", en: "Invoices" },
    { v: "correspondence", ar: "مراسلات", en: "Correspondence" },
    { v: "other", ar: "أخرى", en: "Other" },
  ];
  const catLabel = (v: string | null) => categories.find((c) => c.v === v)?.[locale === "ar" ? "ar" : "en"] ?? (locale === "ar" ? "أخرى" : "Other");

  async function upload(file: File) {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/${caseId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) throw error;
      await createDoc({ data: { name: file.name, mime_type: file.type, size: file.size, storage_path: path, case_id: caseId, category } });
      toast.success(locale === "ar" ? "تم الرفع" : "Uploaded");
      onChange();
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  }
  async function dl(id: string) {
    try { const { url, name } = await signedUrl({ data: { id } }); const a = document.createElement("a"); a.href = url; a.download = name; a.target = "_blank"; a.click(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const filtered = filter === "all" ? docs : docs.filter((d) => (d.category ?? "other") === filter);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground hover:bg-secondary/40">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span>{locale === "ar" ? "رفع مستند جديد" : "Upload a document"}</span>
          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        </label>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{locale === "ar" ? "الفئة" : "Category"}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c.v} value={c.v}>{locale === "ar" ? c.ar : c.en}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{locale === "ar" ? "تصفية" : "Filter"}</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{locale === "ar" ? "الكل" : "All categories"}</SelectItem>
            {categories.map((c) => <SelectItem key={c.v} value={c.v}>{locale === "ar" ? c.ar : c.en}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="card-elev rounded-xl border bg-card">
        {filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{locale === "ar" ? "لا توجد مستندات" : "No documents"}</div>
        : <ul className="divide-y">
          {filtered.map((d) => (
            <li key={d.id} className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider">{catLabel(d.category)}</span>
                  <span>{Math.round((d.size ?? 0) / 1024)} KB</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => dl(d.id)}><Download className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={async () => { if (confirm(locale === "ar" ? "حذف؟" : "Delete?")) { await delDoc({ data: { id: d.id } }); onChange(); } }}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </li>
          ))}
        </ul>}
      </div>
    </div>
  );
}

function PartiesTab({ caseId }: { caseId: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listParties);
  const save = useServerFn(saveParty);
  const del = useServerFn(deleteParty);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", role: "other", contact: "", email: "", phone: "", notes: "" });
  const [loading, setLoading] = useState(true);

  const roles = [
    { value: "plaintiff", ar: "مدعي", en: "Plaintiff" },
    { value: "defendant", ar: "مدعى عليه", en: "Defendant" },
    { value: "counsel", ar: "محامي", en: "Counsel" },
    { value: "witness", ar: "شاهد", en: "Witness" },
    { value: "judge", ar: "قاضي", en: "Judge" },
    { value: "other", ar: "أخرى", en: "Other" },
  ];
  const roleLabel = (v: string) => roles.find((r) => r.value === v)?.[ar ? "ar" : "en"] ?? v;

  async function refresh() { setLoading(true); try { setRows(await list({ data: { case_id: caseId } })); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, [caseId]);

  async function add() {
    if (!form.name) { toast.error(ar ? "الاسم مطلوب" : "Name required"); return; }
    try {
      await save({ data: { case_id: caseId, ...form } });
      setForm({ name: "", role: "other", contact: "", email: "", phone: "", notes: "" });
      toast.success(ar ? "تمت إضافة الطرف" : "Party added");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function remove(id: string) {
    if (!confirm(ar ? "حذف الطرف؟" : "Delete party?")) return;
    try { await del({ data: { id } }); toast.success(ar ? "تم الحذف" : "Deleted"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="card-elev rounded-xl border bg-card p-5">
        <h3 className="font-serif text-lg mb-4">{ar ? "إضافة طرف" : "Add party"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>{ar ? "الاسم *" : "Name *"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{ar ? "الدور" : "Role"}</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{roles.map((r) => <SelectItem key={r.value} value={r.value}>{ar ? r.ar : r.en}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{ar ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{ar ? "الهاتف" : "Phone"}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{ar ? "وسيلة تواصل أخرى" : "Other contact"}</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{ar ? "ملاحظات" : "Notes"}</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <Button variant="gold" size="sm" className="mt-4 gap-1.5" onClick={add}><Plus className="size-4" />{ar ? "إضافة" : "Add"}</Button>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        {loading ? <div className="p-8 grid place-items-center"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا توجد أطراف" : "No parties yet"}</div>
        : <ul className="divide-y">{rows.map((p) => (
          <li key={p.id} className="flex items-start justify-between p-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-gold">{roleLabel(p.role)}</div>
              <div className="font-medium">{p.name}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {p.email && <span>✉ {p.email}</span>}
                {p.phone && <span>☎ {p.phone}</span>}
                {p.contact && <span>{p.contact}</span>}
              </div>
              {p.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{p.notes}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </li>
        ))}</ul>}
      </div>
    </div>
  );
}

function NotesTab({ caseId }: { caseId: string }) {
  const { locale } = useI18n();
  const list = useServerFn(listNotes);
  const add = useServerFn(addNote);
  const del = useServerFn(deleteNote);
  const [rows, setRows] = useState<any[]>([]);
  const [body, setBody] = useState("");

  async function refresh() { setRows(await list({ data: { case_id: caseId } })); }
  useEffect(() => { refresh(); }, [caseId]);

  async function submit() {
    if (!body.trim()) return;
    try { await add({ data: { case_id: caseId, body: body.trim() } }); setBody(""); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="card-elev rounded-xl border bg-card p-5">
        <Label>{locale === "ar" ? "ملاحظة جديدة" : "New note"}</Label>
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1.5" />
        <Button variant="gold" size="sm" className="mt-3 gap-1.5" onClick={submit}><Plus className="size-4" />{locale === "ar" ? "إضافة ملاحظة" : "Add note"}</Button>
      </div>
      <div className="card-elev rounded-xl border bg-card">
        {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{locale === "ar" ? "لا توجد ملاحظات" : "No notes yet"}</div>
        : <ul className="divide-y">{rows.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              <div className="mt-2 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={async () => { await del({ data: { id: n.id } }); refresh(); }}><Trash2 className="size-4 text-destructive" /></Button>
          </li>
        ))}</ul>}
      </div>
    </div>
  );
}

function TeamTab({ caseId }: { caseId: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listCaseMembers);
  const add = useServerFn(addCaseMember);
  const remove = useServerFn(removeCaseMember);
  const updateRole = useServerFn(updateCaseMemberRole);
  const listUsers = useServerFn(listAssignableUsers);
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<Array<{ user_id: string; full_name: string | null }>>([]);
  const [picking, setPicking] = useState<string>("");
  const [pickRole, setPickRole] = useState<string>("associate");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [ms, us] = await Promise.all([list({ data: { case_id: caseId } }), listUsers()]);
      setRows(ms as any[]);
      setUsers(us as any[]);
    } catch (e) { toast.error((e as Error).message); }
  }
  useEffect(() => { refresh(); }, [caseId]);

  const assignedIds = new Set(rows.map((r: any) => r.user_id));
  const available = users.filter((u) => !assignedIds.has(u.user_id));

  const roleLabels: Record<string, [string, string]> = {
    lead: ["محامي رئيسي", "Lead"],
    co_counsel: ["محامي مشارك", "Co-counsel"],
    associate: ["محامي", "Associate"],
    paralegal: ["مساعد قانوني", "Paralegal"],
    support: ["دعم", "Support"],
  };
  const tr = (k: string) => roleLabels[k]?.[ar ? 0 : 1] ?? k;

  return (
    <div className="space-y-4">
      <div className="card-elev rounded-xl border bg-card p-5">
        <Label>{ar ? "إضافة عضو فريق" : "Add team member"}</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <Select value={picking} onValueChange={setPicking}>
            <SelectTrigger><SelectValue placeholder={ar ? "اختر زميلًا…" : "Select a colleague…"} /></SelectTrigger>
            <SelectContent>
              {available.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{ar ? "لا يوجد زملاء متاحون" : "No available colleagues"}</div>}
              {available.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.user_id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pickRole} onValueChange={setPickRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(roleLabels).map((r) => <SelectItem key={r} value={r}>{tr(r)}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="gold" size="sm" className="gap-1.5" disabled={!picking || busy} onClick={async () => {
            setBusy(true);
            try {
              await add({ data: { case_id: caseId, user_id: picking, role: pickRole as any } });
              setPicking(""); setPickRole("associate"); refresh();
              toast.success(ar ? "أُضيف العضو" : "Member added");
            } catch (e) { toast.error((e as Error).message); }
            finally { setBusy(false); }
          }}><UserPlus className="size-4" />{ar ? "إضافة" : "Add"}</Button>
        </div>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{ar ? "لا يوجد أعضاء بعد" : "No team members yet"}</div>
        : <ul className="divide-y">{rows.map((m: any) => (
          <li key={m.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-medium">{m.profiles?.full_name || m.user_id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">{ar ? "أُضيف" : "Added"} {new Date(m.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={m.role} onValueChange={async (v) => {
                try { await updateRole({ data: { id: m.id, role: v as any } }); toast.success(ar ? "تم تحديث الدور" : "Role updated"); refresh(); }
                catch (e) { toast.error((e as Error).message); }
              }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(roleLabels).map((r) => <SelectItem key={r} value={r}>{tr(r)}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={async () => {
                if (!confirm(ar ? "إزالة العضو؟" : "Remove member?")) return;
                try { await remove({ data: { id: m.id } }); toast.success(ar ? "تمت الإزالة" : "Member removed"); refresh(); }
                catch (e) { toast.error((e as Error).message); }
              }}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          </li>
        ))}</ul>}
      </div>
    </div>
  );
}
