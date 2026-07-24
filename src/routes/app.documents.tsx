import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listDocuments, createDocument, getSignedDownloadUrl, deleteDocument } from "@/lib/documents.functions";
import { listCases } from "@/lib/cases.functions";
import { listClients } from "@/lib/clients.functions";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile, validateDocFile, ALLOWED_DOC_EXT, MAX_DOC_BYTES } from "@/lib/extract-text";
import { FileText, Upload, Download, Trash2, Loader2, Search, BookMarked, Eye, X, Users, Briefcase, FileStack } from "lucide-react";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { DocumentPreviewBody } from "@/components/documents/preview-body";

export const Route = createFileRoute("/app/documents")({ component: DocsPage });

type Doc = {
  id: string; name: string; mime_type: string | null; size: number | null;
  case_id: string | null; client_id: string | null; created_at: string;
  is_template?: boolean | null;
  cases?: { id: string; title: string } | null;
  clients?: { id: string; name: string } | null;
};

function DocsPage() {
  const { locale } = useI18n();
  const list = useServerFn(listDocuments);
  const create = useServerFn(createDocument);
  const signed = useServerFn(getSignedDownloadUrl);
  const del = useServerFn(deleteDocument);
  const listC = useServerFn(listCases);
  const listCl = useServerFn(listClients);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [cases, setCases] = useState<{ id: string; title: string; client_id: string | null }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [caseId, setCaseId] = useState<string>("none");
  const [clientId, setClientId] = useState<string>("none");
  const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Filter state
  const [typeFilter, setTypeFilter] = useState<"all" | "template" | "case" | "client">("all");
  const [filterCase, setFilterCase] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");


  async function refresh() {
    setLoading(true);
    try {
      const [d, c, cl] = await Promise.all([list(), listC(), listCl()]);
      setDocs(d as Doc[]);
      setCases((c as any[]).map((x) => ({ id: x.id, title: x.title, client_id: x.client_id ?? null })));
      setClients((cl as any[]).map((x) => ({ id: x.id, name: x.name })));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  // Keep case/client dropdowns in sync: picking a case auto-fills the linked
  // client; picking a client narrows the case list to that client's matters.
  const casesForClient = clientId === "none" ? cases : cases.filter((c) => c.client_id === clientId);
  function onCaseChange(v: string) {
    setCaseId(v);
    if (v !== "none") {
      const chosen = cases.find((c) => c.id === v);
      if (chosen?.client_id) setClientId(chosen.client_id);
    }
  }
  function onClientChange(v: string) {
    setClientId(v);
    // If the currently-selected case doesn't belong to this client, clear it.
    if (v !== "none" && caseId !== "none") {
      const chosen = cases.find((c) => c.id === caseId);
      if (chosen && chosen.client_id !== v) setCaseId("none");
    }
  }

  async function upload(file: File) {
    const v = validateDocFile(file);
    if (!v.ok) { toast.error(v.reason); return; }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const folder = caseId === "none" ? "general" : caseId;
      const path = `${u.user.id}/${folder}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) throw error;
      const extracted = await extractTextFromFile(file);
      const cId = caseId === "none" ? null : caseId;
      // If a case is selected but no client, inherit the client from the case
      // so the "client-related" counter reflects the link.
      const inheritedClient = cId ? (cases.find((c) => c.id === cId)?.client_id ?? null) : null;
      const clId = clientId === "none" ? inheritedClient : clientId;
      const isTemplate = !cId && !clId;
      await create({ data: {
        name: file.name, mime_type: file.type, size: file.size, storage_path: path,
        extracted_text: extracted || undefined,
        case_id: cId, client_id: clId, is_template: isTemplate,
      }});
      toast.success(isTemplate
        ? (locale === "ar" ? "تم رفع المستند كقالب بنجاح" : "Document uploaded as template")
        : (locale === "ar" ? "تم رفع المستند بنجاح" : "Document uploaded successfully"));
      refresh();
    } catch (e) {
      toast.error(locale === "ar"
        ? `فشل رفع المستند: ${(e as Error).message}`
        : `Upload failed: ${(e as Error).message}`);
    }
    finally { setUploading(false); }
  }

  async function download(id: string) {
    try { const { url, name } = await signed({ data: { id } }); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function openPreview(d: Doc) {
    setPreviewLoading(true);
    try {
      const { url, name, mime_type } = await signed({ data: { id: d.id } });
      setPreview({ url, name, mime: mime_type ?? d.mime_type ?? null });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setPreviewLoading(false); }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await del({ data: { id: pendingDelete.id } });
      toast.success(locale === "ar" ? "تم حذف المستند بنجاح" : "Document deleted successfully");
      setPendingDelete(null);
      refresh();
    } catch (e) {
      toast.error(locale === "ar"
        ? `فشل حذف المستند: ${(e as Error).message}`
        : `Delete failed: ${(e as Error).message}`);
    } finally { setDeleting(false); }
  }

  const filtered = useMemo(() => docs.filter((d) => {
    // Type filter
    if (typeFilter === "template" && !d.is_template) return false;
    if (typeFilter === "case" && !d.case_id) return false;
    if (typeFilter === "client" && (!d.client_id || d.case_id)) return false;
    // Explicit case/client filters
    if (filterCase !== "all") {
      if (filterCase === "none" ? d.case_id : d.case_id !== filterCase) return false;
    }
    if (filterClient !== "all") {
      if (filterClient === "none" ? d.client_id : d.client_id !== filterClient) return false;
    }
    // Date range
    if (fromDate || toDate) {
      const t = new Date(d.created_at).getTime();
      if (fromDate && t < new Date(fromDate).getTime()) return false;
      if (toDate) {
        const to = new Date(toDate); to.setHours(23,59,59,999);
        if (t > to.getTime()) return false;
      }
    }
    if (!q) return true;
    const s = q.toLowerCase();
    return d.name.toLowerCase().includes(s)
      || (d.cases?.title ?? "").toLowerCase().includes(s)
      || (d.clients?.name ?? "").toLowerCase().includes(s);
  }), [docs, q, typeFilter, filterCase, filterClient, fromDate, toDate]);

  const analytics = useMemo(() => {
    const total = docs.length;
    const templates = docs.filter((d) => d.is_template).length;
    const caseDocs = docs.filter((d) => d.case_id).length;
    // Client-related = anything linked to a client directly, OR to a case that belongs to a client.
    const caseIdToClient = new Map(cases.map((c) => [c.id, c.client_id]));
    const clientDocs = docs.filter((d) => d.client_id || (d.case_id && caseIdToClient.get(d.case_id))).length;
    const totalSize = docs.reduce((a, d) => a + (d.size ?? 0), 0);
    return { total, templates, caseDocs, clientDocs, totalSize };
  }, [docs, cases]);

  const hasFilters = q || typeFilter !== "all" || filterCase !== "all" || filterClient !== "all" || fromDate || toDate;
  function clearFilters() {
    setQ(""); setTypeFilter("all"); setFilterCase("all"); setFilterClient("all"); setFromDate(""); setToDate("");
  }

  const accept = ".pdf,.doc,.docx,.csv,.jpg,.jpeg";

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "المستندات" : "Documents"}
        subtitle={locale === "ar" ? "PDF · DOC · DOCX · CSV · JPG — الحد الأقصى 200 ميغابايت لكل ملف." : "PDF · DOC · DOCX · CSV · JPG — 200 MB max per file."}
      />

      {/* Analytics — surfaced first so the picture of the library is above the fold */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { l: locale === "ar" ? "الإجمالي" : "Total", v: analytics.total, icon: FileStack },
          { l: locale === "ar" ? "قوالب" : "Templates", v: analytics.templates, icon: BookMarked },
          { l: locale === "ar" ? "مرتبطة بقضايا" : "Case-related", v: analytics.caseDocs, icon: Briefcase },
          { l: locale === "ar" ? "مرتبطة بموكلين" : "Client-related", v: analytics.clientDocs, icon: Users },
          { l: locale === "ar" ? "الحجم الكلي" : "Total size", v: formatBytes(analytics.totalSize) },
        ].map((t, i) => (
          <div key={i} className="card-elev rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.icon && <t.icon className="size-3.5" />}{t.l}
            </div>
            <div className="mt-1 font-serif text-2xl tabular-nums">{t.v}</div>
          </div>
        ))}
      </div>

      <div className="card-elev rounded-xl border bg-card p-5 space-y-3">
        <div className="text-sm font-semibold">{locale === "ar" ? "رفع مستند جديد" : "Upload a new document"}</div>
        <p className="text-xs text-muted-foreground">
          {locale === "ar"
            ? "الأنواع المسموح بها فقط: PDF, Word (DOC/DOCX), CSV, JPG."
            : "Only these types are allowed: PDF, Word (DOC/DOCX), CSV, JPG."}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={clientId} onValueChange={onClientChange}>
            <SelectTrigger><SelectValue placeholder={locale === "ar" ? "ربط بموكل" : "Link to client"} /></SelectTrigger>
            <SelectContent><SelectItem value="none">{locale === "ar" ? "بدون موكل" : "No client"}</SelectItem>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={caseId} onValueChange={onCaseChange}>
            <SelectTrigger><SelectValue placeholder={locale === "ar" ? "ربط بقضية" : "Link to case"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{locale === "ar" ? "بدون قضية" : "No case"}</SelectItem>
              {casesForClient.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-2.5 text-sm text-muted-foreground hover:bg-secondary/40">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            <span>{locale === "ar" ? "اختر ملفاً" : "Choose file"}</span>
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
            />
          </label>
        </div>
      </div>


      <div className="card-elev rounded-xl border bg-card">
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-wrap gap-1.5">
            {(["all","template","case","client"] as const).map((t) => (
              <Button key={t} size="sm" variant={typeFilter === t ? "default" : "ghost"} onClick={() => setTypeFilter(t)}>
                {t === "all" ? (locale === "ar" ? "الكل" : "All")
                  : t === "template" ? (locale === "ar" ? "القوالب" : "Templates")
                  : t === "case" ? (locale === "ar" ? "قضايا" : "Case-related")
                  : (locale === "ar" ? "موكلين" : "Client-related")}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={locale === "ar" ? "ابحث…" : "Search documents…"} className="h-9 ps-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "الموكل" : "Client"}</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{locale === "ar" ? "كل الموكلين" : "All clients"}</SelectItem>
                  <SelectItem value="none">{locale === "ar" ? "بدون موكل" : "No client"}</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "القضية" : "Case"}</Label>
              <Select value={filterCase} onValueChange={setFilterCase}>
                <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{locale === "ar" ? "كل القضايا" : "All cases"}</SelectItem>
                  <SelectItem value="none">{locale === "ar" ? "بدون قضية" : "No case"}</SelectItem>
                  {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "من" : "From"}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "إلى" : "To"}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-[150px]" />
            </div>
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1.5">
                <X className="size-3.5" />{locale === "ar" ? "مسح" : "Clear"}
              </Button>
            )}
          </div>
        </div>


        {loading ? <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm">{hasFilters ? (locale === "ar" ? "لا توجد نتائج مطابقة." : "No matching documents.") : (locale === "ar" ? "لا توجد مستندات بعد." : "No documents uploaded yet.")}</div>
        : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 p-4">
          {filtered.map((d) => (
            <div key={d.id} className="card-elev rounded-xl border bg-card p-4 flex gap-3 relative">
              {d.is_template && (
                <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">
                  <BookMarked className="size-3" />
                  {locale === "ar" ? "قالب" : "Template"}
                </span>
              )}
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold"><FileText className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium pe-16">{d.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {d.cases?.title ? `${d.cases.title} · ` : ""}{d.clients?.name ? `${d.clients.name} · ` : ""}{formatBytes(d.size)}
                </div>
                <div className="text-[11px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</div>
              </div>
              <div className={`flex flex-col gap-1 ${d.is_template ? "mt-7" : ""}`}>
                <Button variant="ghost" size="icon" onClick={() => openPreview(d)} title={locale === "ar" ? "عرض" : "Preview"} disabled={previewLoading}><Eye className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => download(d.id)} title={locale === "ar" ? "تنزيل" : "Download"}><Download className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setPendingDelete(d)} title={locale === "ar" ? "حذف" : "Delete"}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locale === "ar" ? "حذف المستند؟" : "Delete document?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {locale === "ar"
                ? `سيتم حذف "${pendingDelete?.name ?? ""}" نهائياً. لا يمكن التراجع عن هذا الإجراء.`
                : `"${pendingDelete?.name ?? ""}" will be permanently deleted. This cannot be undone.`}
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

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pe-6">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && <DocumentPreviewBody url={preview.url} name={preview.name} mime={preview.mime} locale={locale} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// DocumentPreviewBody moved to src/components/documents/preview-body.tsx

function formatBytes(n: number | null) {
  if (!n) return "—";
  const u = ["B","KB","MB","GB"]; let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

void MAX_DOC_BYTES;
void ALLOWED_DOC_EXT;
