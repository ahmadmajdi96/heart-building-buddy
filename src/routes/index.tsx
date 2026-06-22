import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  FileText,
  Search,
  Sparkles,
  CalendarDays,
  Receipt,
  GraduationCap,
  BarChart3,
  Building2,
  Scale,
  Landmark,
  School,
  ShieldCheck,
  Lock,
  Globe2,
  CheckCircle2,
  Quote,
  Gem,
  Star,
} from "lucide-react";
import type { ComponentType } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arab Law — منظومة العمل القانوني الذكية" },
      {
        name: "description",
        content:
          "منصة قانونية موحدة للمكاتب والإدارات والجامعات والمؤسسات القضائية في العالم العربي.",
      },
      { property: "og:title", content: "Arab Law — AI-Native Legal OS" },
      {
        property: "og:description",
        content:
          "Unified legal platform for Arab firms, in-house counsel and judicial institutions.",
      },
    ],
  }),
  component: LandingPage,
});

/* ───────────────────────────── PAGE ───────────────────────────── */

function LandingPage() {
  const { dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNotice />
      <SiteHeader />
      <Hero Arrow={Arrow} />
      <Marquee />
      <Manifesto />
      <Modules />
      <Spotlight Arrow={Arrow} />
      <Solutions />
      <Testimonial />
      <Security />
      <Pricing />
      <ClosingCTA Arrow={Arrow} />
      <SiteFooter />
    </div>
  );
}

/* ───────────────────────────── TOP / NAV ───────────────────────────── */

function TopNotice() {
  const { locale } = useI18n();
  return (
    <div className="border-b border-onyx/15 bg-onyx text-pearl">
      <div className="container mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-[11px] uppercase tracking-[0.28em]">
        <span className="flex items-center gap-2 text-pearl/70">
          <Gem className="size-3 text-gold" />
          {locale === "ar"
            ? "إطلاق محدود — الإصدار المؤسسي 2026"
            : "Limited release — Enterprise Edition 2026"}
        </span>
        <span className="hidden items-center gap-6 text-pearl/55 md:flex">
          <span>Riyadh · Dubai · Cairo · Doha</span>
          <span className="text-gold">●</span>
          <span>SOC 2 · ISO 27001 · GDPR</span>
        </span>
      </div>
    </div>
  );
}

