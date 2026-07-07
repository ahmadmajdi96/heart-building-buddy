import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listClients, saveClient, deleteClient, getClient, addInteraction, deleteInteraction, conflictCheck } from "@/lib/clients.functions";
import { Plus, Search, Loader2, Pencil, Trash2, Phone, Mail, Building, User, MessageSquare, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/clients")({ component: ClientsPage });

type Client = {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  national_id: string | null; address: string | null; notes: string | null; created_at: string;
  type?: "individual" | "company"; country?: string | null; tax_id?: string | null; status?: "active" | "inactive";
  _active_cases?: number; _total_cases?: number; _last_interaction?: string | null;
};

function ClientsPage() {
  const { locale } = useI18n();
  
  const list = useServerFn(listClients);
  const save = useServerFn(saveClient);
  const del = useServerFn(deleteClient);

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "company">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setClients((await list()) as Client[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => clients.filter((c) => {
    if (statusFilter !== "all" && (c.status ?? "active") !== statusFilter) return false;
    if (typeFilter !== "all" && (c.type ?? "individual") !== typeFilter) return false;
    if (fromDate || toDate) {
      const t = new Date(c.created_at).getTime();
      if (fromDate && t < new Date(fromDate).getTime()) return false;
      if (toDate) { const to = new Date(toDate); to.setHours(23,59,59,999); if (t > to.getTime()) return false; }
    }
    if (!q) return true;
    const s = q.toLowerCase();
    return c.name.toLowerCase().includes(s)
      || (c.email ?? "").toLowerCase().includes(s)
      || (c.company ?? "").toLowerCase().includes(s)
      || (c.phone ?? "").toLowerCase().includes(s);
  }), [clients, q, statusFilter, typeFilter, fromDate, toDate]);

  const hasFilters = q || statusFilter !== "all" || typeFilter !== "all" || fromDate || toDate;
  function clearFilters() { setQ(""); setStatusFilter("all"); setTypeFilter("all"); setFromDate(""); setToDate(""); }

  function openNew() { setEmailError(null); setEditing({ type: "individual", status: "active" }); setEditOpen(true); }
  function openEdit(c: Client) { setEmailError(null); setEditing(c); setEditOpen(true); }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validateEmail(v: string): string | null {
    if (!v) return null;
    if (!emailRe.test(v.trim())) return locale === "ar" ? "بريد إلكتروني غير صالح" : "Invalid email address";
    return null;
  }

  async function submit() {
    if (!editing?.name) { toast.error(locale === "ar" ? "الاسم مطلوب" : "Name is required"); return; }
    const emailErr = validateEmail(editing.email ?? "");
    if (emailErr) {
      setEmailError(emailErr);
      toast.error(locale === "ar" ? "الرجاء تصحيح البريد الإلكتروني قبل الحفظ" : "Please fix the email before saving");
      return;
    }
    setEmailError(null);
    const isNew = !editing.id;
    try {
      await save({ data: {
        id: editing.id, name: editing.name!, email: editing.email ?? "",
        phone: editing.phone ?? "", company: editing.company ?? "",
        national_id: editing.national_id ?? "", address: editing.address ?? "", notes: editing.notes ?? "",
        type: (editing.type as any) ?? "individual",
        country: editing.country ?? "",
        tax_id: editing.tax_id ?? "",
        status: (editing.status as any) ?? "active",
      }});
      toast.success(
        isNew
          ? (locale === "ar" ? "تم إضافة الموكل بنجاح" : "Client added successfully")
          : (locale === "ar" ? "تم حفظ التغييرات بنجاح" : "Client saved successfully"),
      );
      setEditOpen(false); setEditing(null); refresh();
    } catch (e) {
      toast.error(
        (isNew
          ? (locale === "ar" ? "فشل إضافة الموكل: " : "Failed to add client: ")
          : (locale === "ar" ? "فشل الحفظ: " : "Save failed: ")) + (e as Error).message,
      );
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await del({ data: { id: pendingDelete.id } });
      toast.success(locale === "ar" ? "تم حذف الموكل بنجاح" : "Client deleted successfully");
      setPendingDelete(null);
      refresh();
    } catch (e) {
      toast.error((locale === "ar" ? "فشل الحذف: " : "Delete failed: ") + (e as Error).message);
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "الموكلون" : "Clients"}
        subtitle={locale === "ar" ? `${clients.length} موكل` : `${clients.length} clients on file`}
        actions={<div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConflictOpen(true)}><ShieldAlert className="size-4" />{locale === "ar" ? "فحص تعارض" : "Conflict check"}</Button>
          <Button variant="gold" size="sm" className="gap-1.5" onClick={openNew}><Plus className="size-4" />{locale === "ar" ? "موكل جديد" : "New client"}</Button>
        </div>}
      />

      <div className="card-elev rounded-xl border bg-card">
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={locale === "ar" ? "ابحث…" : "Search clients…"} className="h-9 ps-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "الحالة" : "Status"}</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "ar" ? "الكل" : "All"}</SelectItem>
                <SelectItem value="active">{locale === "ar" ? "نشط" : "Active"}</SelectItem>
                <SelectItem value="inactive">{locale === "ar" ? "غير نشط" : "Inactive"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "النوع" : "Type"}</Label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "ar" ? "الكل" : "All"}</SelectItem>
                <SelectItem value="individual">{locale === "ar" ? "فرد" : "Individual"}</SelectItem>
                <SelectItem value="company">{locale === "ar" ? "شركة" : "Company"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "من (تاريخ الإنشاء)" : "From (created)"}</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "إلى" : "To"}</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-[150px]" />
          </div>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1.5 h-9">
              {locale === "ar" ? "مسح" : "Clear"}
            </Button>
          )}
          <div className="ms-auto text-xs text-muted-foreground">
            {filtered.length} / {clients.length}
          </div>
        </div>

        {loading ? <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm">{hasFilters ? (locale === "ar" ? "لا نتائج مطابقة." : "No matching clients.") : (locale === "ar" ? "لا توجد بيانات بعد. أضِف موكلك الأول." : "No clients yet. Add your first client to get started.")}</div>
        : <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الاسم" : "Name"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "النوع" : "Type"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الدولة" : "Country"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "قضايا نشطة" : "Active matters"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "تاريخ الإنشاء" : "Created"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "آخر نشاط" : "Last update"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "البريد" : "Email"}</th>
                <th className="px-5 py-3 text-end font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-5 py-4">
                    <Link to="/app/clients/$clientId" params={{ clientId: c.id }} className="block">
                      <div className="font-medium flex items-center gap-2 hover:text-gold">
                        {c.type === "company" ? <Building className="size-4 text-muted-foreground" /> : <User className="size-4 text-muted-foreground" />}
                        {c.name}
                        {c.status === "inactive" && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">inactive</span>}
                      </div>
                      {c.company && c.type === "individual" && <div className="text-xs text-muted-foreground mt-0.5">{c.company}</div>}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground capitalize">{c.type ?? "individual"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{c.country || "—"}</td>
                  <td className="px-5 py-4">{c._active_cases ?? 0}<span className="text-xs text-muted-foreground"> / {c._total_cases ?? 0}</span></td>
                  <td className="px-5 py-4 text-muted-foreground text-xs tabular-nums" title={new Date(c.created_at).toLocaleString()}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-muted-foreground text-xs">{c._last_interaction ? new Date(c._last_interaction).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{c.email || "—"}</td>
                  <td className="px-5 py-4 text-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setPendingDelete(c)}><Trash2 className="size-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>


      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? (locale === "ar" ? "تعديل موكل" : "Edit client") : (locale === "ar" ? "موكل جديد" : "New client")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{locale === "ar" ? "النوع" : "Type"}</Label>
                <Select value={(editing?.type as string) ?? "individual"} onValueChange={(v) => setEditing({ ...editing!, type: v as any })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{locale === "ar" ? "فرد" : "Individual"}</SelectItem>
                    <SelectItem value="company">{locale === "ar" ? "شركة" : "Company"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{locale === "ar" ? "الحالة" : "Status"}</Label>
                <Select value={(editing?.status as string) ?? "active"} onValueChange={(v) => setEditing({ ...editing!, status: v as any })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{locale === "ar" ? "نشط" : "Active"}</SelectItem>
                    <SelectItem value="inactive">{locale === "ar" ? "غير نشط" : "Inactive"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>{locale === "ar" ? "الاسم *" : "Name *"}</Label>
                {!editing?.id && (editing?.name ?? "").trim().length >= 2 && (
                  <InlineConflictBadge
                    name={editing?.name ?? ""}
                    national_id={editing?.national_id ?? ""}
                    tax_id={editing?.tax_id ?? ""}
                    email={editing?.email ?? ""}
                    phone={editing?.phone ?? ""}
                    onOpenFullCheck={() => { setConflictOpen(true); }}
                  />
                )}
              </div>
              <Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{locale === "ar" ? "الشركة" : "Company"}</Label><Input value={editing?.company ?? ""} onChange={(e) => setEditing({ ...editing!, company: e.target.value })} /></div>
              <div><Label>{locale === "ar" ? "الدولة" : "Country"}</Label><Input value={editing?.country ?? ""} onChange={(e) => setEditing({ ...editing!, country: e.target.value })} placeholder="SA / JO / AE…" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{locale === "ar" ? "الرقم الوطني" : "National ID"}</Label><Input value={editing?.national_id ?? ""} onChange={(e) => setEditing({ ...editing!, national_id: e.target.value })} /></div>
              <div><Label>{locale === "ar" ? "الرقم الضريبي" : "Tax ID / VAT"}</Label><Input value={editing?.tax_id ?? ""} onChange={(e) => setEditing({ ...editing!, tax_id: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{locale === "ar" ? "البريد" : "Email"}</Label>
                <Input
                  type="email"
                  value={editing?.email ?? ""}
                  onChange={(e) => { setEditing({ ...editing!, email: e.target.value }); if (emailError) setEmailError(null); }}
                  onBlur={(e) => setEmailError(validateEmail(e.target.value))}
                  aria-invalid={!!emailError}
                  className={emailError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
              </div>
              <div><Label>{locale === "ar" ? "الهاتف" : "Phone"}</Label><Input value={editing?.phone ?? ""} onChange={(e) => setEditing({ ...editing!, phone: e.target.value })} /></div>
            </div>
            <div><Label>{locale === "ar" ? "العنوان" : "Address"}</Label><Input value={editing?.address ?? ""} onChange={(e) => setEditing({ ...editing!, address: e.target.value })} /></div>
            <div><Label>{locale === "ar" ? "ملاحظات" : "Notes"}</Label><Textarea rows={3} value={editing?.notes ?? ""} onChange={(e) => setEditing({ ...editing!, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditOpen(false)}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button><Button variant="gold" onClick={submit}>{locale === "ar" ? "حفظ" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConflictCheckDialog open={conflictOpen} onClose={() => setConflictOpen(false)} />
      <ClientDetailSheet id={detailId} onClose={() => setDetailId(null)} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locale === "ar" ? "حذف الموكل؟" : "Delete client?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {locale === "ar"
                ? `سيتم حذف "${pendingDelete?.name ?? ""}" وقد يؤثر ذلك على القضايا المرتبطة. لا يمكن التراجع.`
                : `"${pendingDelete?.name ?? ""}" will be permanently deleted. This may affect linked matters and cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{locale === "ar" ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin me-1.5" />}
              {locale === "ar" ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConflictCheckDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useI18n();
  const check = useServerFn(conflictCheck);
  const [form, setForm] = useState({ name: "", national_id: "", tax_id: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof conflictCheck>> | null>(null);

  async function run() {
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error(locale === "ar" ? "أدخل اسماً على الأقل (حرفين)" : "Enter a name (at least 2 characters)");
      return;
    }
    setBusy(true);
    try {
      const r = await check({ data: form });
      setResult(r);
      const total = (r.clients?.length ?? 0) + (r.parties?.length ?? 0) + (r.identityMatches?.length ?? 0);
      if (total === 0) toast.success(locale === "ar" ? "لا توجد تعارضات" : "No conflicts found");
      else toast.warning(locale === "ar" ? `تم العثور على ${total} تطابق محتمل` : `Found ${total} potential match${total > 1 ? "es" : ""}`);
    }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function reset() { setForm({ name: "", national_id: "", tax_id: "", email: "", phone: "" }); setResult(null); }

  const hasMatches = result && (result.clients.length || result.parties.length || result.identityMatches.length);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldAlert className="size-5 text-amber-600" />{locale === "ar" ? "فحص تعارض" : "Conflict check"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{locale === "ar" ? "ابحث في الموكلين والأطراف المعارضة عن أي تعارض محتمل قبل قبول قضية جديدة. يمكنك تعبئة أي حقل من الحقول الاختيارية لتحسين الدقة." : "Search existing clients and opposing parties for potential conflicts before accepting a new matter. Fill in any of the optional fields for a stronger check."}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>{locale === "ar" ? "الاسم *" : "Name *"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") run(); }} autoFocus /></div>
            <div><Label>{locale === "ar" ? "الرقم الوطني" : "National ID"}</Label><Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} /></div>
            <div><Label>{locale === "ar" ? "الرقم الضريبي" : "Tax ID"}</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
            <div><Label>{locale === "ar" ? "البريد" : "Email"}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>{locale === "ar" ? "الهاتف" : "Phone"}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+962…" /></div>
          </div>
          <Button onClick={run} disabled={busy} variant="gold" className="w-full">
            {busy && <Loader2 className="size-4 animate-spin" />}{locale === "ar" ? "تشغيل الفحص" : "Run conflict check"}
          </Button>
          {result && (
            <div className="space-y-3 mt-2 max-h-[40vh] overflow-y-auto">
              {!hasMatches ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="size-4" />{locale === "ar" ? "لا توجد تعارضات." : "No conflicts found."}
                </div>
              ) : (
                <>
                  {result.identityMatches.length > 0 && (
                    <Section title={locale === "ar" ? "تطابق هوية مؤكَّد" : "Exact identity matches"} tone="danger">
                      {result.identityMatches.map((m: any, i: number) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{m.name}</span>
                          <span className="ms-2 text-xs text-muted-foreground">via {m._match}</span>
                        </div>
                      ))}
                    </Section>
                  )}
                  {result.clients.length > 0 && (
                    <Section title={locale === "ar" ? `موكلون مطابقون (${result.clients.length})` : `Matching clients (${result.clients.length})`} tone="warn">
                      {result.clients.map((c: any) => (
                        <div key={c.id} className="text-sm">
                          <span className="font-medium">{c.name}</span>
                          {c.email && <span className="ms-2 text-xs text-muted-foreground">{c.email}</span>}
                          {c.company && <span className="ms-2 text-xs text-muted-foreground">· {c.company}</span>}
                        </div>
                      ))}
                    </Section>
                  )}
                  {result.parties.length > 0 && (
                    <Section title={locale === "ar" ? `أطراف في قضايا (${result.parties.length})` : `Parties in existing matters (${result.parties.length})`} tone="warn">
                      {result.parties.map((p: any) => (
                        <div key={p.id} className="text-sm">
                          <span className="font-medium">{p.name}</span>
                          <span className="ms-2 text-xs text-muted-foreground">as {p.role}</span>
                          {p.cases && <span className="ms-2 text-xs text-muted-foreground">in {p.cases.title} ({p.cases.case_number ?? "—"})</span>}
                        </div>
                      ))}
                    </Section>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => { onClose(); reset(); }}>{locale === "ar" ? "إغلاق" : "Close"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, tone, children }: { title: string; tone: "danger" | "warn"; children: React.ReactNode }) {
  const c = tone === "danger" ? "border-destructive/30 bg-destructive/5" : "border-amber-200 bg-amber-50";
  return (
    <div className={`rounded-md border ${c} p-3`}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

type Detail = Awaited<ReturnType<typeof getClient>>;

function ClientDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { locale } = useI18n();
  const get = useServerFn(getClient);
  const addIntr = useServerFn(addInteraction);
  const delIntr = useServerFn(deleteInteraction);
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newIntr, setNewIntr] = useState<{ kind: "call" | "session" | "note" | "email"; title: string; body: string }>({ kind: "note", title: "", body: "" });

  async function refresh() {
    if (!id) return;
    setLoading(true);
    try { setData(await get({ data: { id } })); } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => { if (id) refresh(); else setData(null); }, [id]);

  async function logIt() {
    if (!id || !newIntr.title.trim()) return;
    try { await addIntr({ data: { client_id: id, ...newIntr } }); setNewIntr({ kind: "note", title: "", body: "" }); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function removeIntr(iid: string) { try { await delIntr({ data: { id: iid } }); refresh(); } catch (e) { toast.error((e as Error).message); } }

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>{data?.client?.name ?? (locale === "ar" ? "تفاصيل الموكل" : "Client details")}</SheetTitle></SheetHeader>
        {loading || !data?.client ? <div className="grid place-items-center p-8"><Loader2 className="size-5 animate-spin text-gold" /></div> :
        <div className="mt-4 space-y-6">
          <div className="grid gap-2 text-sm">
            {data.client.company && <div className="flex items-center gap-2"><Building className="size-4 text-muted-foreground" />{data.client.company}</div>}
            {data.client.email && <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" />{data.client.email}</div>}
            {data.client.phone && <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{data.client.phone}</div>}
            {(data.client as any).country && <div className="text-xs text-muted-foreground">Country: {(data.client as any).country}</div>}
            {(data.client as any).tax_id && <div className="text-xs text-muted-foreground">Tax ID: {(data.client as any).tax_id}</div>}
            {data.client.notes && <p className="text-muted-foreground mt-2">{data.client.notes}</p>}
          </div>
          <section>
            <h3 className="text-sm font-semibold mb-2">{locale === "ar" ? "قضايا مرتبطة" : "Related cases"}</h3>
            {data.cases.length === 0 ? <p className="text-xs text-muted-foreground">{locale === "ar" ? "لا توجد" : "None yet"}</p> :
              <ul className="space-y-2">
                {data.cases.map((c) => (
                  <li key={c.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.case_number ?? ""} · {c.status}</div>
                  </li>
                ))}
              </ul>}
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><MessageSquare className="size-4" />{locale === "ar" ? "سجل التفاعلات" : "Interaction log"}</h3>
            <div className="rounded-md border p-3 space-y-2 mb-3">
              <div className="grid grid-cols-3 gap-2">
                <Select value={newIntr.kind} onValueChange={(v) => setNewIntr({ ...newIntr, kind: v as any })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">{locale === "ar" ? "مكالمة" : "Call"}</SelectItem>
                    <SelectItem value="session">{locale === "ar" ? "جلسة" : "Session"}</SelectItem>
                    <SelectItem value="email">{locale === "ar" ? "بريد" : "Email"}</SelectItem>
                    <SelectItem value="note">{locale === "ar" ? "ملاحظة" : "Note"}</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="col-span-2 h-9" placeholder={locale === "ar" ? "العنوان" : "Title"} value={newIntr.title} onChange={(e) => setNewIntr({ ...newIntr, title: e.target.value })} />
              </div>
              <Textarea rows={2} placeholder={locale === "ar" ? "تفاصيل…" : "Details…"} value={newIntr.body} onChange={(e) => setNewIntr({ ...newIntr, body: e.target.value })} />
              <Button size="sm" variant="gold" onClick={logIt}>{locale === "ar" ? "تسجيل" : "Log"}</Button>
            </div>
            <ul className="space-y-2">
              {data.interactions.map((i) => (
                <li key={i.id} className="rounded-md border p-3 text-sm group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gold">{i.kind}</div>
                      <div className="font-medium">{i.title}</div>
                      {i.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{i.body}</p>}
                      <div className="text-[11px] text-muted-foreground mt-1">{new Date(i.occurred_at).toLocaleString()}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeIntr(i.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>}
      </SheetContent>
    </Sheet>
  );
}

/** Debounced inline conflict check shown as a small badge next to the Name field. */
function InlineConflictBadge({
  name, national_id, tax_id, email, phone, onOpenFullCheck,
}: { name: string; national_id: string; tax_id: string; email: string; phone: string; onOpenFullCheck: () => void }) {
  const { locale } = useI18n();
  const check = useServerFn(conflictCheck);
  const [count, setCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setCount(null); return; }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const r = await check({ data: { name: trimmed, national_id, tax_id, email, phone } });
        if (cancelled) return;
        const total = (r.clients?.length ?? 0) + (r.parties?.length ?? 0) + (r.identityMatches?.length ?? 0);
        setCount(total);
      } catch { if (!cancelled) setCount(null); }
      finally { if (!cancelled) setChecking(false); }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); setChecking(false); };
  }, [name, national_id, tax_id, email, phone, check]);

  if (checking && count === null) {
    return <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" />{locale === "ar" ? "فحص…" : "checking…"}</span>;
  }
  if (count === null) return null;
  if (count === 0) {
    return <span className="text-[10px] text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="size-3" />{locale === "ar" ? "لا تعارض" : "no conflict"}</span>;
  }
  return (
    <button
      type="button"
      onClick={onOpenFullCheck}
      className="text-[10px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-full px-2 py-0.5 inline-flex items-center gap-1"
      title={locale === "ar" ? "عرض التفاصيل" : "View details"}
    >
      <ShieldAlert className="size-3" />
      {count} {locale === "ar" ? "تطابق محتمل" : count === 1 ? "potential match" : "potential matches"}
    </button>
  );
}

