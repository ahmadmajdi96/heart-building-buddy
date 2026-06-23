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
import { useOrg } from "@/lib/org-context";
import { exportDraftPdf, exportDraftDocx } from "@/lib/draft-export";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Sparkles, FileText, Wand2, RefreshCw, Loader2, Plus, X, Save, Trash2,
  Bold, Italic, List, ListOrdered, Heading2, FileDown, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

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

  const [prompt, setPrompt] = useState("");
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([{ key: "ClientName", value: "" }, { key: "Date", value: "" }]);
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [selectedTpls, setSelectedTpls] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [drafts, setDrafts] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

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

  async function generate() {
    if (!prompt.trim() && selectedTpls.length === 0) {
      toast.error(locale === "ar" ? "اكتب وصفاً أو اختر قالباً." : "Describe the document or pick a template.");
      return;
    }
    setGenerating(true);
    try {
      const varsMap: Record<string, string> = {};
      variables.forEach((v) => { if (v.key.trim()) varsMap[v.key.trim()] = v.value; });
      const res = await gen({ data: {
        prompt, locale, variables: varsMap, templateIds: selectedTpls,
      }});
      // Convert markdown-ish AI output to simple HTML by paragraph splitting
      const html = mdToHtml(res.draft);
      editor?.commands.setContent(html);
      if (!title) setTitle((prompt || (locale === "ar" ? "مسودة" : "Draft")).slice(0, 80));
    } catch (e) { toast.error((e as Error).message); }
    finally { setGenerating(false); }
  }

  async function saveIt() {
    const html = editor?.getHTML() ?? "";
    if (!title || !hasContent) { toast.error(locale === "ar" ? "العنوان والمحتوى مطلوبان" : "Title and content required"); return; }
    try {
      const varsMap: Record<string, string> = {};
      variables.forEach((v) => { if (v.key.trim()) varsMap[v.key.trim()] = v.value; });
      await save({ data: { title, variables: varsMap, content: html } });
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
    try { await del({ data: { id } }); refresh(); } catch (e) { toast.error((e as Error).message); }
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
              <li key={d.id} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                <span className="min-w-0 flex-1 truncate">{d.title}</span>
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