function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-10 text-[12px] font-medium uppercase tracking-[0.22em] md:flex">
          {[
            { href: "#modules", k: "nav_features" as TKey },
            { href: "#solutions", k: "nav_solutions" as TKey },
            { href: "#security", k: "nav_security" as TKey },
            { href: "#pricing", k: "nav_pricing" as TKey },
          ].map((item) => (
            <a
              key={item.k}
              href={item.href}
              className="text-foreground/55 transition-colors hover:text-foreground"
            >
              {t(item.k)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-[12px] uppercase tracking-[0.18em] sm:inline-flex"
          >
            <Link to="/app/dashboard">{t("nav_signin")}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="gold"
            className="text-[12px] uppercase tracking-[0.18em]"
          >
            <Link to="/app/dashboard">{t("nav_launch")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ───────────────────────────── HERO ───────────────────────────── */

function Hero({ Arrow }: { Arrow: ComponentType<{ className?: string }> }) {
  const { t, locale } = useI18n();
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* warm radiance */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 80% -10%, color-mix(in oklch, var(--gold), transparent 80%), transparent 60%), radial-gradient(ellipse 50% 40% at 10% 110%, color-mix(in oklch, var(--champagne), transparent 70%), transparent 60%)",
        }}
      />
      <div className="diamond-grid absolute inset-0 opacity-[0.35]" aria-hidden />

      <div className="container relative mx-auto max-w-7xl px-6 pb-28 pt-20 lg:pb-36 lg:pt-28">
        {/* meta row */}
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.32em] text-foreground/50">
          <span className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-gold" />
            {locale === "ar" ? "المجلد الأول · العدد ٠١" : "Volume I · Issue 01"}
          </span>
          <span className="hidden md:inline">
            {locale === "ar" ? "إصدار 2026" : "Edition 2026"}
          </span>
        </div>
        <div className="mt-4 gold-rule" />

        {/* headline grid */}
        <div className="mt-16 grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <span className="eyebrow text-gold">{t("hero_eyebrow")}</span>
            <h1 className="mt-6 font-serif text-[3.5rem] leading-[0.98] tracking-[-0.022em] text-foreground md:text-[5.25rem] lg:text-[6.5rem]">
              <span className="block">{t("hero_title_1")}</span>
              <span className="block">
                <em className="text-gilded not-italic [font-style:italic]">
                  {t("hero_title_2")}
                </em>
              </span>
            </h1>
          </div>
          <div className="lg:col-span-4">
            <div className="h-px w-16 bg-gold" />
            <p className="mt-6 max-w-md text-[15px] leading-[1.8] text-foreground/70">
              {t("hero_sub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                variant="gold"
                className="h-12 px-7 text-[12px] uppercase tracking-[0.22em]"
              >
                <Link to="/app/dashboard">
                  {t("hero_cta_primary")} <Arrow className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-onyx/20 px-7 text-[12px] uppercase tracking-[0.22em] hover:bg-onyx hover:text-pearl"
              >
                <a href="#modules">{t("hero_cta_secondary")}</a>
              </Button>
            </div>
          </div>
        </div>

        {/* hero stat band — magazine masthead */}
        <div className="mt-24 grid grid-cols-2 gap-x-10 gap-y-10 border-t border-border pt-10 md:grid-cols-4">
          {[
            {
              k: locale === "ar" ? "ولاية قضائية" : "Jurisdictions",
              v: "22",
            },
            {
              k: locale === "ar" ? "مؤسسة قانونية" : "Legal institutions",
              v: "1,400+",
            },
            {
              k: locale === "ar" ? "مستندات محللة" : "Documents analysed",
              v: "9.4M",
            },
            {
              k: locale === "ar" ? "ساعات موفرة شهرياً" : "Hours saved / month",
              v: "260K",
            },
          ].map((s) => (
            <div key={s.k}>
              <div className="font-serif text-5xl tracking-tight text-foreground md:text-6xl">
                {s.v}
              </div>
              <div className="mt-2 text-[10.5px] uppercase tracking-[0.3em] text-foreground/55">
                {s.k}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── MARQUEE ───────────────────────────── */

function Marquee() {
  const items = [
    "AlBayan & Partners",
    "Gulf Legal Group",
    "Cairo Bar Association",
    "Riyadh Law School",
    "Dubai Arbitration Centre",
    "Doha Chambers",
    "Amman Counsel",
  ];
  return (
    <section className="overflow-hidden border-b border-border bg-onyx py-6 text-pearl/70">
      <div className="flex animate-[marquee_40s_linear_infinite] items-center gap-16 whitespace-nowrap text-[11px] uppercase tracking-[0.4em]">
        {[...items, ...items, ...items].map((n, i) => (
          <span key={i} className="flex items-center gap-16">
            {n}
            <span className="text-gold">✦</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </section>
  );
}

/* ───────────────────────────── MANIFESTO ───────────────────────────── */

function Manifesto() {
  const { locale } = useI18n();
  return (
    <section className="border-b border-border bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className="eyebrow text-gold">
              {locale === "ar" ? "بيان فلسفي" : "A statement of intent"}
            </span>
            <div className="mt-4 h-px w-16 bg-gold" />
          </div>
          <div className="lg:col-span-8">
            <p className="font-serif text-3xl leading-[1.25] tracking-[-0.015em] text-foreground md:text-4xl lg:text-[2.6rem]">
              {locale === "ar" ? (
                <>
                  نحن لا نُؤتمت القانون — بل نُكرّمه. كل سطر كود،
                  كل قرار تصميم،{" "}
                  <em className="text-gilded [font-style:italic]">
                    موضوع برِفعة الحرف
                  </em>{" "}
                  لخدمة المحامي العربي، في محكمة حديثة لا تنحني للتكلّف.
                </>
              ) : (
                <>
                  We do not automate the law — we honour it. Every line, every
                  decision is{" "}
                  <em className="text-gilded [font-style:italic]">
                    composed with care
                  </em>{" "}
                  for the Arab counsel, in a modern court that refuses cheapness.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── MODULES ───────────────────────────── */

const modules: { key: TKey; descKey: TKey; icon: ComponentType<{ className?: string }>; num: string }[] = [
  { key: "m_cases", descKey: "m_cases_desc", icon: Briefcase, num: "01" },
  { key: "m_documents", descKey: "m_documents_desc", icon: FileText, num: "02" },
  { key: "m_research", descKey: "m_research_desc", icon: Search, num: "03" },
  { key: "m_drafting", descKey: "m_drafting_desc", icon: Sparkles, num: "04" },
  { key: "m_calendar", descKey: "m_calendar_desc", icon: CalendarDays, num: "05" },
  { key: "m_financials", descKey: "m_financials_desc", icon: Receipt, num: "06" },
  { key: "m_education", descKey: "m_education_desc", icon: GraduationCap, num: "07" },
  { key: "m_analytics", descKey: "m_analytics_desc", icon: BarChart3, num: "08" },
  { key: "m_clients", descKey: "m_clients_desc", icon: Building2, num: "09" },
];

function Modules() {
  const { t } = useI18n();
  return (
    <section id="modules" className="border-b border-border bg-pearl/50">
      <div className="container mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="eyebrow text-gold">{t("modules_eyebrow")}</span>
            <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
              {t("modules_title")}
            </h2>
          </div>
          <p className="text-foreground/65 lg:col-span-5">{t("modules_sub")}</p>
        </div>

        <div className="mt-16 gold-rule" />

        <div className="grid divide-y divide-border md:grid-cols-2 md:divide-y-0 md:[&>*:nth-child(-n+3)]:border-b md:[&>*:nth-child(odd)]:border-e md:[&>*]:border-border lg:grid-cols-3 lg:[&>*:nth-child(-n+6)]:border-b lg:[&>*:nth-child(3n)]:border-e-0 lg:[&>*]:border-e">
          {modules.map((m) => (
            <ModuleItem
              key={m.key}
              icon={m.icon}
              titleKey={m.key}
              descKey={m.descKey}
              num={m.num}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* Real Module card (separate component) */
function ModuleItem({
  icon: Icon,
  titleKey,
  descKey,
  num,
}: {
  icon: ComponentType<{ className?: string }>;
  titleKey: TKey;
  descKey: TKey;
  num: string;
}) {
  const { t } = useI18n();
  return (
    <a
      href="#"
      className="group relative flex flex-col gap-5 p-8 transition-colors hover:bg-background"
    >
      <div className="flex items-start justify-between">
        <div className="inline-grid size-14 place-items-center rounded-full bg-background ring-1 ring-gold/30 transition-all group-hover:ring-gold/70">
          <Icon className="size-5 text-onyx" />
        </div>
        <span className="font-serif text-sm italic text-gold/70">{num}</span>
      </div>
      <div>
        <div className="font-serif text-2xl tracking-tight text-foreground">
          {t(titleKey)}
        </div>
        <div className="mt-2 h-px w-8 bg-gold/50 transition-all group-hover:w-16" />
        <p className="mt-4 text-[14px] leading-relaxed text-foreground/65">
          {t(descKey)}
        </p>
      </div>
      <span className="mt-auto flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-foreground/40 transition-colors group-hover:text-gold">
        Explore <ArrowUpRight className="size-3.5" />
      </span>
    </a>
  );
}

/* Replace the placeholder modules grid above by re-rendering with ModuleItem.
   Because React doesn't allow two same-named function components, we expose
   the grid via a wrapper. */
// override ModuleRow no-op by re-creating the grid below.

/* ───────────────────────────── SPOTLIGHT ───────────────────────────── */

function Spotlight({ Arrow }: { Arrow: ComponentType<{ className?: string }> }) {
  const { locale } = useI18n();
  return (
    <section className="relative overflow-hidden border-b border-border bg-onyx text-pearl">
      <div className="arabesque absolute inset-0 opacity-40" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -end-32 top-1/2 size-[640px] -translate-y-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--gold), transparent 60%), transparent 70%)",
        }}
      />
      <div className="container relative mx-auto max-w-7xl px-6 py-28 lg:py-36">
        <div className="grid items-center gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="eyebrow text-gold">
              {locale === "ar" ? "محاكاة المحكمة" : "Courtroom · AI"}
            </span>
            <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] text-pearl md:text-6xl">
              {locale === "ar" ? (
                <>
                  محكمة حية،{" "}
                  <em className="text-gilded [font-style:italic]">
                    قاضٍ ذكي
                  </em>
                </>
              ) : (
                <>
                  A live court,{" "}
                  <em className="text-gilded [font-style:italic]">an AI bench</em>
                </>
              )}
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-[1.8] text-pearl/65">
              {locale === "ar"
                ? "ارفع قضيتك أو ولّد سيناريو. اختر أن تكون مدّعياً أو مدعى عليه، وواجه خصماً وقاضياً مبنيين على الذكاء الاصطناعي وفق إجراءات المحكمة العربية."
                : "Upload a real matter or generate a scenario. Choose claimant or defendant and face an AI counsel and bench grounded in Arab procedural rules."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="gold" className="h-12 px-7 text-[12px] uppercase tracking-[0.22em]">
                <Link to="/app/courtroom">
                  {locale === "ar" ? "ادخل القاعة" : "Enter the chamber"}{" "}
                  <Arrow className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghostLight" className="h-12 px-7 text-[12px] uppercase tracking-[0.22em]">
                <Link to="/app/dashboard">
                  {locale === "ar" ? "كل الوحدات" : "All modules"}
                </Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <CourtMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function CourtMock() {
  const { locale } = useI18n();
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-px rounded-2xl"
        style={{
          background:
            "linear-gradient(140deg, color-mix(in oklch, var(--gold), transparent 60%), transparent 40%, color-mix(in oklch, var(--gold), transparent 75%))",
        }}
      />
      <div className="relative rounded-2xl border border-pearl/10 bg-onyx/90 p-7 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-pearl/10 pb-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-pearl/50">
            <Scale className="size-3.5 text-gold" />
            {locale === "ar" ? "القضية رقم ١٢٠٤/٢٦" : "Docket 1204 / 26"}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-pearl/30" />
            <span className="size-1.5 rounded-full bg-pearl/30" />
            <span className="size-1.5 rounded-full bg-gold" />
          </div>
        </div>

        <div className="mt-6 font-serif text-2xl leading-tight text-pearl">
          {locale === "ar"
            ? "نزاع امتياز تجاري بين شركة سعودية وأخرى إماراتية"
            : "Cross-border franchise dispute — KSA × UAE"}
        </div>

        <div className="mt-6 space-y-3 text-[13px] leading-relaxed">
          <div className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-sm border border-gold/40 px-1.5 text-[9px] uppercase tracking-widest text-gold">
              {locale === "ar" ? "القاضي" : "Bench"}
            </span>
            <p className="text-pearl/85">
              {locale === "ar"
                ? "ليُقدّم المدّعي بيانه الافتتاحي، مع الإشارة إلى المادة ٢٢ من النظام التجاري."
                : "Claimant may present opening submissions, with reference to Article 22 of the Commercial Code."}
            </p>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-sm bg-gold/20 px-1.5 text-[9px] uppercase tracking-widest text-gold">
              {locale === "ar" ? "المدّعي" : "Claimant"}
            </span>
            <p className="text-pearl/85">
              {locale === "ar"
                ? "تم الإخلال بشرط الحصرية الإقليمية المبرم بتاريخ ٢٠٢٤/٠٣/١٤."
                : "The territorial exclusivity clause executed 14 / 03 / 2024 has been breached."}
            </p>
          </div>
          <div className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 shrink-0 items-center rounded-sm bg-pearl/10 px-1.5 text-[9px] uppercase tracking-widest text-pearl/70">
              {locale === "ar" ? "المدعى عليه" : "Defendant"}
            </span>
            <p className="text-pearl/85">
              {locale === "ar"
                ? "نعترض — البند المذكور مشروط بإخطار خطّي مسبق لم يُستلم."
                : "Objection — said clause is conditioned on a written notice that was never received."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-pearl/10 pt-5">
          {[
            { k: locale === "ar" ? "جلسات اليوم" : "Hearings", v: "07" },
            { k: locale === "ar" ? "مستندات" : "Exhibits", v: "24" },
            { k: locale === "ar" ? "مراجع" : "Authorities", v: "12" },
          ].map((s) => (
            <div key={s.k}>
              <div className="font-serif text-2xl text-pearl">{s.v}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-pearl/50">
                {s.k}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── SOLUTIONS ───────────────────────────── */

function Solutions() {
  const { t } = useI18n();
  const items = [
    { icon: Scale, titleKey: "sol_firms", descKey: "sol_firms_desc", num: "I" },
    { icon: Building2, titleKey: "sol_inhouse", descKey: "sol_inhouse_desc", num: "II" },
    { icon: School, titleKey: "sol_universities", descKey: "sol_universities_desc", num: "III" },
    { icon: Landmark, titleKey: "sol_judiciary", descKey: "sol_judiciary_desc", num: "IV" },
  ] as const;
  return (
    <section id="solutions" className="border-b border-border bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="eyebrow text-gold">
              {t("nav_solutions")}
            </span>
            <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
              {t("sol_title")}
            </h2>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, titleKey, descKey, num }) => (
            <div
              key={titleKey}
              className="group relative flex flex-col gap-5 rounded-xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_30px_80px_-30px_color-mix(in_oklch,var(--gold),transparent_60%)]"
            >
              <div className="flex items-start justify-between">
                <Icon className="size-7 text-onyx" strokeWidth={1.4} />
                <span className="font-serif text-sm italic text-gold/70">
                  {num}
                </span>
              </div>
              <div className="font-serif text-2xl tracking-tight text-foreground">
                {t(titleKey)}
              </div>
              <p className="text-[13.5px] leading-relaxed text-foreground/65">
                {t(descKey)}
              </p>
              <div className="mt-auto h-px w-full bg-border">
                <div className="h-px w-12 bg-gold transition-all group-hover:w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── TESTIMONIAL ───────────────────────────── */

function Testimonial() {
  const { locale } = useI18n();
  return (
    <section className="border-b border-border bg-pearl/50">
      <div className="container mx-auto max-w-5xl px-6 py-24 text-center lg:py-32">
        <Quote className="mx-auto size-8 text-gold" strokeWidth={1.2} />
        <p className="mt-8 font-serif text-3xl italic leading-[1.35] tracking-[-0.012em] text-foreground md:text-4xl lg:text-[2.5rem]">
          {locale === "ar"
            ? "للمرة الأولى، أرى أداةً قانونية تُحترم فيها اللغة العربية كما تُحترم في المرافعات. كل شيء فيها يهمس بالكفاءة."
            : "For the first time, a legal tool that honours Arabic the way it is honoured in oral argument. Everything in it whispers competence."}
        </p>
        <div className="mt-10 flex items-center justify-center gap-1 text-gold">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-3.5 fill-gold" strokeWidth={0} />
          ))}
        </div>
        <div className="mt-5 text-[11px] uppercase tracking-[0.32em] text-foreground/55">
          {locale === "ar"
            ? "د. لمى الراشد · شريك أول · مكتب الراشد للمحاماة"
            : "Dr. Lama Al-Rashed · Senior Partner · Al-Rashed Counsel"}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── SECURITY ───────────────────────────── */

function Security() {
  const { t, locale } = useI18n();
  return (
    <section id="security" className="border-b border-border bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="eyebrow text-gold">
              <ShieldCheck className="me-1.5 inline size-3" />{" "}
              {locale === "ar" ? "أمان" : "Security"}
            </span>
            <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
              {t("sec_title")}
            </h2>
            <p className="mt-6 text-[15px] leading-[1.8] text-foreground/70">
              {t("sec_sub")}
            </p>
            <ul className="mt-10 space-y-4">
              {(["sec_iso", "sec_gdpr", "sec_residency", "sec_sso", "sec_audit", "sec_rbac"] as TKey[]).map((k) => (
                <li
                  key={k}
                  className="flex items-start gap-3 border-b border-border pb-3 text-[14px]"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span className="text-foreground/85">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Lock, label: locale === "ar" ? "تشفير AES-256" : "AES-256 encryption" },
                { icon: Gem, label: locale === "ar" ? "إدارة مفاتيح مخصصة" : "Dedicated KMS" },
                { icon: Globe2, label: locale === "ar" ? "إقامة بيانات إقليمية" : "Regional residency" },
                { icon: ShieldCheck, label: locale === "ar" ? "اختبار اختراق ربع سنوي" : "Quarterly pen-tests" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <Icon className="size-5 text-gold" />
                  <div className="mt-4 font-serif text-lg tracking-tight">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-hidden rounded-xl bg-onyx p-7 text-pearl">
              <div className="text-[10px] uppercase tracking-[0.32em] text-gold">
                SOC 2 · ISO 27001 · GDPR
              </div>
              <div className="mt-3 font-serif text-4xl tracking-tight">
                99.99%{" "}
                <span className="text-pearl/60">
                  {locale === "ar" ? "إتاحة" : "Uptime"}
                </span>
              </div>
              <div className="mt-2 text-[13px] text-pearl/65">
                {locale === "ar"
                  ? "نسخ احتياطي يومي مشفّر — استرداد خلال ١٥ دقيقة."
                  : "Encrypted daily backups — 15-minute recovery objective."}
              </div>
              <div className="mt-6 gold-rule" />
              <div className="mt-6 grid grid-cols-3 gap-6 text-[11px] uppercase tracking-[0.25em] text-pearl/50">
                <div>
                  <div className="font-serif text-2xl normal-case tracking-tight text-pearl">
                    24×7
                  </div>
                  <div className="mt-1">SOC monitoring</div>
                </div>
                <div>
                  <div className="font-serif text-2xl normal-case tracking-tight text-pearl">
                    0
                  </div>
                  <div className="mt-1">PII shared</div>
                </div>
                <div>
                  <div className="font-serif text-2xl normal-case tracking-tight text-pearl">
                    ∞
                  </div>
                  <div className="mt-1">Audit retention</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── PRICING ───────────────────────────── */

function Pricing() {
  const { t, locale } = useI18n();
  const plans = [
    {
      plan: "plan_starter" as TKey,
      price: "49",
      tagline: locale === "ar" ? "للممارسين والمكاتب الصغيرة" : "For solos & boutique firms",
      features:
        locale === "ar"
          ? ["إدارة القضايا", "٢٠٠ مستند", "بحث قانوني أساسي", "١ جيجا تخزين"]
          : ["Case management", "200 documents", "Basic research", "1 GB storage"],
      featured: false,
    },
    {
      plan: "plan_pro" as TKey,
      price: "129",
      tagline: locale === "ar" ? "للمكاتب المتنامية" : "For growing practices",
      features:
        locale === "ar"
          ? ["كل ما في البداية", "صياغة بالذكاء الاصطناعي", "بحث متقدم", "تقارير وتحليلات", "تكاملات الفوترة"]
          : ["Everything in Starter", "AI drafting", "Advanced research", "Reports & analytics", "Billing integrations"],
      featured: true,
    },
    {
      plan: "plan_enterprise" as TKey,
      price: "—",
      tagline: locale === "ar" ? "للمؤسسات والمحاكم" : "For institutions & courts",
      features:
        locale === "ar"
          ? ["إقامة بيانات مخصصة", "SSO / SAML", "مدير حساب مخصص", "اتفاقية SLA"]
          : ["Custom data residency", "SSO / SAML", "Dedicated CSM", "Custom SLA"],
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="border-b border-border bg-pearl/50">
      <div className="container mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-gold">
            {locale === "ar" ? "الأسعار" : "Pricing"}
          </span>
          <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
            {t("pricing_title")}
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.plan}
              className={[
                "relative flex flex-col rounded-2xl border p-8 transition-all",
                p.featured
                  ? "border-onyx bg-onyx text-pearl shadow-[0_40px_100px_-40px_color-mix(in_oklch,var(--onyx),transparent_40%)]"
                  : "border-border bg-card text-foreground",
              ].join(" ")}
            >
              {p.featured && (
                <span className="absolute -top-3 start-8 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-foreground">
                  <Star className="size-3 fill-gold-foreground" strokeWidth={0} />
                  {locale === "ar" ? "الأكثر اختياراً" : "Most chosen"}
                </span>
              )}
              <div
                className={[
                  "text-[10px] uppercase tracking-[0.32em]",
                  p.featured ? "text-gold" : "text-foreground/55",
                ].join(" ")}
              >
                {t(p.plan)}
              </div>
              <div
                className={[
                  "mt-2 text-[13px]",
                  p.featured ? "text-pearl/65" : "text-foreground/60",
                ].join(" ")}
              >
                {p.tagline}
              </div>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="font-serif text-6xl tracking-tight">
                  {p.price === "—" ? "—" : `$${p.price}`}
                </span>
                {p.price !== "—" && (
                  <span
                    className={[
                      "text-[12px]",
                      p.featured ? "text-pearl/60" : "text-foreground/55",
                    ].join(" ")}
                  >
                    {t("pricing_monthly")}
                  </span>
                )}
              </div>

              <div
                className={[
                  "mt-6 h-px w-full",
                  p.featured ? "bg-pearl/15" : "bg-border",
                ].join(" ")}
              />

              <ul className="mt-6 space-y-3 text-[14px]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckCircle2
                      className={[
                        "mt-0.5 size-4 shrink-0",
                        p.featured ? "text-gold" : "text-gold",
                      ].join(" ")}
                    />
                    <span
                      className={p.featured ? "text-pearl/90" : "text-foreground/85"}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={p.featured ? "gold" : "outline"}
                className={[
                  "mt-10 w-full text-[12px] uppercase tracking-[0.22em]",
                  !p.featured && "border-onyx/20 hover:bg-onyx hover:text-pearl",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Link to="/app/dashboard">
                  {p.plan === "plan_enterprise" ? t("plan_contact") : t("plan_cta")}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── CLOSING CTA ───────────────────────────── */

function ClosingCTA({ Arrow }: { Arrow: ComponentType<{ className?: string }> }) {
  const { t, locale } = useI18n();
  return (
    <section className="relative overflow-hidden bg-onyx text-pearl">
      <div className="arabesque absolute inset-0 opacity-40" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }}
      />
      <div className="container relative mx-auto max-w-5xl px-6 py-28 text-center lg:py-36">
        <span className="eyebrow text-gold">
          {locale === "ar" ? "ادخل المنصة" : "Begin"}
        </span>
        <h2 className="mt-6 font-serif text-5xl leading-[1.02] tracking-[-0.02em] text-pearl md:text-7xl">
          {t("cta_title")}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[1.8] text-pearl/65">
          {t("cta_sub")}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="gold" className="h-12 px-8 text-[12px] uppercase tracking-[0.22em]">
            <Link to="/app/dashboard">
              {t("nav_launch")} <Arrow className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghostLight" className="h-12 px-8 text-[12px] uppercase tracking-[0.22em]">
            <a href="#modules">{t("hero_cta_secondary")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── FOOTER ───────────────────────────── */

function SiteFooter() {
  const { t, locale } = useI18n();
  return (
    <footer className="bg-background text-foreground">
      <div className="container mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <BrandMark />
            <p className="mt-5 max-w-sm text-[14px] leading-relaxed text-foreground/65">
              {t("brand_tagline")}
            </p>
            <div className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-foreground/45">
              <Gem className="size-3 text-gold" />
              {locale === "ar" ? "صُنع برِفعة في الرياض ودبي" : "Crafted in Riyadh & Dubai"}
            </div>
          </div>
          {[
            { h: t("nav_features"), items: ["Cases", "Documents", "Research", "Drafting", "Billing"] },
            { h: t("nav_solutions"), items: ["Law firms", "In-house", "Universities", "Judiciary"] },
            { h: locale === "ar" ? "الشركة" : "Company", items: ["About", "Security", "Privacy", "Contact"] },
          ].map((col) => (
            <div key={col.h} className="md:col-span-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-foreground/55">
                {col.h}
              </div>
              <ul className="mt-5 space-y-3 text-[13.5px] text-foreground/75">
                {col.items.map((i) => (
                  <li key={i}>
                    <a className="transition-colors hover:text-gold" href="#">
                      {i}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="md:col-span-1" />
        </div>

        <div className="mt-14 gold-rule" />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.3em] text-foreground/45">
          <div>
            © {new Date().getFullYear()} Arab Law · {t("footer_rights")}
          </div>
          <div className="flex items-center gap-6">
            <span>SOC 2</span>
            <span className="text-gold">●</span>
            <span>ISO 27001</span>
            <span className="text-gold">●</span>
            <span>GDPR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
