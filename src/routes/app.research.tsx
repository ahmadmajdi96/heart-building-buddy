import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { researchSources } from "@/lib/mock-data";
import { legalResearch } from "@/lib/ai-tasks.functions";
import { MarkdownView } from "@/lib/markdown";
import { Sparkles, Search, BookOpen, ScrollText, Globe2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/research")({ component: ResearchPage });

function ResearchPage() {
  const { locale } = useI18n();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const research = useServerFn(legalResearch);

  async function run(query: string) {
    if (!query.trim()) return;
    setLoading(true); setAnswer("");
    try { const res = await research({ data: { query, locale } }); setAnswer(res.answer); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "البحث القانوني — الأردن" : "Legal Research — Jordan"}
        subtitle={locale === "ar" ? "بحث حصري في التشريعات والاجتهاد القضائي الأردني." : "Search Jordanian legislation and case law exclusively."}
      />

      {/* Corpus scope disclosure — pilot readiness §3: state coverage & last-updated explicitly. */}
      <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/[0.05] to-transparent p-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
          <BookOpen className="size-3.5" />
          {locale === "ar" ? "نطاق المصادر" : "Corpus scope"}
        </div>
        <p className="text-sm text-foreground/80">
          {locale === "ar"
            ? "هذه الأداة تجيب من مصادر القانون الأردني المفهرسة فقط — الدستور، القوانين المدنية والجزائية والتجارية والعمل، قانون التحكيم، قانون الجرائم الإلكترونية، وأحكام محكمة التمييز. محدَّث حتى ٢٠٢٦."
            : "This tool answers only from the indexed Jordanian legal corpus — Constitution, civil, penal, commercial and labour codes, arbitration, cybercrime, and Cassation Court rulings. Updated through 2026."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {locale === "ar"
            ? "إذا كان السؤال خارج هذا النطاق، سيرفض النظام الإجابة بدل التخمين."
            : "If your question falls outside this scope, the system will refuse to answer rather than guess."}
        </p>
      </div>

      <div className="card-elev rounded-2xl border bg-gradient-to-br from-card via-card to-gold/5 p-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-gold">
          <Sparkles className="size-3.5" /> {locale === "ar" ? "مدعوم بالذكاء الاصطناعي — القانون الأردني" : "AI-powered — Jordanian law"}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run(q)} placeholder={locale === "ar" ? "اطرح سؤالاً في القانون الأردني…" : "Ask a question about Jordanian law…"} className="h-14 ps-12 text-base" />
          </div>
          <Button size="lg" variant="gold" className="h-14 px-6" onClick={() => run(q)} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : (locale === "ar" ? "ابحث" : "Search")}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {(locale === "ar"
            ? ["تعويض الفصل التعسفي وفق قانون العمل الأردني", "شروط التحكيم في قانون التحكيم رقم 31 لسنة 2001", "المادة 256 من القانون المدني الأردني", "أحكام قانون الجرائم الإلكترونية رقم 17 لسنة 2023"]
            : ["Wrongful dismissal under Jordanian Labour Law", "Arbitration clauses under Law No. 31/2001", "Article 256 of the Jordanian Civil Code", "Cybercrime Law No. 17/2023 provisions"]
          ).map((s) => (
            <button key={s} onClick={() => { setQ(s); run(s); }} className="rounded-full border bg-background px-3 py-1.5 hover:border-gold">{s}</button>
          ))}
        </div>
      </div>

      {(answer || loading) && (
        <div className="card-elev rounded-xl border bg-card p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold">
            <Sparkles className="size-4" /> {locale === "ar" ? "إجابة الذكاء الاصطناعي" : "AI answer"}
          </div>
          {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {locale === "ar" ? "جاري البحث…" : "Researching…"}</div>
          : <MarkdownView text={answer} />}
        </div>
      )}


      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">{locale === "ar" ? "المصادر ذات الصلة" : "Relevant sources"}</div>
          <div className="flex gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" /> Statute</span>
            <span className="inline-flex items-center gap-1"><ScrollText className="size-3.5" /> Case law</span>
            <span className="inline-flex items-center gap-1"><Globe2 className="size-3.5" /> Treaty</span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {researchSources.map((r) => (
            <div key={r.id} className="card-elev rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{locale === "ar" ? r.titleAr : r.titleEn}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.jurisdiction} · {r.year}</div>
                </div>
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{r.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
