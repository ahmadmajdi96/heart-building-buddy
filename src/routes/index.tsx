import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ComponentType, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";
import { motion } from "@/components/motion-lite";
import { CornerFlourish, OrnamentalRule, LatticeDivider, SealFrame, IconScales, IconSeal, IconLattice, IconScroll, IconGavel, IconCrescent } from "@/components/app/primitives";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Phone,
  FileText,
  Scale,
  BookOpen,
  Coins,
  Bell,
  Users,
  Building2,
  Sparkles,
} from "lucide-react";

/* ───────────────────────── Route ───────────────────────── */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "محكم — نظام إدارة مكاتب المحاماة في الأردن | Mohkam — Jordanian Law Firm OS" },
      {
        name: "description",
        content:
          "منصة أردنية ثنائية اللغة لإدارة القضايا والموكلين والجلسات والفوترة بالدينار والتحصيل والصياغة القانونية — ملتزمة بقانون حماية البيانات وجاهزية الفوترة الوطنية.",
      },
      {
        name: "keywords",
        content:
          "برنامج إدارة مكتب محاماة الأردن, نظام محاماة أردني, فوترة JoFotara للمحامين, لائحة دعوى, law firm software Jordan, legal practice management Jordan",
      },
      { property: "og:title", content: "Mohkam محكم — The OS for the Jordanian Law Firm" },
      {
        property: "og:description",
        content:
          "One bilingual Jordanian workspace: cases, clients, hearings, JOD billing, collections and legal drafting — built for Jordan, not translated to it.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mohkamlaw.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Mohkam محكم — The OS for the Jordanian Law Firm" },
    ],
    links: [{ rel: "canonical", href: "https://mohkamlaw.com/" }],
  }),
  component: LandingPage,
});

/* ───────────────────────── helpers ───────────────────────── */

const ar = (locale: string, a: string, e: string) => (locale === "ar" ? a : e);

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="landing-eyebrow inline-flex items-center gap-2">
      <span className="inline-block h-px w-6 bg-gold" />
      {children}
    </span>
  );
}

function Section({
  id,
  children,
  className = "",
  divider = true,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  divider?: boolean;
}) {
  return (
    <section id={id} className={`relative border-b border-border ${className}`}>
      {divider && <LatticeDivider className="absolute inset-x-0 -top-5 z-10" />}
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">{children}</div>
    </section>
  );
}

/* ───────────────────────── PAGE ───────────────────────── */

function LandingPage() {
  const { dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnnouncementBar />
      <SiteHeader />
      <Hero Arrow={Arrow} />
      <TrustStrip />
      <Problem />
      <Workflow />
      <Platform />
      <Compliance />
      <Collections />
      <AiSection />
      <Honesty />
      <Security />
      <WhoFor />
      <Pricing />
      <Beta />
      <FAQ />
      <FinalCTA Arrow={Arrow} />
      <SiteFooter />
    </div>
  );
}

/* ───────────────────────── ANNOUNCEMENT ───────────────────────── */

