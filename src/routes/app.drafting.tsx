import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { generateDraft, saveDraft, listDrafts, deleteDraft } from "@/lib/drafting.functions";
import { listDocuments } from "@/lib/documents.functions";
import { MarkdownView } from "@/lib/markdown";
import { Sparkles, FileText, Wand2, RefreshCw, Download, Loader2, Plus, X, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/drafting")({ component: DraftingPage });

const TEMPLATES = [
  { id: "t1", titleAr: "عقد عمل محدد المدة", titleEn: "Fixed-term employment contract" },
  { id: "t2", titleAr: "اتفاقية عدم إفصاح (NDA)", titleEn: "Non-Disclosure Agreement (NDA)" },
  { id: "t3", titleAr: "اتفاقية امتياز تجاري", titleEn: "Franchise agreement" },
  { id: "t4", titleAr: "مذكرة دفاع تجارية", titleEn: "Defense memorandum (commercial)" },
  { id: "t5", titleAr: "وكالة قانونية خاصة", titleEn: "Special power of attorney" },
  { id: "t6", titleAr: "عقد توريد", titleEn: "Goods supply contract" },
];

function DraftingPage() {
  const { locale } = useI18n();
  const gen = useServerFn(generateDraft);
  const save = useServerFn(saveDraft);
  const list = useServerFn(listDrafts);
  const del = useServerFn(deleteDraft);
  const listDocs = useServerFn(listDocuments);

  const [prompt, setPrompt] = useState("");
  const [template, setTemplate] = useState<string | null>(null);
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([{ key: "ClientName", value: "" }, { key: "Date", value: "" }]);
  const [docs, setDocs] = useState<{ id: string; name: string }[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [drafts, setDrafts] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      const [ds, all] = await Promise.all([list(), listDocs()]);
      setDrafts(ds as any);
      setDocs((all as any[]).map((d) => ({ id: d.id, name: d.name })));
    } catch (e) { toast.error((e as Error).message); }
  }
  useEffect(() => { refresh(); }, []);

  function setVar(i: number, k: "key" | "value", v: string) {
    setVariables(variables.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  }
  function addVar() { setVariables([...variables, { key: "", value: "" }]); }
  function removeVar(i: number) { setVariables(variables.filter((_, idx) => idx !== i)); }

  function toggleDoc(id: string) {
    const next = new Set(selectedDocs);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedDocs(next);
  }

  async function generate() {
    const tpl = template ? TEMPLATES.find((t) => t.id === template) : null;
    const tplTitle = tpl ? (locale === "ar" ? tpl.titleAr : tpl.titleEn) : undefined;
    const userPrompt = prompt.trim() || (tplTitle ? `Draft a ${tplTitle}` : "");
    if (!userPrompt) { toast.error(locale === "ar" ? "اكتب وصفاً أو اختر قالباً" : "Describe what you need or pick a template"); return; }
    setLoading(true);
    try {
      const varsMap: Record<string, string> = {};
      variables.forEach((v) => { if (v.key.trim()) varsMap[v.key.trim()] = v.value; });
      const res = await gen({ data: {
        prompt: userPrompt, template: tplTitle, locale,
        variables: varsMap, documentIds: Array.from(selectedDocs),
      }});
      setDraft(res.draft);
      if (!title) setTitle(tplTitle ?? userPrompt.slice(0, 60));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  async function saveIt() {
    if (!draft || !title) { toast.error(locale === "ar" ? "العنوان والمحتوى مطلوبان" : "Title and content required"); return; }
    try {
      const varsMap: Record<string, string> = {};
      variables.forEach((v) => { if (v.key.trim()) varsMap[v.key.trim()] = v.value; });
      await save({ data: { title, template: template ?? undefined, variables: varsMap, content: draft } });
      toast.success(locale === "ar" ? "تم الحفظ" : "Draft saved");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function removeDraft(id: string) {
    if (!confirm(locale === "ar" ? "حذف المسودة؟" : "Delete draft?")) return;
    try { await del({ data: { id } }); refresh(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "الصياغة الذكية" : "AI Drafting"}
        subtitle={locale === "ar" ? "صياغة موجّهة بالمتغيرات والمستندات المرجعية." : "Variable-driven drafting with optional reference documents."}
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{locale === "ar" ? "القوالب" : "Templates"}</div>
            <div className="grid gap-1.5">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setTemplate(template === t.id ? null : t.id)}
                  className={`w-full rounded-md border px-3 py-2 text-start text-sm transition ${template === t.id ? "border-gold bg-gold/5" : "hover:bg-secondary/40"}`}>
                  {locale === "ar" ? t.titleAr : t.titleEn}
                </button>
              ))}
            </div>
          </div>

          {drafts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{locale === "ar" ? "مسودات محفوظة" : "Saved drafts"}</div>
              <ul className="space-y-1">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded border px-2.5 py-1.5 text-xs">
                    <span className="truncate">{d.title}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeDraft(d.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="space-y-4">
          <div className="card-elev rounded-xl border bg-card p-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-gold" />{locale === "ar" ? "صف المستند" : "Describe the document"}</div>
              <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={locale === "ar" ? "مثال: اتفاقية NDA بين {{PartyA}} و{{PartyB}}…" : "e.g. NDA between {{PartyA}} and {{PartyB}}…"} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">{locale === "ar" ? "المتغيرات" : "Variables"}</div>
                <Button size="sm" variant="ghost" onClick={addVar}><Plus className="size-3.5" />{locale === "ar" ? "إضافة" : "Add"}</Button>
              </div>
              <div className="space-y-1.5">
                {variables.map((v, i) => (
                  <div key={i} className="grid grid-cols-[140px_1fr_auto] gap-2">
                    <Input placeholder="Key" value={v.key} onChange={(e) => setVar(i, "key", e.target.value)} className="h-9 font-mono text-xs" />
                    <Input placeholder="Value" value={v.value} onChange={(e) => setVar(i, "value", e.target.value)} className="h-9" />
                    <Button variant="ghost" size="icon" onClick={() => removeVar(i)}><X className="size-3.5" /></Button>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">{locale === "ar" ? "استخدم {{Key}} في الوصف وسيستبدلها الذكاء الاصطناعي." : "Use {{Key}} in your prompt — AI will substitute values."}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">{locale === "ar" ? "مستندات مرجعية (اختياري)" : "Reference documents (optional)"}</div>
              {docs.length === 0 ? <p className="text-xs text-muted-foreground">{locale === "ar" ? "لا توجد مستندات مرفوعة." : "No uploaded documents."}</p> :
              <div className="grid gap-1.5 md:grid-cols-2 max-h-40 overflow-y-auto">
                {docs.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs cursor-pointer hover:bg-secondary/40">
                    <Checkbox checked={selectedDocs.has(d.id)} onCheckedChange={() => toggleDoc(d.id)} />
                    <span className="truncate">{d.name}</span>
                  </label>
                ))}
              </div>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={generate} variant="gold" disabled={loading}>
                {loading ? <RefreshCw className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                {locale === "ar" ? "اصِغ المستند" : "Generate"}
              </Button>
              <Input placeholder={locale === "ar" ? "عنوان المسودة" : "Draft title"} value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 max-w-sm" />
              <Button variant="outline" disabled={!draft} onClick={saveIt}><Save className="size-4" />{locale === "ar" ? "حفظ" : "Save"}</Button>
              <Button variant="outline" disabled={!draft} onClick={() => downloadText(draft, (title || "draft") + ".md")}><Download className="size-4" />MD</Button>
            </div>
          </div>

          <div className="card-elev min-h-[400px] rounded-xl border bg-card p-6">
            {loading ? (
              <div className="grid place-items-center py-20 text-sm text-muted-foreground">
                <Loader2 className="mb-3 size-6 animate-spin text-gold" />
                {locale === "ar" ? "جاري الصياغة…" : "Drafting…"}
              </div>
            ) : draft ? (
              <MarkdownView text={draft} />
            ) : (
              <div className="grid place-items-center py-20 text-center text-sm text-muted-foreground">
                <FileText className="mb-3 size-8 text-gold/50" />
                {locale === "ar" ? "صف مستندك أعلاه لبدء الصياغة." : "Describe your document above to start drafting."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
