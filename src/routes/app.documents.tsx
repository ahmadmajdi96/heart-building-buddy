import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { FileText, Upload, Download, Trash2, Loader2, Search, BookMarked, Eye } from "lucide-react";
import { toast } from "sonner";

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
  const [cases, setCases] = useState<{ id: string; title: string }[]>([]);
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

  async function refresh() {
    setLoading(true);
    try {
      const [d, c, cl] = await Promise.all([list(), listC(), listCl()]);
      setDocs(d as Doc[]);
      setCases((c as any[]).map((x) => ({ id: x.id, title: x.title })));
      setClients((cl as any[]).map((x) => ({ id: x.id, name: x.name })));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

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
      const clId = clientId === "none" ? null : clientId;
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

  const filtered = docs.filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()));
  const accept = ".pdf,.doc,.docx,.csv,.jpg,.jpeg";

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "المستندات" : "Documents"}
        subtitle={locale === "ar" ? "PDF · DOC · DOCX · CSV · JPG — الحد الأقصى 4 ميغابايت لكل ملف." : "PDF · DOC · DOCX · CSV · JPG — 4 MB max per file."}
      />

      <div className="card-elev rounded-xl border bg-card p-5 space-y-3">
        <div className="text-sm font-semibold">{locale === "ar" ? "رفع مستند جديد" : "Upload a new document"}</div>
        <p className="text-xs text-muted-foreground">
          {locale === "ar"
            ? "الأنواع المسموح بها فقط: PDF, Word (DOC/DOCX), CSV, JPG."
            : "Only these types are allowed: PDF, Word (DOC/DOCX), CSV, JPG."}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={caseId} onValueChange={setCaseId}>
            <SelectTrigger><SelectValue placeholder={locale === "ar" ? "ربط بقضية" : "Link to case"} /></SelectTrigger>
            <SelectContent><SelectItem value="none">{locale === "ar" ? "بدون قضية" : "No case"}</SelectItem>{cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder={locale === "ar" ? "ربط بموكل" : "Link to client"} /></SelectTrigger>
            <SelectContent><SelectItem value="none">{locale === "ar" ? "بدون موكل" : "No client"}</SelectItem>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={locale === "ar" ? "ابحث…" : "Search documents…"} className="h-9 ps-9" />
          </div>
        </div>

        {loading ? <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm">{locale === "ar" ? "لا توجد مستندات بعد." : "No documents uploaded yet."}</div>
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

function DocumentPreviewBody({ url, name, mime, locale }: { url: string; name: string; mime: string | null; locale: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = (mime ?? "").startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isPdf = mime === "application/pdf" || ext === "pdf";
  if (isImage) {
    return (
      <div className="grid place-items-center bg-muted/30 rounded-md overflow-hidden">
        <img src={url} alt={name} className="max-h-[75vh] w-auto" />
      </div>
    );
  }
  if (isPdf) {
    return <iframe src={url} title={name} className="w-full h-[75vh] rounded-md border bg-muted/20" />;
  }
  return (
    <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
      <p>{locale === "ar"
        ? "لا يمكن عرض هذا النوع من الملفات في المتصفح. يمكنك تنزيله لعرضه."
        : "This file type can't be previewed in the browser. Download it to view."}</p>
      <a href={url} download={name} className="inline-flex items-center gap-1.5 text-gold hover:underline">
        <Download className="size-4" />{locale === "ar" ? "تنزيل الملف" : "Download file"}
      </a>
    </div>
  );
}

function formatBytes(n: number | null) {
  if (!n) return "—";
  const u = ["B","KB","MB","GB"]; let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

void MAX_DOC_BYTES;
void ALLOWED_DOC_EXT;
