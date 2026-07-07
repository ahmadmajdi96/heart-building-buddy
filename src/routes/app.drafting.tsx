import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { generateDraft, saveDraft, listDrafts, deleteDraft, getDraft } from "@/lib/drafting.functions";
import { listTemplateDocuments } from "@/lib/documents.functions";
import { getRagJob, queryRag, deleteRagDoc } from "@/lib/rag.functions";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/org-context";
import { exportDraftPdf, exportDraftDocx } from "@/lib/draft-export";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Sparkles, FileText, Wand2, RefreshCw, Loader2, Plus, X, Save, Trash2,
  Bold, Italic, List, ListOrdered, Heading2, FileDown, FolderOpen, Upload, CheckCircle2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type RagDoc = {
  documentId: string;
  jobId: string;
  filename: string;
  status: "queued" | "running" | "succeeded" | "failed";
  error?: string;
};

export const Route = createFileRoute("/app/drafting")({ component: DraftingPage });

type TemplateDoc = { id: string; name: string; mime_type: string | null; extracted_text: string | null };

function DraftingPage() {
  const { locale } = useI18n();
  const { org } = useOrg();
  const gen = useServerFn(generateDraft);
  const save = useServerFn(saveDraft);
  const list = useServerFn(listDrafts);
  const del = useServerFn(deleteDraft);
  const getOne = useServerFn(getDraft);
  const listTpl = useServerFn(listTemplateDocuments);

  const getJob = useServerFn(getRagJob);
  const askRag = useServerFn(queryRag);
  const delRag = useServerFn(deleteRagDoc);

  const [prompt, setPrompt] = useState("");
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([{ key: "ClientName", value: "" }, { key: "Date", value: "" }]);
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [selectedTpls, setSelectedTpls] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [drafts, setDrafts] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Private RAG uploads (per-user tenant)
  const [ragDocs, setRagDocs] = useState<RagDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ragSources, setRagSources] = useState<Array<{ filename: string; page?: number; excerpt?: string }>>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: locale === "ar"
          ? "ستظهر المسودة هنا — يمكنك تعديلها قبل التصدير."
          : "Your draft will appear here — edit before exporting.",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[400px] [&_p]:my-2",
        dir: locale === "ar" ? "rtl" : "ltr",
      },
    },
  });

  const hasContent = !!editor && editor.getText().trim().length > 0;

  async function refresh() {
    try {
      const [ds, tps] = await Promise.all([list(), listTpl()]);
      setDrafts(ds as any);
      setTemplates(tps as TemplateDoc[]);
    } catch (e) { toast.error((e as Error).message); }
  }
  useEffect(() => { refresh(); }, []);

  function setVar(i: number, k: "key" | "value", v: string) {
    setVariables(variables.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  }
  const addVar = () => setVariables([...variables, { key: "", value: "" }]);
  const removeVar = (i: number) => setVariables(variables.filter((_, idx) => idx !== i));

  function toggleTpl(id: string) {
    setSelectedTpls((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        toast.error(locale === "ar" ? "حد أقصى 3 قوالب." : "Up to 3 templates.");
        return prev;
      }
      return [...prev, id];
    });
  }

  const readyRagDocs = ragDocs.filter((d) => d.status === "succeeded");

  async function generate() {
    if (!prompt.trim() && selectedTpls.length === 0 && readyRagDocs.length === 0) {
      toast.error(locale === "ar" ? "اكتب وصفاً أو اختر قالباً أو ارفع ملفاً." : "Describe the document, pick a template, or upload a file.");
      return;
    }
    setGenerating(true);
    setRagSources([]);
    try {
      const varsMap: Record<string, string> = {};
      variables.forEach((v) => { if (v.key.trim()) varsMap[v.key.trim()] = v.value; });

      // Route to the private RAG service when the user has uploaded (and indexed) their own files.
      if (readyRagDocs.length > 0) {
        const varsLine = Object.entries(varsMap).filter(([, v]) => v.trim())
          .map(([k, v]) => `${k}: ${v}`).join("; ");
        const langLine = locale === "ar"
          ? "أجب باللغة العربية بصيغة مسودة قانونية جاهزة للاستخدام مع بنود مرقمة."
          : "Answer in English as a polished, ready-to-use legal draft with numbered clauses.";
        const question = [
          langLine,
          prompt.trim() || (locale === "ar" ? "اصِغ المستند بالاعتماد على الملفات المرفوعة." : "Draft the document based on the uploaded files."),
          varsLine ? `${locale === "ar" ? "المتغيرات" : "Variables"}: ${varsLine}` : "",
        ].filter(Boolean).join("\n\n");

        const res = await askRag({ data: { question, top_k: 18, rerank_top_n: 6, temperature: 0.1, max_tokens: 1500 } });
        editor?.commands.setContent(mdToHtml(res.answer || ""));
        setRagSources((res.sources ?? []).map((s) => ({ filename: s.filename, page: s.page, excerpt: s.excerpt })));
        if (!title) setTitle((prompt || readyRagDocs[0].filename || (locale === "ar" ? "مسودة" : "Draft")).slice(0, 80));
      } else {
        const res = await gen({ data: { prompt, locale, variables: varsMap, templateIds: selectedTpls } });
        const html = mdToHtml(res.draft);
        editor?.commands.setContent(html);
        if (!title) setTitle((prompt || (locale === "ar" ? "مسودة" : "Draft")).slice(0, 80));
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); }
  }

  async function uploadRagFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(locale === "ar" ? "يرجى تسجيل الدخول" : "Please sign in");
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f, f.name);
      const res = await fetch("/api/rag/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Upload failed (${res.status})`);
      // body shape: { documents: [{id,filename,...}], jobs: [{id, document_id, status}] }
      const docs: any[] = body.documents ?? [];
      const jobs: any[] = body.jobs ?? [];
      const added: RagDoc[] = docs.map((d) => {
        const job = jobs.find((j) => j.document_id === d.id) ?? jobs[0];
        return {
          documentId: d.id,
          jobId: job?.id ?? "",
          filename: d.filename ?? d.name ?? "file",
          status: (job?.status as RagDoc["status"]) ?? "queued",
        };
      });
      setRagDocs((prev) => [...added, ...prev]);
      toast.success(locale === "ar" ? "بدأت الفهرسة" : "Indexing started");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  // Poll pending jobs until they succeed or fail.
  useEffect(() => {
    const pending = ragDocs.filter((d) => d.jobId && (d.status === "queued" || d.status === "running"));
    if (pending.length === 0) return;
    let cancelled = false;
    const t = setInterval(async () => {
      for (const d of pending) {
        try {
          const j: any = await getJob({ data: { jobId: d.jobId } });
          if (cancelled) return;
          const status: RagDoc["status"] = j.status ?? d.status;
          setRagDocs((prev) => prev.map((x) => x.jobId === d.jobId ? { ...x, status, error: j.error } : x));
          if (status === "succeeded") toast.success(`${d.filename}: ${locale === "ar" ? "جاهز للسؤال" : "ready"}`);
          if (status === "failed") toast.error(`${d.filename}: ${j.error || "failed"}`);
        } catch { /* ignore transient */ }
      }
    }, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [ragDocs, getJob, locale]);

  async function removeRagDoc(documentId: string) {
    try {
      await delRag({ data: { documentId } });
      setRagDocs((prev) => prev.filter((x) => x.documentId !== documentId));
    } catch (e) { toast.error((e as Error).message); }
  }


  async function saveIt() {
    const html = editor?.getHTML() ?? "";
    if (!title || !hasContent) { toast.error(locale === "ar" ? "العنوان والمحتوى مطلوبان" : "Title and content required"); return; }
    try {
      const varsMap: Record<string, string> = {};
      variables.forEach((v) => { if (v.key.trim()) varsMap[v.key.trim()] = v.value; });
      const saved: any = await save({ data: { id: currentId ?? undefined, title, variables: varsMap, content: html } });
      if (saved?.id) setCurrentId(saved.id);
      toast.success(locale === "ar" ? "تم الحفظ" : "Draft saved");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function exportAs(kind: "pdf" | "docx") {
    if (!editor || !hasContent) { toast.error(locale === "ar" ? "لا يوجد محتوى للتصدير." : "Nothing to export yet."); return; }
    setExporting(true);
    try {
      const html = editor.getHTML();
      if (kind === "pdf") await exportDraftPdf({ org, title: title || "draft", html });
      else await exportDraftDocx({ org, title: title || "draft", html });
      toast.success(locale === "ar" ? "تم التصدير" : "Exported");
    } catch (e) { toast.error((e as Error).message); }
    finally { setExporting(false); }
  }

  async function removeDraft(id: string) {
    if (!confirm(locale === "ar" ? "حذف المسودة؟" : "Delete draft?")) return;
    try {
      await del({ data: { id } });
      if (currentId === id) { setCurrentId(null); editor?.commands.setContent(""); setTitle(""); }
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function openDraft(id: string) {
    try {
      const row: any = await getOne({ data: { id } });
      editor?.commands.setContent(row.content || "");
      setTitle(row.title || "");
      setCurrentId(row.id);
      const v = row.variables || {};
      const entries = Object.entries(v).map(([key, value]) => ({ key, value: String(value) }));
      if (entries.length) setVariables(entries);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { toast.error((e as Error).message); }
  }

  const groupedTpls = useMemo(() => templates, [templates]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "الصياغة الذكية" : "AI Drafting"}
        subtitle={locale === "ar"
          ? "اختر حتى 3 قوالب من مكتبتك، حدّد المتغيرات، ثم حرّر المسودة وصدّرها."
          : "Pick up to 3 templates from your library, set variables, then edit and export."}
      />

      <div className="card-elev rounded-xl border bg-card p-5 space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">{locale === "ar" ? "قوالب المرجعية" : "Reference templates"}</div>
            <span className="text-xs text-muted-foreground">
              {selectedTpls.length}/3 {locale === "ar" ? "محدد" : "selected"}
            </span>
          </div>
          {groupedTpls.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {locale === "ar"
                ? "لا توجد قوالب بعد. ارفع مستنداً في صفحة المستندات بدون قضية أو موكل لاستخدامه كقالب."
                : "No templates yet. Upload a document in Documents without a case or client to use it as a template."}
            </p>
          ) : (
            <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3 max-h-48 overflow-y-auto">
              {groupedTpls.map((t) => {
                const checked = selectedTpls.includes(t.id);
                const textual = isTextual(t);
                return (
                  <label
                    key={t.id}
                    className={`flex items-start gap-2 rounded border px-2.5 py-2 text-xs cursor-pointer transition ${checked ? "border-gold bg-gold/5" : "hover:bg-secondary/40"}`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleTpl(t.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {textual
                          ? (locale === "ar" ? "نص حرفي" : "Verbatim text")
                          : (locale === "ar" ? "مرجعي" : "Reference only")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-gold" />
            {locale === "ar" ? "تعليمات إضافية" : "Additional instructions"}
          </div>
          <Textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={locale === "ar"
              ? "مثال: استخدم القالب أعلاه وأنشئ النسخة النهائية باستخدام المتغيرات."
              : "e.g. Use the templates above and fill in variables for the final version."}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">{locale === "ar" ? "المتغيرات" : "Variables"}</div>
            <Button size="sm" variant="ghost" onClick={addVar}><Plus className="size-3.5" />{locale === "ar" ? "إضافة" : "Add"}</Button>
          </div>
          <div className="space-y-1.5">
            {variables.map((v, i) => (
              <div key={i} className="grid grid-cols-[160px_1fr_auto] gap-2 items-center">
                <Input placeholder="Key" value={v.key} onChange={(e) => setVar(i, "key", e.target.value)} className="h-9 font-mono text-xs" />
                <Input placeholder="Value" value={v.value} onChange={(e) => setVar(i, "value", e.target.value)} className="h-9" />
                <Button variant="ghost" size="icon" onClick={() => removeVar(i)}><X className="size-3.5" /></Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={generate} variant="gold" disabled={generating}>
            {generating ? <RefreshCw className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {locale === "ar" ? "اصِغ المستند" : "Generate"}
          </Button>
          <Input
            placeholder={locale === "ar" ? "عنوان المسودة" : "Draft title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 max-w-sm"
          />
        </div>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex flex-wrap items-center gap-1">
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}><Bold className="size-4" /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}><Italic className="size-4" /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })}><Heading2 className="size-4" /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}><List className="size-4" /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")}><ListOrdered className="size-4" /></ToolbarBtn>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={saveIt} disabled={!hasContent}>
              <Save className="size-4" />{locale === "ar" ? "حفظ" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportAs("pdf")} disabled={!hasContent || exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />} PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportAs("docx")} disabled={!hasContent || exporting}>
              <FileDown className="size-4" /> DOCX
            </Button>
          </div>
        </div>
        <div className="p-6">
          {generating ? (
            <div className="grid place-items-center py-20 text-sm text-muted-foreground">
              <Loader2 className="mb-3 size-6 animate-spin text-gold" />
              {locale === "ar" ? "جاري الصياغة…" : "Drafting…"}
            </div>
          ) : !editor || (!hasContent && !generating) ? (
            <div className="grid place-items-center py-20 text-center text-sm text-muted-foreground">
              <FileText className="mb-3 size-8 text-gold/50" />
              {locale === "ar" ? "اختر قالباً ثم اضغط « اصِغ »." : "Pick a template and press Generate."}
            </div>
          ) : null}
          <EditorContent editor={editor} />
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="card-elev rounded-xl border bg-card p-5">
          <div className="mb-3 text-sm font-semibold">{locale === "ar" ? "مسودات محفوظة" : "Saved drafts"}</div>
          <ul className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((d) => (
              <li key={d.id} className={`group flex items-center gap-1 rounded border px-3 py-2 text-xs transition hover:border-gold/50 hover:bg-gold/5 ${currentId === d.id ? "border-gold bg-gold/5" : ""}`}>
                <button
                  onClick={() => openDraft(d.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-start"
                  title={locale === "ar" ? "فتح" : "Open"}
                >
                  <FolderOpen className="size-3.5 shrink-0 text-gold/70" />
                  <span className="min-w-0 flex-1 truncate">{d.title}</span>
                </button>
                <Button variant="ghost" size="icon" onClick={() => removeDraft(d.id)}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid size-8 place-items-center rounded transition ${active ? "bg-gold/15 text-gold" : "hover:bg-secondary/60"}`}
    >
      {children}
    </button>
  );
}

function isTextual(d: TemplateDoc) {
  const m = (d.mime_type || "").toLowerCase();
  const n = d.name.toLowerCase();
  return m === "application/pdf" || n.endsWith(".pdf") || m.includes("wordprocessingml") || n.endsWith(".doc") || n.endsWith(".docx");
}

// Lightweight Markdown → HTML for AI output. Handles headings, bold, lists, paragraphs.
function mdToHtml(md: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); out.push(""); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(escape(h[2]))}</h${h[1].length}>`); continue; }
    const ol = line.match(/^\d+\.\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ol) { if (listType !== "ol") { closeList(); listType = "ol"; out.push("<ol>"); } out.push(`<li>${inline(escape(ol[1]))}</li>`); continue; }
    if (ul) { if (listType !== "ul") { closeList(); listType = "ul"; out.push("<ul>"); } out.push(`<li>${inline(escape(ul[1]))}</li>`); continue; }
    closeList();
    out.push(`<p>${inline(escape(line))}</p>`);
  }
  closeList();
  return out.join("\n");
}
function inline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}