function AnnouncementBar() {
  const { locale } = useI18n();
  return (
    <div className="relative overflow-hidden border-b border-onyx/40 bg-onyx text-pearl">
      <div aria-hidden className="pointer-events-none absolute inset-0 arabesque opacity-[0.08]" />
      <div className="container relative mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-[11px] uppercase tracking-[0.24em] text-pearl/85 sm:text-[12px]">
        <span className="inline-block size-1.5 rounded-full bg-gold" />
        {ar(
          locale,
          "النسخة التجريبية الخاصة مفتوحة لمكاتب مختارة في الأردن — ٢٠٢٦",
          "Private beta now open for selected Jordanian firms — 2026",
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── HEADER ───────────────────────── */

function SiteHeader() {
  const { locale } = useI18n();
  const nav = [
    { href: "#platform", label: ar(locale, "المنصة", "Platform") },
    { href: "#workflow", label: ar(locale, "سير العمل", "How it works") },
    { href: "#compliance", label: ar(locale, "الامتثال", "Compliance") },
    { href: "#collections", label: ar(locale, "التحصيل", "Collections") },
    { href: "#pricing", label: ar(locale, "الأسعار", "Pricing") },
    { href: "#faq", label: ar(locale, "الأسئلة", "FAQ") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-gold/25 bg-onyx/95 text-pearl backdrop-blur-xl">
      <div aria-hidden className="pointer-events-none absolute inset-0 arabesque opacity-[0.07]" />
      <div className="container relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[72px] sm:gap-6 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center">
          <BrandMark tone="dark" />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-1.5 text-[13.5px] font-medium text-pearl/75 transition-colors hover:bg-gold/15 hover:text-gold"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LangToggle />
          <Button asChild variant="ghost" size="sm" className="hidden text-[13px] font-medium text-pearl/85 hover:bg-gold/15 hover:text-gold sm:inline-flex">
            <Link to="/auth">{ar(locale, "تسجيل الدخول", "Sign in")}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="gold"
            className="h-9 rounded-full px-3 text-[12px] font-medium shadow-sm sm:px-4 sm:text-[13px]"
          >
            <a href="#beta">{ar(locale, "اطلب البيتا", "Request beta")}</a>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ───────────────────────── HERO ─────────────────────────
   Visual: anatomized statement of claim (لائحة دعوى), not a dashboard. */

function Hero({ Arrow }: { Arrow: ComponentType<{ className?: string }> }) {
  const { locale, dir } = useI18n();
  const isRtl = dir === "rtl";
  const ticks = [
    ar(locale, "لائحة دعوى · قائمة بينات · لائحة جوابية", "Statement of claim · evidence list · defense"),
    ar(locale, "فوترة بالدينار وضريبة ١٦٪", "JOD billing at 16% GST"),
    ar(locale, "جلسات ومهل بتذكيرات آلية", "Hearings & deadlines with automatic reminders"),
    ar(locale, "تحصيل الديون والأقساط", "Debt & installment collections"),
  ];
  return (
    <section className="relative isolate overflow-hidden border-b border-onyx/40 bg-onyx text-pearl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 82% 12%, color-mix(in oklch, var(--gold), transparent 55%), transparent 70%), radial-gradient(ellipse 60% 55% at 5% 95%, color-mix(in oklch, var(--primary), transparent 40%), transparent 65%), linear-gradient(180deg, oklch(0.20 0.07 258) 0%, oklch(0.14 0.05 258) 70%, oklch(0.11 0.04 258) 100%)",
        }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.11, scale: 1 }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        className="arabesque-lg absolute inset-0"
      />

      <div className="container relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20 lg:pb-32 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Editorial headline column */}
          <div className="relative lg:col-span-7">
            <CornerFlourish className={`absolute -top-2 text-gold/80 ${isRtl ? "-right-2 -scale-x-100" : "-left-2"}`} size={40} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-7 ms-10 inline-flex items-center gap-3 rounded-full border border-gold/25 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-pearl/80 backdrop-blur-sm sm:text-[11px] sm:tracking-[0.28em]"
            >
              <span className="relative grid size-2 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-gold/60" />
                <span className="relative size-2 rounded-full bg-gold" />
              </span>
              {ar(locale, "صُنع في عمّان · للأردن أولاً", "Built in Amman · Jordan-first")}
            </motion.div>

            <div className="ps-10">
              <OrnamentalRule className="mb-6 w-28 text-gold" />
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={`font-serif tracking-[-0.025em] text-pearl ${isRtl ? "text-[2.35rem] leading-[1.15] md:text-[3.5rem] lg:text-[4.25rem]" : "text-[2.5rem] leading-[1.02] md:text-[3.5rem] lg:text-[4.25rem]"}`}
              >
                {isRtl ? (
                  <>
                    <span className="block">نظام تشغيل</span>
                    <em className="not-italic [font-style:italic] text-gilded">مكتب المحاماة الأردني</em>
                  </>
                ) : (
                  <>
                    <span className="block">The operating system for the </span>
                    <em className="not-italic [font-style:italic] text-gilded">Jordanian law firm</em>
                  </>
                )}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="mt-7 max-w-xl text-[16px] leading-[1.85] text-pearl/75 sm:text-[17px]"
              >
                {ar(
                  locale,
                  "محكم يجمع القضايا والموكلين والجلسات والمواعيد والمستندات والفوترة والتحصيل والصياغة القانونية في مساحة عمل واحدة ثنائية اللغة — مبنية على القانون الأردني، وإجراءات المحاكم الأردنية، ومتطلبات الامتثال في الأردن. مبني للأردن، لا مترجَم إليه.",
                  "Mohkam brings cases, clients, hearings, deadlines, documents, billing, collections and legal drafting into one bilingual workspace — built on Jordanian law, Jordanian court procedure and Jordanian compliance. Built for Jordan, not translated to it.",
                )}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-9 flex flex-wrap items-center gap-3"
              >
                <Button
                  asChild
                  size="lg"
                  variant="gold"
                  className="h-12 px-7 text-[11px] uppercase tracking-[0.22em] shadow-[0_10px_40px_-10px_color-mix(in_oklch,var(--gold),transparent_40%)] sm:text-[12px] sm:tracking-[0.24em]"
                >
                  <a href="#beta">
                    {ar(locale, "اطلب الوصول للبيتا", "Request beta access")} <Arrow className="size-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="h-12 border border-pearl/15 bg-white/[0.03] px-7 text-[11px] uppercase tracking-[0.22em] text-pearl hover:bg-white/[0.08] hover:text-pearl sm:text-[12px] sm:tracking-[0.24em]"
                >
                  <a href="#platform">{ar(locale, "استكشف المنصة", "Explore the platform")}</a>
                </Button>
              </motion.div>

              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.5 } } }}
                className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 text-[10px] uppercase tracking-[0.18em] text-pearl/60 sm:text-[11px] sm:tracking-[0.22em]"
              >
                {ticks.map((t) => (
                  <motion.li key={t} variants={fadeUp} className="flex items-center gap-2">
                    <span className="size-1 rounded-full bg-gold" />
                    {t}
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </div>

          {/* Anatomized لائحة دعوى — the work product, not a dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`relative lg:col-span-5 ${isRtl ? "lg:-ms-4" : "lg:ms-4"}`}
          >
            <div
              className="absolute -inset-8 -z-10 rounded-[2rem] opacity-60 blur-3xl"
              style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, color-mix(in oklch, var(--gold), transparent 55%), transparent 75%)" }}
              aria-hidden
            />
            <ClaimDocumentMock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ClaimDocumentMock() {
  const { locale, dir } = useI18n();
  const isRtl = dir === "rtl";
  const rows = [
    { k: ar(locale, "الأطراف", "Parties"), v: ar(locale, "المدعي · المدعى عليه", "Claimant · Respondent") },
    { k: ar(locale, "الوقائع", "Facts"), v: ar(locale, "١. … ٢. … ٣. …", "1. … 2. … 3. …") },
    { k: ar(locale, "التكييف القانوني", "Legal characterization"), v: ar(locale, "المواد ذات العلاقة", "Governing articles") },
    { k: ar(locale, "موضوع الدعوى وسندها", "Subject & legal basis"), v: ar(locale, "طلب الحكم بـ…", "Prayer for relief in…") },
    { k: ar(locale, "الطلبات", "Requests"), v: ar(locale, "أولاً · ثانياً · ثالثاً", "First · Second · Third") },
    { k: ar(locale, "قائمة البينات", "Evidence list"), v: ar(locale, "مبرز ١ · مبرز ٢ · شهود", "Exhibit 1 · Exhibit 2 · Witnesses") },
  ];
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-gold/30 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-3 shadow-2xl backdrop-blur-xl">
      <CornerFlourish className="absolute left-3 top-3 z-10 text-gold" size={20} />
      <CornerFlourish className="absolute right-3 top-3 z-10 -scale-x-100 text-gold" size={20} />
      <CornerFlourish className="absolute bottom-3 left-3 z-10 -scale-y-100 text-gold" size={20} />
      <CornerFlourish className="absolute bottom-3 right-3 z-10 -scale-100 text-gold" size={20} />

      <div className="rounded-[1.15rem] border border-pearl/10 bg-[color-mix(in_oklch,var(--pearl),transparent_92%)] p-6">
        <div className="flex items-center justify-between border-b border-pearl/10 pb-3 text-[10px] uppercase tracking-[0.28em] text-pearl/60">
          <span className="text-gold">{ar(locale, "لائحة دعوى", "Statement of claim")}</span>
          <span>{ar(locale, "محكمة بداية عمّان", "Court of First Instance · Amman")}</span>
        </div>

        <ul className="mt-4 divide-y divide-pearl/10">
          {rows.map((r, i) => (
            <motion.li
              key={r.k}
              initial={{ opacity: 0, x: isRtl ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.55 + i * 0.08 }}
              className="flex items-baseline gap-3 py-2.5"
            >
              <span className="w-4 shrink-0 font-serif text-[13px] italic text-gold/80">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] uppercase tracking-[0.28em] text-pearl/55">{r.k}</div>
                <div className="mt-0.5 truncate text-[13.5px] text-pearl/85">{r.v}</div>
              </div>
            </motion.li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between border-t border-pearl/10 pt-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/50 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-gold">
            <ShieldCheck className="size-3.5" />
            {ar(locale, "جاهزة لمراجعة المحامي", "Ready for lawyer review")}
          </div>
          <span className="text-[10px] uppercase tracking-[0.28em] text-pearl/45">JOD · 16% GST</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── HONEST TRUST STRIP ───────────────────────── */

function TrustStrip() {
  const { locale } = useI18n();
  const items = [
    ar(locale, "صُنع في عمّان", "Built in Amman"),
    ar(locale, "مبني مع محامين أردنيين ممارسين", "Shaped with practicing Jordanian lawyers"),
    ar(locale, "بيانات معزولة لكل مكتب", "Firm-level data isolation"),
    ar(locale, "التزام بقانون حماية البيانات ٢٤ / ٢٠٢٣", "Committed to PDPL No. 24/2023"),
  ];
  return (
    <section className="border-b border-border bg-pearl/40 py-8">
      <div className="container mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 text-center sm:px-6 md:grid-cols-4">
        {items.map((t) => (
          <div key={t} className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/60 sm:text-[12px]">
            <span className="size-1 rounded-full bg-gold" />
            {t}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── PROBLEM ───────────────────────── */

function Problem() {
  const { locale } = useI18n();
  const pains = [
    {
      t: ar(locale, "ملفات مبعثرة", "Scattered files"),
      d: ar(locale, "بين الأجهزة والبريد والواتساب؛ لا ملف قضية واحد.", "Across devices, email and WhatsApp — no single case file."),
    },
    {
      t: ar(locale, "مواعيد تُتابع يدوياً", "Deadlines from memory"),
      d: ar(locale, "جلسات ومهل قانونية تحت رحمة الذاكرة والدفاتر.", "Hearings and statutory limits tracked from notebooks."),
    },
    {
      t: ar(locale, "فوترة على Excel", "Excel billing"),
      d: ar(locale, "لا توافق متطلبات الفوترة الوطنية ولا تُظهر الإيرادات.", "Meets no national requirement, shows no revenue."),
    },
    {
      t: ar(locale, "صياغة تستهلك الساعات", "Drafting eats hours"),
      d: ar(locale, "لوائح وعقود تُكتب من الصفر في كل مرة.", "Pleadings and contracts written from scratch every time."),
    },
    {
      t: ar(locale, "تحصيل بلا نظام", "Collections by phone"),
      d: ar(locale, "أقساط وإيجارات وديون تُتابع بالمكالمات.", "Installments, rents and debts chased by phone call."),
    },
    {
      t: ar(locale, "لا رؤية للأداء", "No visibility"),
      d: ar(locale, "أصحاب المكاتب لا يرون التحصيل ولا أعباء الفريق.", "Owners see neither collections nor team load."),
    },
  ];
  return (
    <Section id="problem" className="bg-background">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>{ar(locale, "المشكلة", "The Problem")}</Eyebrow>
          <h2 className="mt-5 font-serif text-2xl leading-[1.1] tracking-[-0.02em] md:text-3xl">
            {ar(locale, "المكاتب تعمل على أدوات لم تُصمَّم للمحاماة الأردنية", "Firms run on tools never designed for Jordanian practice")}
          </h2>
          <p className="mt-6 font-serif text-lg italic text-foreground/70">
            {ar(locale, "النتيجة: وقت ضائع، إيرادات ضائعة، ومخاطر مهنية لا داعي لها.", "The result: lost time, lost revenue, and professional risk no firm needs.")}
          </p>
        </div>
        <div className="lg:col-span-7">
          <ul className="grid gap-3 sm:grid-cols-2">
            {pains.map((p, i) => (
              <motion.li
                key={p.t}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 font-serif text-lg text-foreground">{p.t}</div>
                <div className="mt-1 text-[14px] leading-relaxed text-foreground/65">{p.d}</div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ───────────────────────── WORKFLOW — INPUTS → OUTPUTS ───────────────────────── */

function Workflow() {
  const { locale } = useI18n();
  const inputs = [
    { t: ar(locale, "وقائع مادية", "Material facts"), d: ar(locale, "الحدث كما وقع", "The event as it happened") },
    { t: ar(locale, "علاقات تعاقدية", "Contractual relationships"), d: ar(locale, "العقد القائم", "The existing contract") },
    { t: ar(locale, "اتفاقيات مقصودة", "Intended agreements"), d: ar(locale, "الرغبة بترتيب تعاقدي", "The deal to be structured") },
  ];
  const outputs = [
    { t: ar(locale, "استشارة قانونية", "Legal consultation"), d: ar(locale, "رأي منظم مستند إلى مواد القانون الأردني", "A structured opinion grounded in Jordanian statute") },
    { t: ar(locale, "لائحة دعوى", "Statement of claim"), d: ar(locale, "التكييف · موضوع الدعوى · الطلبات · البينات", "Characterization · subject · requests · evidence list") },
    { t: ar(locale, "لائحة جوابية", "Statement of defense"), d: ar(locale, "رد بندًا ببند + الدفوع + بينات الدفاع", "Point-by-point reply + pleas + defense evidence") },
    { t: ar(locale, "عقد", "Contract"), d: ar(locale, "من نماذج المكتب وبنوده", "From your firm's templates and clauses") },
  ];
  return (
    <Section id="workflow" className="bg-pearl/40">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>{ar(locale, "سير العمل", "How it works")}</Eyebrow>
        <h2 className="mt-5 font-serif text-3xl leading-[1.05] tracking-[-0.02em] md:text-[2.5rem]">
          {ar(locale, "من الوقائع إلى المحكمة — ", "From the facts to the courtroom — ")}
          <em className="not-italic [font-style:italic] text-gilded">{ar(locale, "كما يعمل المحامي فعلاً", "the way lawyers actually work")}</em>
        </h2>
        <p className="mt-6 text-[16px] leading-[1.85] text-foreground/70">
          {ar(
            locale,
            "المحاماة مدخلات ومخرجات. المدخلات: وقائع مادية، أو علاقة تعاقدية قائمة، أو رغبة بترتيب اتفاق. والمخرجات: استشارة، أو عقد، أو لائحة دعوى، أو لائحة جوابية. محكم ليس أداة عامة أُلبست ثوباً قانونياً — إنه مبني على هذه المعادلة بالضبط.",
            "Law is inputs and outputs. Inputs: material facts, an existing contractual relationship, or an intended agreement. Outputs: a consultation, a contract, a statement of claim, or a statement of defense. Mohkam isn't a general tool dressed in legal clothing — it is built on exactly this equation.",
          )}
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="text-[10px] uppercase tracking-[0.32em] text-gold">{ar(locale, "المدخلات", "Inputs")}</div>
          <ul className="mt-6 space-y-4">
            {inputs.map((r) => (
              <li key={r.t} className="flex gap-4">
                <SealFrame tone="gold"><FileText className="size-4" /></SealFrame>
                <div>
                  <div className="font-serif text-lg">{r.t}</div>
                  <div className="text-[14px] text-foreground/60">{r.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-gold/40 bg-onyx p-8 text-pearl">
          <div className="text-[10px] uppercase tracking-[0.32em] text-gold">{ar(locale, "المخرجات", "Outputs")}</div>
          <ul className="mt-6 space-y-4">
            {outputs.map((r) => (
              <li key={r.t} className="flex gap-4">
                <SealFrame tone="gold"><IconScroll size={16} /></SealFrame>
                <div>
                  <div className="font-serif text-lg text-pearl">{r.t}</div>
                  <div className="text-[14px] text-pearl/65">{r.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-3xl text-center text-[15px] leading-[1.85] text-foreground/70">
        {ar(
          locale,
          "معالج لائحة الدعوى يقودك خطوة بخطوة: الأطراف ← الوقائع ← التكييف القانوني ← موضوع الدعوى وسندها ← الطلبات ← قائمة البينات — وكل بينة مرتبطة بمستند في ملف القضية مع ترقيم المبرزات تلقائياً. وتأتي معك مكتبة نماذج أردنية للوائح والعقود قابلة للتعديل حسب أسلوب مكتبك ومحفوظة بإصداراتها.",
          "The claim wizard walks you through it: parties → facts → legal characterization → subject & basis → requests → evidence list — each item of evidence linked to a document in the case file with automatic exhibit numbering. A Jordanian template library for pleadings and contracts covers the common scenarios, editable to your firm's style and version-controlled.",
        )}
      </p>
    </Section>
  );
}

/* ───────────────────────── PLATFORM — SIX REAL MODULES ───────────────────────── */

function Platform() {
  const { locale } = useI18n();
  const modules = [
    { icon: IconScales, tag: "01", title: ar(locale, "إدارة القضايا", "Case Management"), desc: ar(locale, "ملف قضية موحّد: الأطراف، الجلسات، المستندات، الملاحظات، المصاريف، الفريق.", "One unified case file: parties, hearings, documents, notes, expenses, team.") },
    { icon: Users, tag: "02", title: ar(locale, "الموكلون", "Clients"), desc: ar(locale, "دليل الموكلين مع فحص تعارض المصالح قبل قبول أي قضية.", "Client directory with conflict-of-interest checks before any matter is accepted.") },
    { icon: Bell, tag: "03", title: ar(locale, "المواعيد والجلسات", "Deadlines & Hearings"), desc: ar(locale, "تقويم المحاكم والمهل القانونية، وتنبيهات قبل ٧ و٣ أيام ويوم الاستحقاق.", "Court calendar and statutory limits, with alerts 7 and 3 days out and on the day.") },
    { icon: Coins, tag: "04", title: ar(locale, "الفوترة والمالية", "Billing & Finance"), desc: ar(locale, "عروض أسعار وفواتير بالدينار، ضريبة ١٦٪، جداول أقساط، وتسجيل الدفعات.", "Quotes and JOD invoices at 16% GST, installment schedules, payment recording.") },
    { icon: IconSeal, tag: "05", title: ar(locale, "تحصيل الديون", "Debt Collection"), desc: ar(locale, "إيجارات وقروض وأقساط، تذكيرات آلية، وتتبع المحصَّل والمحوَّل والعمولات.", "Rent, loans and installments with automated reminders and collected / forwarded / fee tracking.") },
    { icon: IconScroll, tag: "06", title: ar(locale, "الصياغة والبحث القانوني", "Drafting & Legal Research"), desc: ar(locale, "مخرجات المحامي الأردني جاهزة — بمراجعة المحامي دائماً.", "The Jordanian lawyer's outputs, ready — always lawyer-reviewed.") },
  ];
  return (
    <section id="platform" className="relative border-b border-border bg-background">
      <LatticeDivider className="absolute inset-x-0 -top-5 z-10" />
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="mb-14 grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Eyebrow>{ar(locale, "المنصة", "The Platform")}</Eyebrow>
            <h2 className="mt-5 font-serif text-3xl leading-[1.05] tracking-[-0.02em] md:text-[2.5rem]">
              {ar(locale, "منصة واحدة، ", "One platform, ")}
              <em className="not-italic [font-style:italic] text-gilded">{ar(locale, "ستة أنظمة تعمل من نفس البيانات", "six systems on the same data")}</em>
            </h2>
          </div>
          <div className="lg:col-span-4">
            <p className="text-[16px] leading-[1.8] text-foreground/70">
              {ar(locale, "لا تبديل أدوات، لا فقدان سياق — كل شيء يرجع إلى ملف القضية.", "No tool-switching, no lost context — everything resolves back to the case file.")}
            </p>
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
              className="group relative flex flex-col justify-between overflow-hidden bg-background p-6 transition-all duration-500 hover:bg-onyx hover:text-pearl sm:p-8"
            >
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.32em] text-foreground/40 group-hover:text-gold">
                    {m.tag} / {m.title}
                  </span>
                  <SealFrame tone="gold" className="transition-transform duration-500 group-hover:rotate-6">
                    <m.icon className="size-4" />
                  </SealFrame>
                </div>
                <h3 className="mt-8 font-serif text-[1.5rem] leading-[1.15] tracking-[-0.015em] text-foreground group-hover:text-pearl sm:text-[1.75rem]">
                  {m.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/65 group-hover:text-pearl/70">
                  {m.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── JORDAN COMPLIANCE (THE WEDGE) ───────────────────────── */

function Compliance() {
  const { locale } = useI18n();
  const items = [
    {
      t: ar(locale, "الفوترة الوطنية", "National billing"),
      d: ar(
        locale,
        "فوترة بالدينار وضريبة ١٦٪ وتسلسل فواتير نظامي، ومسار جاهزية معلن للربط مع نظام الفوترة الوطني JoFotara.",
        "JOD invoicing at 16% GST with compliant sequencing, and a published readiness path to JoFotara integration.",
      ),
      note: ar(
        locale,
        "عند إتمام الربط: «فواتير معتمدة عبر JoFotara برمز QR من دائرة ضريبة الدخل والمبيعات».",
        "Swap-in once live: ISTD-validated JoFotara invoices with QR codes.",
      ),
    },
    {
      t: ar(locale, "حماية البيانات الشخصية", "Personal data protection"),
      d: ar(
        locale,
        "التزام بقانون رقم ٢٤ لسنة ٢٠٢٣: عزل بيانات كل مكتب، سجل نشاط غير قابل للتعديل، وإفصاح عن مكان الاستضافة ومعالجي البيانات في اتفاقية معالجة البيانات.",
        "Committed to PDPL No. 24/2023: firm-level data isolation, an immutable activity log, and hosting location and data processors disclosed in a Data Processing Agreement.",
      ),
    },
    {
      t: ar(locale, "الرسائل النصية", "SMS"),
      d: ar(
        locale,
        "إرسال متوافق مع تعليمات هيئة تنظيم قطاع الاتصالات: معرّف مرسل مسجّل، ساعات هدوء، حد يومي لكل مستلم، وقائمة إلغاء اشتراك.",
        "TRC-compliant sending: registered sender ID, quiet hours, a daily cap per recipient, and an opt-out list.",
      ),
    },
    {
      t: ar(locale, "المستندات الرسمية", "Official documents"),
      d: ar(
        locale,
        "التاريخ الهجري والميلادي معاً، ومخرجات ثنائية اللغة بترويسة المكتب وبياناته الضريبية.",
        "Hijri and Gregorian dates together, and bilingual outputs on your firm's letterhead with its tax details.",
      ),
    },
  ];
  return (
    <Section id="compliance" className="bg-background">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>{ar(locale, "الامتثال", "Compliance")}</Eyebrow>
        <h2 className="mt-5 font-serif text-3xl leading-[1.05] tracking-[-0.02em] md:text-[2.5rem]">
          {ar(locale, "مبني ", "Built ")}
          <em className="not-italic [font-style:italic] text-gilded">{ar(locale, "للامتثال الأردني", "for Jordanian compliance")}</em>
          {ar(locale, " — لا مترجَم إليه", ", not translated to it")}
        </h2>
        <p className="mt-6 text-[16px] leading-[1.85] text-foreground/70">
          {ar(
            locale,
            "الأدوات العالمية تضيف العربية كترجمة. محكم يبدأ من القانون الأردني ومتطلباته — والتزامنا معلن، وحالة كل بند مفصح عنها بدقة.",
            "Global tools add Arabic as a translation. Mohkam starts from Jordanian law and its requirements — our commitments are stated, and the status of each is disclosed precisely.",
          )}
        </p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {items.map((i) => (
          <div key={i.t} className="rounded-2xl border border-border bg-card p-7">
            <div className="flex items-center gap-3">
              <SealFrame tone="gold"><ShieldCheck className="size-4" /></SealFrame>
              <div className="font-serif text-xl">{i.t}</div>
            </div>
            <p className="mt-4 text-[14.5px] leading-relaxed text-foreground/70">{i.d}</p>
            {i.note && <p className="mt-3 text-[12.5px] italic text-foreground/50">{i.note}</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── COLLECTIONS SPOTLIGHT ───────────────────────── */

function Collections() {
  const { locale } = useI18n();
  const bullets = [
    ar(locale, "قضايا إيجار وقروض وأقساط متكررة", "Rent, loan and recurring installment cases"),
    ar(locale, "حتى ٢٥ مدفوعاً في القضية الواحدة", "Up to 25 payers per case"),
    ar(locale, "خطط سداد ٣ أو ٦ أو ١٢ قسطاً", "3-, 6- or 12-installment payment plans"),
    ar(locale, "تذكيرات آلية قبل الاستحقاق وعنده وبعده", "Automated reminders before, on and after due dates"),
    ar(locale, "تتبع المحصَّل والمحوَّل وعمولات المكتب", "Collected vs. forwarded vs. firm-fee tracking"),
    ar(locale, "سجل رسائل كامل لكل قضية", "A full message log per case"),
  ];
  return (
    <section id="collections" className="relative border-b border-onyx/40 bg-onyx text-pearl">
      <LatticeDivider className="absolute inset-x-0 -top-5 z-10" />
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>{ar(locale, "التميّز", "The differentiator")}</Eyebrow>
            <h2 className="mt-5 font-serif text-3xl leading-[1.05] tracking-[-0.02em] text-pearl md:text-[2.5rem]">
              {ar(locale, "التحصيل: ", "Collections: ")}
              <em className="not-italic [font-style:italic] text-gilded">{ar(locale, "الوحدة التي لا يملكها أحد غيرنا", "the module no one else has")}</em>
            </h2>
            <p className="mt-6 text-[16px] leading-[1.85] text-pearl/70">
              {ar(
                locale,
                "في الممارسة الأردنية، التحصيل عمل يومي: إيجارات، أقساط، ديون متعثرة. لا Lexzur ولا أي منصة إقليمية تملك وحدة مخصصة له — محكم يملكها.",
                "In Jordanian practice, collections is daily work — rents, installments, delinquent debts. Neither Lexzur nor any regional platform ships a dedicated module for it. Mohkam does.",
              )}
            </p>
          </div>
          <div className="lg:col-span-7">
            <ul className="grid gap-3 sm:grid-cols-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 rounded-xl border border-pearl/10 bg-white/[0.03] p-4">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span className="text-[14.5px] text-pearl/85">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── AI HONEST FRAMING ───────────────────────── */

function AiSection() {
  const { locale } = useI18n();
  const items = [
    { t: ar(locale, "بحث قانوني أردني", "Jordanian legal research"), d: ar(locale, "إجابات مستندة إلى المواد، مع نطاق مصادر معلن وروابط للنص الرسمي. إذا كان السؤال خارج نطاق المصادر، يقولها النظام بوضوح بدل التخمين.", "Article-grounded answers with a disclosed source scope and links to the official text. When a question falls outside the corpus, the system says so instead of guessing.") },
    { t: ar(locale, "صياغة مؤسسة على مستنداتك", "Drafting grounded in your documents"), d: ar(locale, "المسودات تُبنى حصراً على نماذج مكتبك والمستندات المرفوعة — لا تأليف حرّ.", "Drafts are built strictly from your firm's templates and uploaded documents — no free invention.") },
    { t: ar(locale, "تفريغ بالعربية", "Arabic transcription"), d: ar(locale, "تسجيل وتفريغ الجلسات والاجتماعات، مرتبطاً بملف القضية.", "Record and transcribe hearings and meetings, linked to the case file.") },
  ];
  return (
    <Section id="ai" className="bg-background">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>{ar(locale, "الذكاء", "AI")}</Eyebrow>
        <h2 className="mt-5 font-serif text-3xl leading-[1.05] tracking-[-0.02em] md:text-[2.5rem]">
          {ar(locale, "ذكاء داخل سير العمل — ", "Intelligence inside the workflow — ")}
          <em className="not-italic [font-style:italic] text-gilded">{ar(locale, "لا منفصل عنه", "not beside it")}</em>
        </h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {items.map((i) => (
          <div key={i.t} className="rounded-2xl border border-border bg-card p-7">
            <SealFrame tone="gold"><Sparkles className="size-4" /></SealFrame>
            <div className="mt-4 font-serif text-xl">{i.t}</div>
            <p className="mt-2 text-[14.5px] leading-relaxed text-foreground/65">{i.d}</p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-3xl text-center font-serif text-lg italic text-foreground/75">
        {ar(locale, "كل مخرجات الذكاء مسودات — تتطلب مراجعة محامٍ مؤهل قبل الاستخدام.", "Every AI output is a draft — it requires review by a qualified lawyer before use.")}
      </p>
    </Section>
  );
}

/* ───────────────────────── HONESTY BLOCK ───────────────────────── */

function Honesty() {
  const { locale } = useI18n();
  return (
    <Section id="honesty" className="bg-pearl/40">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>{ar(locale, "الصراحة", "Honesty")}</Eyebrow>
        <h2 className="mt-5 font-serif text-3xl leading-[1.05] tracking-[-0.02em] md:text-[2.5rem]">
          {ar(locale, "ما ", "What ")}
          <em className="not-italic [font-style:italic] text-gilded">{ar(locale, "لا ندّعيه", "we don't claim")}</em>
        </h2>
        <p className="mt-6 text-[16px] leading-[1.9] text-foreground/75">
          {ar(
            locale,
            "سوق التقنية القانونية مليء بالشعارات المستعارة والأرقام المنفوخة. نحن نلتزم بخلاف ذلك: لا ندّعي اعتماداً من جهة لم تعتمدنا، ولا شهادات لم نحصل عليها بعد، ولا تغطية لمصادر لا نغطيها. ما نلتزم به نعلنه، وما هو قيد العمل نفصح عن حالته بدقة. ثقة المحامي تُبنى كما تُبنى القضية: بالبيّنة.",
            "Legal tech is full of borrowed logos and inflated numbers. We commit to the opposite: no endorsements we haven't earned, no certifications we don't yet hold, no coverage of sources we don't cover. What we commit to, we state; what's in progress, we disclose precisely. A lawyer's trust is built the way a case is built — on evidence.",
          )}
        </p>
      </div>
    </Section>
  );
}

/* ───────────────────────── SECURITY ───────────────────────── */

function Security() {
  const { locale } = useI18n();
  return (
    <Section id="security" className="bg-background">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>{ar(locale, "الأمان", "Security")}</Eyebrow>
          <h2 className="mt-5 font-serif text-2xl leading-[1.1] tracking-[-0.02em] md:text-3xl">
            {ar(locale, "بنية أمان تليق بمكاتب المحاماة", "Security posture built for law firms")}
          </h2>
        </div>
        <ul className="grid gap-3 text-[14.5px] leading-relaxed text-foreground/75 lg:col-span-7 sm:grid-cols-2">
          {[
            ar(locale, "مساحات معزولة لكل مؤسسة", "Org-scoped workspaces"),
            ar(locale, "صلاحيات حسب الدور (مالك، شريك، محامٍ، مساعد قانوني، دعم)", "Role-based access (Owner, Partner, Lawyer, Paralegal, Support)"),
            ar(locale, "سجل نشاط غير قابل للتعديل", "Immutable activity log"),
            ar(locale, "تسجيل خروج تلقائي بعد الخمول", "Idle auto-logout"),
            ar(locale, "تخزين مستندات محمي", "Protected document storage"),
            ar(locale, "الشهادات الرسمية ضمن خارطة الطريق، ويتم الإفصاح عن حالتها بشفافية", "Formal certifications are on the roadmap, with status disclosed transparently"),
          ].map((s) => (
            <li key={s} className="flex items-start gap-2 rounded-lg border border-border bg-card p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ───────────────────────── WHO IT'S FOR ───────────────────────── */

function WhoFor() {
  const { locale } = useI18n();
  const cards = [
    { t: ar(locale, "المحامون الأفراد", "Solo lawyers"), d: ar(locale, "أقل عمل إداري؛ الممارسة كلها في مكان واحد.", "Less admin; the whole practice in one place.") },
    { t: ar(locale, "المكاتب الصغيرة", "Small firms"), d: ar(locale, "مساحة مشتركة للقضايا والجلسات والفوترة وعمل الموكلين.", "One shared space for cases, hearings, billing and client work.") },
    { t: ar(locale, "المكاتب النامية", "Growing firms"), d: ar(locale, "رؤية كاملة، أدوار وصلاحيات، وجاهزية للتوسع.", "Full visibility, roles and permissions, ready to scale.") },
  ];
  return (
    <Section id="who" className="bg-pearl/40">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>{ar(locale, "لمن هو محكم", "Who it's for")}</Eyebrow>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.t} className="rounded-2xl border border-border bg-card p-8 text-center">
            <SealFrame tone="gold" className="mx-auto"><Building2 className="size-4" /></SealFrame>
            <div className="mt-4 font-serif text-xl">{c.t}</div>
            <p className="mt-2 text-[14.5px] leading-relaxed text-foreground/65">{c.d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── PRICING ───────────────────────── */

function Pricing() {
  const { locale } = useI18n();
  const plans = [
    {
      name: ar(locale, "البداية", "Starter"),
      audience: ar(locale, "للمحامي الفرد", "Solo lawyers"),
      bullets: [
        ar(locale, "القضايا والموكلون", "Cases & clients"),
        ar(locale, "المستندات والمواعيد", "Documents & deadlines"),
        ar(locale, "فوترة أساسية بالدينار", "Basic JOD billing"),
        ar(locale, "مساحة ثنائية اللغة", "Bilingual workspace"),
      ],
      cta: ar(locale, "اطلب البداية", "Request Starter"),
    },
    {
      name: ar(locale, "النمو", "Growth"),
      audience: ar(locale, "للمكاتب الصغيرة والنامية", "Small & growing firms"),
      bullets: [
        ar(locale, "كل ما في البداية", "Everything in Starter"),
        ar(locale, "الفريق والصلاحيات", "Team & role permissions"),
        ar(locale, "تتبع الوقت والتحصيل", "Time tracking & collections"),
        ar(locale, "سجل النشاط ولوحة متقدمة", "Activity log & advanced dashboard"),
      ],
      cta: ar(locale, "اطلب النمو", "Request Growth"),
      recommended: true,
    },
    {
      name: ar(locale, "برو", "Pro"),
      audience: ar(locale, "للمكاتب التي تريد الذكاء", "Firms that want AI"),
      bullets: [
        ar(locale, "كل ما في النمو", "Everything in Growth"),
        ar(locale, "البحث القانوني بالذكاء", "AI legal research"),
        ar(locale, "صياغة اللوائح والعقود", "Pleading & contract drafting"),
        ar(locale, "تحليلات متقدمة وإعداد بأولوية", "Advanced analytics & priority onboarding"),
      ],
      cta: ar(locale, "اطلب برو", "Request Pro"),
    },
  ];
  return (
    <Section id="pricing" className="bg-background">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>{ar(locale, "الأسعار", "Pricing")}</Eyebrow>
        <h2 className="mt-5 font-serif text-3xl leading-[1.05] tracking-[-0.02em] md:text-[2.5rem]">
          {ar(locale, "أسعار بيتا مبكرة ", "Early-beta pricing ")}
          <em className="not-italic [font-style:italic] text-gilded">{ar(locale, "بالدينار الأردني", "in Jordanian dinars")}</em>
        </h2>
        <p className="mt-6 text-[16px] leading-[1.85] text-foreground/70">
          {ar(locale, "حسب حجم المكتب وعدد المستخدمين. الأسعار متاحة بالطلب خلال البيتا، وعدد المقاعد محدود في كل دفعة.", "By firm size and seats. Pricing on request during beta; limited seats per cohort.")}
        </p>
      </div>
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-2xl border p-7 ${p.recommended ? "border-gold/60 bg-onyx text-pearl shadow-[0_20px_50px_-20px_color-mix(in_oklch,var(--gold),transparent_50%)]" : "border-border bg-card"}`}
          >
            {p.recommended && (
              <div className="absolute -top-3 start-6 rounded-full bg-gold px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-gold-foreground">
                {ar(locale, "موصى به", "Recommended")}
              </div>
            )}
            <div className="font-serif text-2xl">{p.name}</div>
            <div className={`mt-1 text-[13px] ${p.recommended ? "text-pearl/60" : "text-foreground/55"}`}>{p.audience}</div>
            <ul className={`mt-6 space-y-2 text-[14.5px] ${p.recommended ? "text-pearl/85" : "text-foreground/75"}`}>
              {p.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant={p.recommended ? "gold" : "outline"} className="mt-8">
              <a href="#beta">{p.cta}</a>
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── BETA FORM ───────────────────────── */

function Beta() {
  const { locale } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const bullets = [
    ar(locale, "تنظيم القضايا والمستندات في ملف واحد", "Cases and documents in one file"),
    ar(locale, "تتبّع مواعيد أكثر موثوقية", "More reliable deadline tracking"),
    ar(locale, "فوترة احترافية بالدينار", "Professional JOD billing"),
    ar(locale, "تحصيل منظم بتذكيرات آلية", "Systematic collections with automatic reminders"),
    ar(locale, "اختبار الصياغة والبحث بالذكاء", "Early access to AI drafting & research"),
  ];
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // Best-effort mailto submission — the CTA is documented as "we reply within two working days".
    const fd = new FormData(e.currentTarget);
    const body = Array.from(fd.entries()).map(([k, v]) => `${k}: ${v}`).join("%0D%0A");
    window.location.href = `mailto:hello@mohkamlaw.com?subject=Beta%20request&body=${body}`;
    setTimeout(() => {
      setSubmitting(false);
      toast.success(ar(locale, "تم استلام طلبك — سنعاود التواصل خلال يومي عمل.", "Request received — we reply within two working days."));
      (e.target as HTMLFormElement).reset();
    }, 500);
  }
  return (
    <Section id="beta" className="bg-pearl/40">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>{ar(locale, "البيتا الخاصة", "Private beta")}</Eyebrow>
          <h2 className="mt-5 font-serif text-3xl leading-[1.05] tracking-[-0.02em] md:text-[2.5rem]">
            {ar(locale, "انضم للبيتا ", "Join the ")}
            <em className="not-italic [font-style:italic] text-gilded">{ar(locale, "الخاصة", "private beta")}</em>
          </h2>
          <p className="mt-6 text-[16px] leading-[1.85] text-foreground/70">
            {ar(
              locale,
              "وصول مبكر لمحامين ومكاتب مختارة في الأردن. أعضاء البيتا لا يجربون المنتج فحسب — بل يشاركون في تشكيله.",
              "Early access for selected Jordanian lawyers and firms. Beta members don't just try the product — they shape it.",
            )}
          </p>
          <ul className="mt-6 space-y-2 text-[14.5px] text-foreground/75">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />{b}</li>
            ))}
          </ul>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-7 lg:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label={ar(locale, "الاسم الكامل", "Full name")} required />
            <Field name="firm" label={ar(locale, "اسم المكتب", "Firm name")} required />
            <Field name="email" type="email" label={ar(locale, "البريد الإلكتروني", "Email")} required />
            <Field name="phone" label={ar(locale, "الهاتف (+٩٦٢)", "Phone (+962)")} placeholder="+962" required />
            <div className="sm:col-span-1">
              <label className="mb-1.5 block text-[12px] uppercase tracking-[0.2em] text-foreground/55">{ar(locale, "حجم المكتب", "Firm size")}</label>
              <select name="size" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                {[
                  ar(locale, "فرد", "Solo"),
                  "2–5",
                  "6–15",
                  ar(locale, "+١٦", "16+"),
                ].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <Field name="practice" label={ar(locale, "مجال الممارسة الرئيسي", "Main practice area")} required />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[12px] uppercase tracking-[0.2em] text-foreground/55">{ar(locale, "أكبر تحدٍ حالياً", "Biggest current challenge")}</label>
              <textarea name="challenge" rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <Button type="submit" variant="gold" size="lg" className="mt-6 h-12 w-full text-[12px] uppercase tracking-[0.24em]" disabled={submitting}>
            {ar(locale, "اطلب الوصول للبيتا", "Request beta access")}
          </Button>
          <p className="mt-3 text-center text-[12px] text-foreground/55">
            {ar(locale, "نرد خلال يومي عمل · عدد المقاعد محدود في كل دفعة", "We reply within two working days · Limited seats per cohort")}
          </p>
        </form>
      </div>
    </Section>
  );
}

function Field({ name, label, type = "text", required, placeholder }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] uppercase tracking-[0.2em] text-foreground/55">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
      />
    </div>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */

function FAQ() {
  const { locale } = useI18n();
  const qs: [string, string][] = [
    [
      ar(locale, "هل محكم للمحامين أم للعموم؟", "Is Mohkam for lawyers or the public?"),
      ar(locale, "للمحامين والمكاتب فقط: القضايا، الموكلون، المستندات، المواعيد، الفوترة، التحصيل، الصياغة.", "Lawyers and firms only: cases, clients, documents, deadlines, billing, collections, drafting."),
    ],
    [
      ar(locale, "هل يحل محكم محلّ المحامي؟", "Does Mohkam replace the lawyer?"),
      ar(locale, "لا. كل مخرجات الذكاء مسودات تتطلب مراجعة محامٍ مؤهل.", "No. Every AI output is a draft requiring review by a qualified lawyer."),
    ],
    [
      ar(locale, "هل الفواتير معتمدة ضريبياً؟", "Are the invoices tax-valid?"),
      ar(locale, "الفوترة بالدينار وبضريبة ١٦٪، والربط مع نظام الفوترة الوطني JoFotara ضمن خارطة طريق معلنة؛ نفصح عن الحالة بدقة قبل أي التزام.", "JOD billing at 16% GST; JoFotara integration is on a published roadmap, and we disclose its exact status before any commitment."),
    ],
    [
      ar(locale, "أين تُستضاف بياناتي؟", "Where is my data hosted?"),
      ar(locale, "نفصح عن مكان الاستضافة وقائمة معالجي البيانات في اتفاقية معالجة البيانات، وفق قانون حماية البيانات رقم ٢٤ لسنة ٢٠٢٣.", "Hosting location and the full processor list are disclosed in our Data Processing Agreement, per PDPL No. 24/2023."),
    ],
    [
      ar(locale, "هل بيانات مكتبي معزولة عن المكاتب الأخرى؟", "Is my firm's data isolated from other firms?"),
      ar(locale, "نعم: عزل كامل على مستوى المؤسسة، سجل نشاط غير قابل للتعديل، وصلاحيات حسب الدور.", "Yes: full org-level isolation, an immutable activity log, and role-based access."),
    ],
    [
      ar(locale, "هل يدعم العربية؟", "Does it support Arabic?"),
      ar(locale, "عربي أولاً مع دعم كامل للإنجليزية واتجاه RTL في الواجهات والمستندات.", "Arabic-first with full English support and RTL across UI and documents."),
    ],
    [
      ar(locale, "هل أستطيع الانتقال من نظامي الحالي؟", "Can I migrate from my current system?"),
      ar(locale, "نعم؛ نساعد في استيراد الموكلين والقضايا خلال الإعداد.", "Yes; we assist with client and case import during onboarding."),
    ],
    [
      ar(locale, "متى يتاح محكم؟", "When is Mohkam available?"),
      ar(locale, "بيتا خاصة لمكاتب مختارة في الأردن الآن؛ الانضمام عبر نموذج الطلب.", "Private beta for selected Jordanian firms now; join via the request form."),
    ],
  ];
  return (
    <Section id="faq" className="bg-background">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <Eyebrow>{ar(locale, "الأسئلة الشائعة", "FAQ")}</Eyebrow>
        </div>
        <ul className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
          {qs.map(([q, a]) => (
            <li key={q} className="p-6">
              <div className="font-serif text-lg">{q}</div>
              <p className="mt-2 text-[14.5px] leading-relaxed text-foreground/70">{a}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ───────────────────────── FINAL CTA ───────────────────────── */

function FinalCTA({ Arrow }: { Arrow: ComponentType<{ className?: string }> }) {
  const { locale } = useI18n();
  return (
    <section className="relative border-b border-onyx/40 bg-onyx text-pearl">
      <div aria-hidden className="pointer-events-none absolute inset-0 arabesque-lg opacity-[0.08]" />
      <div className="container relative mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <OrnamentalRule className="mx-auto mb-6 w-28 text-gold" />
        <h2 className="font-serif text-3xl leading-[1.05] tracking-[-0.02em] text-pearl md:text-[2.75rem]">
          {ar(locale, "جاهز ", "Ready ")}
          <em className="not-italic [font-style:italic] text-gilded">{ar(locale, "لتحديث مكتبك؟", "to modernize your firm?")}</em>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.85] text-pearl/70">
          {ar(
            locale,
            "انقل قضاياك وجلساتك وفوترتك وتحصيلك إلى مساحة واحدة مبنية للأردن.",
            "Move your cases, hearings, billing and collections into one workspace built for Jordan.",
          )}
        </p>
        <Button asChild variant="gold" size="lg" className="mt-8 h-12 px-8 text-[12px] uppercase tracking-[0.24em]">
          <a href="#beta">
            {ar(locale, "اطلب الوصول للبيتا", "Request beta access")} <Arrow className="size-4" />
          </a>
        </Button>
      </div>
    </section>
  );
}

/* ───────────────────────── FOOTER ───────────────────────── */

function SiteFooter() {
  const { locale } = useI18n();
  return (
    <footer className="bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <BrandMark />
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-foreground/65">
              {ar(locale, "نظام تشغيل مكاتب المحاماة الأردنية. صُنع في عمّان.", "The operating system for Jordanian law firms. Built in Amman.")}
            </p>
            <div className="mt-6 flex flex-col gap-2 text-[13px] text-foreground/70">
              <a href="mailto:hello@mohkamlaw.com" className="inline-flex items-center gap-2 hover:text-foreground"><Mail className="size-4 text-gold" /> hello@mohkamlaw.com</a>
              <a href="tel:+962" className="inline-flex items-center gap-2 hover:text-foreground"><Phone className="size-4 text-gold" /> +962</a>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 lg:col-span-7">
            <FooterCol title={ar(locale, "المنصة", "Platform")} items={[
              { href: "#platform", label: ar(locale, "المنصة", "Platform") },
              { href: "#workflow", label: ar(locale, "سير العمل", "How it works") },
              { href: "#collections", label: ar(locale, "التحصيل", "Collections") },
              { href: "#pricing", label: ar(locale, "الأسعار", "Pricing") },
            ]} />
            <FooterCol title={ar(locale, "الامتثال والأمان", "Compliance & Security")} items={[
              { href: "#compliance", label: ar(locale, "الامتثال", "Compliance") },
              { href: "#security", label: ar(locale, "الأمان", "Security") },
              { href: "/privacy", label: ar(locale, "سياسة الخصوصية", "Privacy Policy") },
              { href: "/terms", label: ar(locale, "شروط الخدمة", "Terms of Service") },
            ]} />
            <FooterCol title={ar(locale, "الحساب", "Account")} items={[
              { href: "#beta", label: ar(locale, "طلب الوصول", "Request access") },
              { href: "/auth", label: ar(locale, "تسجيل الدخول", "Sign in") },
              { href: "#faq", label: ar(locale, "الأسئلة", "FAQ") },
            ]} />
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-[12px] leading-relaxed text-foreground/55">
          {ar(
            locale,
            "محكم يقدّم أدوات برمجية للمهنيين القانونيين ولا يقدّم استشارات قانونية؛ جميع مخرجات الذكاء الاصطناعي تتطلب مراجعة محامٍ مؤهل.",
            "Mohkam provides software tools for legal professionals and does not provide legal advice; all AI outputs require review by a qualified lawyer.",
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  return (
    <div>
      <div className="mb-3 text-[11px] uppercase tracking-[0.28em] text-foreground/55">{title}</div>
      <ul className="space-y-2 text-[13.5px] text-foreground/75">
        {items.map((i) => (
          <li key={i.href}>
            {i.href.startsWith("/") ? (
              <Link to={i.href} className="hover:text-foreground">{i.label}</Link>
            ) : (
              <a href={i.href} className="hover:text-foreground">{i.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
