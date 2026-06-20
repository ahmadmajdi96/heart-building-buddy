import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, FileText, Wand2, RefreshCw, Download } from "lucide-react";

export const Route = createFileRoute("/app/drafting")({ component: DraftingPage });

const templatesAr = [
  { id: "t1", title: "عقد عمل محدد المدة", desc: "متوافق مع نظام العمل السعودي" },
  { id: "t2", title: "اتفاقية عدم إفصاح (NDA)", desc: "ثنائية اللغة — قابلة للتفاوض" },
  { id: "t3", title: "اتفاقية امتياز تجاري", desc: "متوافق مع لوائح GCC" },
  { id: "t4", title: "مذكرة دفاع في قضية تجارية", desc: "نموذج المحاكم التجارية" },
  { id: "t5", title: "وكالة قانونية خاصة", desc: "للتمثيل أمام المحاكم" },
  { id: "t6", title: "عقد توريد بضائع", desc: "بنود التسليم والضمان" },
];

const sampleAr = `بسم الله الرحمن الرحيم

اتفاقية عدم إفصاح (NDA)
المبرمة في يوم [التاريخ] الموافق هـ في [المدينة].

بين:
الطرف الأول: [الاسم القانوني للشركة]، شركة مسجلة بموجب أنظمة المملكة العربية السعودية، يمثلها [الاسم] بصفته [المنصب].
الطرف الثاني: [الاسم القانوني للجهة الثانية]، ويمثلها [الاسم] بصفته [المنصب].

تمهيد:
حيث إن الطرفين يرغبان في تبادل معلومات سرية لغرض [وصف الغرض]، ورغبة منهما في حماية تلك المعلومات، فقد اتفقا على ما يلي:

البند الأول — تعريف المعلومات السرية
تشمل المعلومات السرية كل المعلومات التجارية والفنية والمالية والتشغيلية التي يفصح عنها أحد الطرفين للآخر، سواء كانت مكتوبة أو شفوية أو إلكترونية…

البند الثاني — الالتزامات
يلتزم الطرف المتلقي بعدم الإفصاح عن المعلومات السرية لأي طرف ثالث دون موافقة كتابية مسبقة من الطرف المُفصح، وباتخاذ التدابير المعقولة لحمايتها…

البند الثالث — مدة الاتفاقية
تسري هذه الاتفاقية لمدة [٣] سنوات من تاريخ توقيعها، وتستمر التزامات السرية لمدة [٥] سنوات بعد انتهائها.

البند الرابع — القانون الواجب التطبيق
تخضع هذه الاتفاقية لأنظمة المملكة العربية السعودية، وتختص المحاكم المختصة في الرياض بالفصل في أي نزاع.`;

function DraftingPage() {
  const { locale } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  function generate() {
    setLoading(true);
    setTimeout(() => {
      setDraft(sampleAr);
      setLoading(false);
    }, 700);
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
          {templatesAr.map((t) => (
            <button key={t.id} className="group w-full rounded-xl border bg-card p-4 text-start transition card-elev hover:border-gold/40">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold"><FileText className="size-4" /></div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{t.desc}</div>
                </div>
              </div>
            </button>
          ))}
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
              <Button onClick={generate} variant="gold" className="gap-1.5" disabled={loading}>
                {loading ? <RefreshCw className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                {locale === "ar" ? "اصِغ المستند" : "Generate draft"}
              </Button>
              <Button variant="outline">{locale === "ar" ? "تحسين النص" : "Improve"}</Button>
              <Button variant="outline">{locale === "ar" ? "ترجم إلى الإنجليزية" : "Translate"}</Button>
            </div>
          </div>

          <div className="card-elev min-h-[400px] rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <div className="text-sm font-semibold">{locale === "ar" ? "المسودة" : "Draft"}</div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" className="gap-1"><Download className="size-3.5" />DOCX</Button>
                <Button variant="ghost" size="sm" className="gap-1"><Download className="size-3.5" />PDF</Button>
              </div>
            </div>
            <div className="p-6">
              {draft ? (
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
