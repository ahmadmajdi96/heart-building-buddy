import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { researchSources } from "@/lib/mock-data";
import { Sparkles, Search, BookOpen, ScrollText, Globe2 } from "lucide-react";

export const Route = createFileRoute("/app/research")({ component: ResearchPage });

function ResearchPage() {
  const { locale } = useI18n();
  const [q, setQ] = useState("");
  const [answered, setAnswered] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "البحث القانوني" : "Legal Research"}
        subtitle={locale === "ar" ? "ابحث في التشريعات والاجتهاد القضائي العربي والدولي." : "Search Arab and international legislation and case law."}
      />

      <div className="card-elev rounded-2xl border bg-gradient-to-br from-card via-card to-gold/5 p-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-gold">
          <Sparkles className="size-3.5" /> {locale === "ar" ? "مدعوم بالذكاء الاصطناعي" : "AI-powered"}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={locale === "ar" ? "اطرح سؤالاً قانونياً، أو ابحث عن مادة أو حكم…" : "Ask a legal question, or search for a statute or ruling…"}
              className="h-14 ps-12 text-base"
            />
          </div>
          <Button size="lg" variant="gold" className="h-14 px-6" onClick={() => setAnswered(true)}>
            {locale === "ar" ? "ابحث" : "Search"}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {(locale === "ar"
            ? ["تعويض الفسخ التعسفي", "شروط التحكيم الإلزامي", "حماية البيانات الشخصية", "علامة تجارية مشهورة"]
            : ["Wrongful termination damages", "Mandatory arbitration clauses", "Personal data protection", "Well-known trademark"]
          ).map((s) => (
            <button key={s} onClick={() => { setQ(s); setAnswered(true); }} className="rounded-full border bg-background px-3 py-1.5 transition hover:border-gold hover:text-foreground">
              {s}
            </button>
          ))}
        </div>
      </div>

      {answered && (
        <div className="card-elev rounded-xl border bg-card p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold">
            <Sparkles className="size-4" /> {locale === "ar" ? "إجابة موجزة" : "AI summary"}
          </div>
          <p className="leading-relaxed text-foreground/90">
            {locale === "ar"
              ? "وفقاً للمادة 77 من نظام العمل السعودي، يحق للعامل الذي يُفصل تعسفياً المطالبة بتعويض يعادل أجر 15 يوماً عن كل سنة من سنوات الخدمة، مع حد أدنى يعادل أجر شهرين. تؤكد محكمة التمييز الإماراتية في حكمها رقم 2023/118 على ذات المبدأ مع اختلافات إجرائية."
              : "Under Article 77 of the Saudi Labor Law, a wrongfully terminated employee is entitled to compensation equivalent to 15 days' wages for each year of service, with a minimum of two months. The UAE Court of Cassation (2023/118) affirms the same principle with procedural variations."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {["KSA Labor Law Art. 77", "UAE Cass. 2023/118", "GCC Comparative Memo"].map((c) => (
              <span key={c} className="rounded-md border bg-secondary/60 px-2.5 py-1 font-mono">{c}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">{locale === "ar" ? "المصادر ذات الصلة" : "Relevant sources"}</div>
          <div className="flex gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" /> {locale === "ar" ? "تشريع" : "Statute"}</span>
            <span className="inline-flex items-center gap-1"><ScrollText className="size-3.5" /> {locale === "ar" ? "اجتهاد" : "Case law"}</span>
            <span className="inline-flex items-center gap-1"><Globe2 className="size-3.5" /> {locale === "ar" ? "معاهدة" : "Treaty"}</span>
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
