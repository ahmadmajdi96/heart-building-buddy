import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { draftDocument } from "@/lib/ai-tasks.functions";
import { Sparkles, FileText, Wand2, RefreshCw, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/drafting")({ component: DraftingPage });

const templates = [
  { id: "t1", titleAr: "عقد عمل محدد المدة", titleEn: "Fixed-term employment contract", descAr: "متوافق مع نظام العمل السعودي", descEn: "Compliant with Saudi Labor Law" },
  { id: "t2", titleAr: "اتفاقية عدم إفصاح (NDA)", titleEn: "Non-Disclosure Agreement (NDA)", descAr: "ثنائية اللغة — قابلة للتفاوض", descEn: "Bilingual — negotiable" },
  { id: "t3", titleAr: "اتفاقية امتياز تجاري", titleEn: "Franchise agreement", descAr: "متوافق مع لوائح GCC", descEn: "GCC-compliant" },
  { id: "t4", titleAr: "مذكرة دفاع في قضية تجارية", titleEn: "Defense memorandum (commercial)", descAr: "نموذج المحاكم التجارية", descEn: "Commercial court template" },
  { id: "t5", titleAr: "وكالة قانونية خاصة", titleEn: "Special power of attorney", descAr: "للتمثيل أمام المحاكم", descEn: "For court representation" },
  { id: "t6", titleAr: "عقد توريد بضائع", titleEn: "Goods supply contract", descAr: "بنود التسليم والضمان", descEn: "Delivery & warranty terms" },
];

function DraftingPage() {
  const { locale } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const drafter = useServerFn(draftDocument);

  async function generate(templateTitle?: string) {
    const userPrompt = prompt.trim() || (templateTitle ? `Draft a ${templateTitle}` : "");
    if (!userPrompt) {
      toast.error(locale === "ar" ? "اكتب وصفاً أولاً" : "Describe what you need first");
      return;
    }
    setLoading(true);
    try {
      const res = await drafter({ data: { prompt: userPrompt, locale, template: templateTitle } });
      setDraft(res.draft);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate draft");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "الصياغة الذكية" : "AI Drafting"}
        subtitle={locale === "ar" ? "اختر قالباً أو صف ما تحتاج، وسيتولى المساعد الذكي صياغته." : "Pick a template or describe what you need — the AI will draft it."}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {locale === "ar" ? "القوالب الجاهزة" : "Templates"}
          </div>
          {templates.map((t) => {
            const title = locale === "ar" ? t.titleAr : t.titleEn;
            return (
              <button
                key={t.id}
                onClick={() => { setActiveTemplate(t.id); generate(title); }}
                className={`group w-full rounded-xl border bg-card p-4 text-start transition card-elev hover:border-gold/40 ${activeTemplate === t.id ? "border-gold/60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold"><FileText className="size-4" /></div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{locale === "ar" ? t.descAr : t.descEn}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        <div className="space-y-4">
          <div className="card-elev rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-gold" /> {locale === "ar" ? "صف المستند" : "Describe the document"}
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={locale === "ar" ? "مثال: اتفاقية عدم إفصاح بين شركة سعودية وشركة إماراتية، مدة 3 سنوات، باللغة العربية…" : "e.g. NDA between a Saudi and a UAE company, 3-year term, in Arabic…"}
              className="resize-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => generate()} variant="gold" className="gap-1.5" disabled={loading}>
                {loading ? <RefreshCw className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                {locale === "ar" ? "اصِغ المستند" : "Generate draft"}
              </Button>
              <Button variant="outline" disabled={!draft || loading} onClick={() => { setPrompt((locale === "ar" ? "حسّن المسودة التالية مع الحفاظ على معناها:\n\n" : "Improve the following draft while preserving meaning:\n\n") + draft); }}>
                {locale === "ar" ? "تحسين النص" : "Improve"}
              </Button>
              <Button variant="outline" disabled={!draft || loading} onClick={() => setPrompt((locale === "ar" ? "ترجم المسودة التالية إلى الإنجليزية:\n\n" : "Translate the following draft to Arabic:\n\n") + draft)}>
                {locale === "ar" ? "ترجم إلى الإنجليزية" : "Translate"}
              </Button>
            </div>
          </div>

          <div className="card-elev min-h-[400px] rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <div className="text-sm font-semibold">{locale === "ar" ? "المسودة" : "Draft"}</div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" className="gap-1" disabled={!draft} onClick={() => downloadText(draft, "draft.txt")}><Download className="size-3.5" />TXT</Button>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="grid place-items-center py-20 text-sm text-muted-foreground">
                  <Loader2 className="mb-3 size-6 animate-spin text-gold" />
                  {locale === "ar" ? "جاري الصياغة…" : "Drafting…"}
                </div>
              ) : draft ? (
                <pre className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-foreground/90">{draft}</pre>
              ) : (
                <div className="grid place-items-center py-20 text-center text-sm text-muted-foreground">
                  <Sparkles className="mb-3 size-8 text-gold/50" />
                  {locale === "ar" ? "اختر قالباً أو صف مستندك أعلاه لبدء الصياغة." : "Pick a template or describe your document above to start drafting."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
