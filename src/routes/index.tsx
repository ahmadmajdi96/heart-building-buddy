import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";
import { motion } from "framer-motion";
import logoSrc from "@/assets/mohkam-logo.jpeg";
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
  Users,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Gem,
  Scale,
  BookOpen,
  Layers,
  Activity,
  Globe2,
  Mail,
  Phone,
  Building2,
  Star,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mohkam محكم — The OS for Arab Law Firms" },
      {
        name: "description",
        content:
          "Mohkam brings cases, clients, documents, deadlines, billing and legal AI into one bilingual workspace built for law firms in Jordan and the Arab world.",
      },
      { property: "og:title", content: "Mohkam محكم — The OS for Arab Law Firms" },
      {
        property: "og:description",
        content:
          "One bilingual platform for cases, clients, deadlines, JOD invoicing and legal AI — built for Arab law firms.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

/* ───────────────────────── helpers ───────────────────────── */

const ar = (locale: string, a: string, e: string) => (locale === "ar" ? a : e);

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.32em] text-gold">
      <span className="inline-block h-px w-6 bg-gold" />
      {children}
    </span>
  );
}

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative border-b border-border ${className}`}>
      <div className="container mx-auto max-w-7xl px-6 py-24 lg:py-32">{children}</div>
    </section>
  );
}

/* ───────────────────────── PAGE ───────────────────────── */

function LandingPage() {
  const { dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero Arrow={Arrow} />
      <Trust />
      <Platform Arrow={Arrow} />
      <Problem />
      <Solution />
      <Workflow />
      <Features />
      <AI Arrow={Arrow} />
      <WhyMohkam />
      <Security />
      <Dashboard />
      <WhoFor />
      <Beta />
      <Pricing />
      <Testimonial />
      <FAQ />
      <FinalCTA Arrow={Arrow} />
      <SiteFooter />
    </div>
  );
}

/* ───────────────────────── HEADER ───────────────────────── */

function SiteHeader() {
  const { locale } = useI18n();
  const nav = [
    { href: "#product", label: ar(locale, "المنتج", "Product") },
    { href: "#features", label: ar(locale, "المزايا", "Features") },
    { href: "#ai", label: ar(locale, "الذكاء", "AI") },
    { href: "#security", label: ar(locale, "الأمان", "Security") },
    { href: "#pricing", label: ar(locale, "الأسعار", "Pricing") },
    { href: "#beta", label: ar(locale, "طلب الوصول", "Request Access") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-8 text-[12px] font-medium uppercase tracking-[0.2em] lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-[12px] uppercase tracking-[0.18em]"
          >
            <Link to="/auth">{ar(locale, "تسجيل الدخول", "Sign in")}</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden text-[12px] uppercase tracking-[0.18em] sm:inline-flex"
          >
            <a href="#beta">{ar(locale, "حجز عرض", "Book a Demo")}</a>
          </Button>
          <Button
            asChild
            size="sm"
            variant="gold"
            className="text-[12px] uppercase tracking-[0.18em] shadow-md"
          >
            <a href="#beta">{ar(locale, "النسخة الخاصة", "Request Private Beta")}</a>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ───────────────────────── HERO ───────────────────────── */

function Hero({ Arrow }: { Arrow: ComponentType<{ className?: string }> }) {
  const { locale } = useI18n();
  const cards = [
    { icon: Briefcase, label: ar(locale, "القضايا النشطة", "Active Cases") },
    { icon: CalendarDays, label: ar(locale, "المواعيد القادمة", "Upcoming Deadlines") },
    { icon: Receipt, label: ar(locale, "فواتير ضريبية", "Tax Invoices") },
    { icon: Search, label: ar(locale, "بحث قانوني ذكي", "Legal AI Research") },
    { icon: Lock, label: ar(locale, "مستندات آمنة", "Secure Documents") },
  ];
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 85% -10%, color-mix(in oklch, var(--gold), transparent 78%), transparent 60%), radial-gradient(ellipse 60% 50% at 0% 110%, color-mix(in oklch, var(--primary), transparent 88%), transparent 60%)",
        }}
      />
      <div className="container relative mx-auto max-w-7xl px-6 pb-24 pt-16 lg:pb-32 lg:pt-24">
        <div className="grid items-center gap-16 lg:grid-cols-12">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            <Eyebrow>{ar(locale, "نظام تشغيل المكاتب القانونية", "The Legal Operating System")}</Eyebrow>
            <h1 className="mt-6 font-serif text-[3rem] leading-[1.02] tracking-[-0.02em] text-foreground md:text-[4.5rem] lg:text-[5.5rem]">
              {ar(locale, "نظام التشغيل ", "The operating system for ")}
              <em className="not-italic [font-style:italic] text-gold">
                {ar(locale, "للمكاتب القانونية العربية", "Arab law firms")}
              </em>
            </h1>
            <p className="mt-8 max-w-2xl text-[17px] leading-[1.75] text-foreground/70">
              {ar(
                locale,
                "محكم يجمع القضايا، العملاء، المستندات، المواعيد، الفوترة والذكاء القانوني في منصة ثنائية اللغة مبنية للمكاتب الحديثة في الأردن والعالم العربي.",
                "Mohkam brings cases, clients, documents, deadlines, billing, and legal AI into one bilingual platform built for modern law firms in Jordan and the Arab world.",
              )}
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-foreground/55">
              {ar(
                locale,
                "توقّف عن إدارة مكتبك عبر الملفات الورقية وجداول Excel ومحادثات WhatsApp والأدوات المبعثرة. أدِر سير العمل القانوني الكامل من مساحة واحدة آمنة.",
                "Stop running your practice across paper files, Excel sheets, WhatsApp chats, and disconnected tools. Manage the full legal workflow from one secure workspace.",
              )}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="gold" className="h-12 px-7 text-[12px] uppercase tracking-[0.22em] shadow-lg">
                <a href="#beta">
                  {ar(locale, "النسخة الخاصة", "Request Private Beta")} <Arrow className="size-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-onyx/20 px-7 text-[12px] uppercase tracking-[0.22em] hover:bg-onyx hover:text-pearl">
                <a href="#product">{ar(locale, "كيف يعمل", "See How It Works")}</a>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-foreground/50">
              <Gem className="size-3.5 text-gold" />
              {ar(
                locale,
                "صُنع في الأردن · عربي وإنجليزي · للمحامين والمكاتب",
                "Built in Jordan · Arabic & English · Designed for solo lawyers and law firms",
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative lg:col-span-5"
          >
            <div className="relative rounded-3xl border border-border bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-center pb-6">
                <img src={logoSrc} alt="Mohkam" className="h-44 w-44 object-contain" />
              </div>
              <div className="grid gap-3">
                {cards.map((c, i) => (
                  <motion.div
                    key={c.label}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 hover:border-gold/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-lg bg-onyx text-gold">
                        <c.icon className="size-4" />
                      </div>
                      <div className="text-sm font-medium text-foreground">{c.label}</div>
                    </div>
                    <ArrowUpRight className="size-4 text-foreground/30" />
                  </motion.div>
                ))}
              </div>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-60 blur-3xl"
              style={{ background: "radial-gradient(circle at 60% 40%, color-mix(in oklch, var(--gold), transparent 70%), transparent 70%)" }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── TRUST / MARQUEE ───────────────────────── */

function Trust() {
  const items = ["Jordan Bar", "Amman Counsel", "Aqaba Legal", "Irbid Chambers", "Zarqa Partners", "Petra Law", "Levant Arbitration"];
  return (
    <section className="overflow-hidden border-b border-border bg-onyx py-5 text-pearl/70">
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

/* ───────────────────────── PROBLEM ───────────────────────── */

function Problem() {
  const { locale } = useI18n();
  const points = [
    ar(locale, "ملفات القضايا مبعثرة بين المجلدات وأجهزة الكمبيوتر والمحادثات.", "Case files are stored in folders, laptops, and chat threads."),
    ar(locale, "تتبّع المواعيد يدوياً يخلق ضغطاً ومخاطر.", "Deadlines are tracked manually, creating risk and stress."),
    ar(locale, "الفوترة تتم في Excel، مما يصعّب التحكم بالإيرادات.", "Billing happens in Excel, making revenue hard to control."),
    ar(locale, "المستندات موزّعة بين البريد وWhatsApp والتخزين السحابي.", "Documents are scattered across email, WhatsApp, and cloud drives."),
    ar(locale, "الصياغة والبحث القانوني يستهلكان ساعات من العمل المتكرر.", "Legal drafting and research still take hours of repetitive work."),
    ar(locale, "أصحاب المكاتب يفتقرون لرؤية واضحة للأداء والتحصيل.", "Firm owners lack a clear view of workload, collections, and performance."),
  ];
  return (
    <Section id="product" className="bg-background">
      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>{ar(locale, "المشكلة", "The Problem")}</Eyebrow>
          <h2 className="mt-5 font-serif text-4xl leading-[1.05] tracking-[-0.02em] md:text-5xl">
            {ar(
              locale,
              "المكاتب تعمل على أدوات لم تُصمَّم للقانون",
              "Law firms are still running on tools that were never built for legal work",
            )}
          </h2>
        </div>
        <div className="lg:col-span-7">
          <ul className="grid gap-4">
            {points.map((p, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-4 rounded-xl border border-border bg-pearl/40 p-5"
              >
                <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-onyx text-gold">
                  <span className="text-xs font-semibold">{i + 1}</span>
                </div>
                <p className="text-[15px] leading-relaxed text-foreground/75">{p}</p>
              </motion.li>
            ))}
          </ul>
          <p className="mt-8 font-serif text-2xl italic text-foreground/80">
            {ar(
              locale,
              "النتيجة: وقت ضائع، إيرادات ضائعة، ومخاطر تشغيلية لا داعي لها.",
              "The result: missed time, missed revenue, and unnecessary operational risk.",
            )}
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ───────────────────────── SOLUTION ───────────────────────── */

function Solution() {
  const { locale } = useI18n();
  return (
    <Section className="bg-pearl/40">
      <div className="mx-auto max-w-4xl text-center">
        <Eyebrow>{ar(locale, "الحل", "The Solution")}</Eyebrow>
        <h2 className="mt-6 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
          {ar(locale, "منصة واحدة ", "One platform to ")}
          <em className="not-italic [font-style:italic] text-gold">
            {ar(locale, "لإدارة المكتب بالكامل", "run the whole firm")}
          </em>
        </h2>
        <p className="mt-8 text-[17px] leading-[1.8] text-foreground/70">
          {ar(
            locale,
            "محكم يربط العمل اليومي للمكتب في نظام واحد منظّم. أنشئ قضية، أضف العميل، ارفع المستندات، تتبّع المواعيد، سجّل الوقت، أصدِر فاتورة ضريبية ثنائية اللغة، واستخدم الذكاء الاصطناعي للبحث والصياغة والمراجعة — من نفس مساحة القضية.",
            "Mohkam connects the daily work of a law firm into one organized system. Create a case. Add the client. Upload documents. Track deadlines. Log time. Generate a bilingual tax invoice. Use AI to support research, drafting, and review — all from the same case workspace.",
          )}
        </p>
        <p className="mt-6 text-[15px] text-foreground/55">
          {ar(
            locale,
            "محكم ليس مجرد أداة إنتاجية عامة. إنه مبني حول الطريقة التي يعمل بها المحامي العربي فعلياً.",
            "Mohkam is not another generic productivity tool. It is built around how Arab lawyers actually work.",
          )}
        </p>
      </div>
    </Section>
  );
}

/* ───────────────────────── WORKFLOW ───────────────────────── */

function Workflow() {
  const { locale } = useI18n();
  const steps = [
    { t: ar(locale, "إنشاء ملف العميل", "Create the client profile"), d: ar(locale, "احفظ بيانات العميل وجهات الاتصال والملاحظات والقضايا المرتبطة في مكان واحد.", "Store client information, contact details, notes, and all related cases in one place.") },
    { t: ar(locale, "فتح القضية", "Open the case"), d: ar(locale, "ملف قضية منظّم بالأطراف والجلسات والملاحظات والمواعيد والمستندات وأعضاء الفريق.", "Create a structured case file with parties, sessions, notes, deadlines, documents, and assigned team members.") },
    { t: ar(locale, "تتبّع كل موعد", "Track every deadline"), d: ar(locale, "أضِف الجلسات والإيداعات والاستئنافات والمهام الداخلية مع تنبيهات مسبقة.", "Add hearings, filing dates, follow-ups, appeal deadlines, and internal tasks with alerts before they become urgent.") },
    { t: ar(locale, "تخزين كل مستند", "Store every document"), d: ar(locale, "ارفع العقود والمستندات القضائية والهويات والأدلة والرسائل وملفات PDF داخل ملف القضية.", "Upload contracts, court documents, IDs, evidence, letters, and PDFs directly inside the case file.") },
    { t: ar(locale, "تسجيل الوقت والأتعاب", "Log time and fees"), d: ar(locale, "تتبّع الساعات القابلة وغير القابلة للفوترة لكل قضية ومحامٍ وعميل.", "Track billable and non-billable work per case, per lawyer, and per client.") },
    { t: ar(locale, "إصدار الفواتير", "Generate invoices"), d: ar(locale, "أنشئ عروض أسعار وفواتير ضريبية بالدينار الأردني بشعار المكتب والبيانات القانونية والضريبة.", "Create quotes and JOD tax invoices with your firm logo, legal details, tax calculation, and payment records.") },
    { t: ar(locale, "ذكاء قانوني حيث يهمّ", "Use legal AI where it matters"), d: ar(locale, "اطرح أسئلة بحث، صُغ مستندات، لخّص ملفات، وراجع العقود بإشراف المحامي.", "Ask research questions, draft documents, summarize case materials, and review contracts with lawyer-controlled AI support.") },
  ];
  return (
    <Section className="bg-background">
      <div className="mb-16 grid items-end gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow>{ar(locale, "سير العمل", "Product Workflow")}</Eyebrow>
          <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
            {ar(locale, "من ", "From ")}
            <em className="not-italic [font-style:italic] text-gold">
              {ar(locale, "أوّل اجتماع عميل", "first client intake")}
            </em>
            {ar(locale, " إلى آخر فاتورة", " to final invoice")}
          </h2>
        </div>
      </div>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: (i % 3) * 0.08 }}
            className="group relative bg-background p-8 transition-colors hover:bg-pearl/40"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-5xl italic text-gold/70">{String(i + 1).padStart(2, "0")}</span>
              <span className="h-px w-12 bg-gold transition-all group-hover:w-20" />
            </div>
            <h3 className="mt-6 font-serif text-2xl tracking-tight text-foreground">{s.t}</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-foreground/65">{s.d}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── FEATURES ───────────────────────── */

function Features() {
  const { locale } = useI18n();
  const groups = [
    {
      icon: Briefcase,
      title: ar(locale, "إدارة القضايا", "Case Management"),
      sub: ar(locale, "أدِر كل قضية من مساحة واحدة نظيفة.", "Manage every matter from one clean workspace."),
      items: [
        ar(locale, "قائمة وتفاصيل القضايا", "Cases list and case details"),
        ar(locale, "الأطراف وبيانات الاتصال", "Case parties and contact information"),
        ar(locale, "الملاحظات وسجل الجلسات", "Case notes and session history"),
        ar(locale, "المواعيد والتنبيهات", "Deadlines and alerts"),
        ar(locale, "تتبّع الوقت لكل قضية", "Time tracking per case"),
        ar(locale, "أعضاء الفريق المعيّنون", "Assigned team members"),
      ],
    },
    {
      icon: Users,
      title: ar(locale, "إدارة العملاء", "Client Management"),
      sub: ar(locale, "اربط بيانات العملاء بعمل قانوني حقيقي.", "Keep all client information connected to real legal work."),
      items: [
        ar(locale, "دليل العملاء", "Client directory"),
        ar(locale, "ملفات العملاء", "Client profiles"),
        ar(locale, "بيانات الاتصال", "Contact information"),
        ar(locale, "القضايا المرتبطة", "Related cases"),
        ar(locale, "ملاحظات العميل", "Client notes"),
      ],
    },
    {
      icon: FileText,
      title: ar(locale, "المستندات", "Documents"),
      sub: ar(locale, "ملفات منظّمة وآمنة ومرتبطة بكل قضية.", "Keep legal files organized, secure, and connected to each case."),
      items: [
        ar(locale, "رفع المستندات", "Document upload"),
        ar(locale, "معاينة PDF", "PDF preview"),
        ar(locale, "إصدارات المستندات", "Document versions"),
        ar(locale, "تخزين مرتبط بالقضية", "Case-linked storage"),
        ar(locale, "مشاركة آمنة", "Secure sharing options"),
        ar(locale, "سجل ملفات منظّم", "Organized file history"),
      ],
    },
    {
      icon: CalendarDays,
      title: ar(locale, "التقويم والمواعيد", "Calendar & Deadlines"),
      sub: ar(locale, "قلّل خطر المواعيد المفقودة.", "Reduce the risk of missed dates."),
      items: [
        ar(locale, "عرض التقويم", "Calendar view"),
        ar(locale, "الجلسات والمواعيد", "Hearings and appointments"),
        ar(locale, "تذكيرات المواعيد", "Deadline reminders"),
        ar(locale, "تنبيهات قادمة ومتأخرة", "Upcoming and overdue alerts"),
        ar(locale, "رؤية لجدول المكتب", "Firm-wide schedule visibility"),
      ],
    },
    {
      icon: Receipt,
      title: ar(locale, "الفوترة والمالية", "Billing & Financials"),
      sub: ar(locale, "حوّل العمل القانوني إلى إيرادات واضحة.", "Turn legal work into clear, trackable revenue."),
      items: [
        ar(locale, "عروض الأسعار", "Quotes"),
        ar(locale, "فواتير ضريبية بالدينار", "Tax invoices in JOD"),
        ar(locale, "دعم ضريبة 16%", "16% tax support"),
        ar(locale, "تسجيل الدفعات", "Payment recording"),
        ar(locale, "جداول السداد", "Payment schedules"),
        ar(locale, "PDF بترويسة المكتب", "PDF generation with firm header"),
      ],
    },
    {
      icon: Building2,
      title: ar(locale, "إدارة الفريق", "Team Management"),
      sub: ar(locale, "مبنية للمحامي الفرد وللمكاتب النامية.", "Built for solo lawyers and growing firms."),
      items: [
        ar(locale, "حسابات محامين أفراد", "Solo lawyer accounts"),
        ar(locale, "حسابات مكاتب", "Law firm accounts"),
        ar(locale, "دعوات الفريق", "Team invitations"),
        ar(locale, "صلاحيات حسب الدور", "Role-based access"),
        ar(locale, "أدوار: مالك، شريك، محامي، مساعد…", "Owner, partner, associate, paralegal…"),
        ar(locale, "مساحات عمل مشتركة", "Shared workspaces"),
      ],
    },
  ];
  return (
    <Section id="features" className="bg-pearl/40">
      <div className="mb-16 grid items-end gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow>{ar(locale, "المزايا الأساسية", "Core Features")}</Eyebrow>
          <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
            {ar(
              locale,
              "كل ما يحتاجه مكتبك ليبقى منظّماً",
              "Everything your firm needs to stay organized",
            )}
          </h2>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g, i) => (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: (i % 3) * 0.08 }}
            className="group relative rounded-2xl border border-border bg-background p-7 transition-all hover:-translate-y-1 hover:border-gold/60 hover:shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-onyx text-gold">
                <g.icon className="size-5" />
              </div>
              <h3 className="font-serif text-2xl tracking-tight">{g.title}</h3>
            </div>
            <p className="mt-3 text-sm text-foreground/65">{g.sub}</p>
            <ul className="mt-5 space-y-2">
              {g.items.map((it) => (
                <li key={it} className="flex items-start gap-2 text-[13.5px] text-foreground/75">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
                  {it}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── AI ───────────────────────── */

function AI({ Arrow }: { Arrow: ComponentType<{ className?: string }> }) {
  const { locale } = useI18n();
  const supports = [
    ar(locale, "البحث القانوني الأردني", "Jordanian legal research"),
    ar(locale, "الصياغة القانونية", "Legal drafting"),
    ar(locale, "مراجعة العقود", "Contract review"),
    ar(locale, "تلخيص القضايا", "Case summarization"),
    ar(locale, "فرز طلبات الاستقبال", "Intake triage"),
    ar(locale, "استخراج المواعيد", "Deadline extraction"),
    ar(locale, "تحليل المستندات", "Document analysis"),
  ];
  const cards = [
    { icon: Search, t: ar(locale, "بحث AI", "AI Research"), d: ar(locale, "اطرح أسئلة قانونية واحصل على إجابات منظّمة مستندة إلى المواد المرجعية.", "Ask legal questions and receive structured answers grounded in relevant legal materials.") },
    { icon: Sparkles, t: ar(locale, "صياغة عقود AI", "AI Contract Drafting"), d: ar(locale, "ولّد مسودات أولى أسرع بمدخلات موجّهة ثم راجع واعتمد بنفسك.", "Generate first drafts faster using guided inputs, then edit and approve the final version yourself.") },
    { icon: BookOpen, t: ar(locale, "ملخصات قضايا AI", "AI Case Summaries"), d: ar(locale, "حوّل ملاحظات ومستندات طويلة إلى ملخصات واضحة مرتبطة بملف القضية.", "Turn long notes and documents into clear summaries linked to the case file.") },
    { icon: ShieldCheck, t: ar(locale, "مراجعة عقود AI", "AI Contract Review"), d: ar(locale, "حدّد المخاطر والبنود الناقصة والشروط غير المعتادة.", "Identify possible risks, missing clauses, inconsistencies, and unusual terms.") },
  ];
  return (
    <section id="ai" className="relative overflow-hidden border-b border-border bg-onyx text-pearl">
      <div className="arabesque absolute inset-0 opacity-30" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute -end-32 top-1/2 size-[640px] -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, color-mix(in oklch, var(--gold), transparent 55%), transparent 70%)" }}
      />
      <div className="container relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid items-start gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>{ar(locale, "الذكاء القانوني", "Legal AI")}</Eyebrow>
            <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] text-pearl md:text-6xl">
              {ar(locale, "ذكاء داخل ", "Legal AI ")}
              <em className="not-italic [font-style:italic] text-gold">
                {ar(locale, "سير العمل", "inside the workflow")}
              </em>
              {ar(locale, " — لا منفصل عنه", " — not separate from it")}
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-[1.8] text-pearl/70">
              {ar(
                locale,
                "محكم يساعد المحامين على استخدام الذكاء الاصطناعي ضمن سير عمل القضية الفعلي. كل مخرج ذكاء يجب أن يراجعه محامٍ مؤهَّل قبل الاستخدام.",
                "Mohkam helps lawyers use AI inside the actual case workflow. Every AI output should be reviewed by a qualified lawyer before use.",
              )}
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {supports.map((s) => (
                <li key={s} className="rounded-full border border-gold/30 bg-white/5 px-3 py-1.5 text-[12px] text-pearl/80">
                  {s}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" variant="gold" className="mt-10 h-12 px-7 text-[12px] uppercase tracking-[0.22em]">
              <a href="#beta">
                {ar(locale, "انضم لبيتا الذكاء", "Join the AI Beta")} <Arrow className="size-4" />
              </a>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {cards.map((c, i) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-pearl/15 bg-white/[0.03] p-6 backdrop-blur-sm transition-colors hover:border-gold/60"
              >
                <div className="grid size-11 place-items-center rounded-xl bg-gold text-onyx">
                  <c.icon className="size-5" />
                </div>
                <h3 className="mt-5 font-serif text-2xl text-pearl">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-pearl/65">{c.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── WHY ───────────────────────── */

function WhyMohkam() {
  const { locale } = useI18n();
  const reasons = [
    { icon: Globe2, t: ar(locale, "ثنائي اللغة افتراضياً", "Bilingual by default"), d: ar(locale, "اعمل بالعربية أو الإنجليزية مع دعم RTL.", "Work in Arabic or English, with RTL support for Arabic users.") },
    { icon: Scale, t: ar(locale, "سير عمل قانوني محلي", "Local legal workflows"), d: ar(locale, "مصمَّم حول القضايا والجلسات والمواعيد والفواتير الإقليمية.", "Designed around cases, hearings, deadlines, invoices, and law-firm operations in the region.") },
    { icon: Activity, t: ar(locale, "رؤية شاملة للمكتب", "Firm-wide visibility"), d: ar(locale, "المالكون والشركاء يرون كل شيء من لوحة واحدة.", "Owners and partners can see cases, deadlines, billing, payments, and team activity from one dashboard.") },
    { icon: Sparkles, t: ar(locale, "ذكاء أصيل", "AI-native"), d: ar(locale, "الذكاء مدمج في البحث والصياغة والمراجعة — لا أداة جانبية.", "AI is built into research, drafting, review, and case work — not added as a separate tool.") },
    { icon: Lock, t: ar(locale, "أساس آمن", "Secure foundation"), d: ar(locale, "صلاحيات حسب الدور وتخزين آمن وعزل بيانات المؤسسات.", "Built with organization-level access controls, role-based permissions, and secure storage principles.") },
  ];
  return (
    <Section className="bg-background">
      <div className="mb-14 max-w-3xl">
        <Eyebrow>{ar(locale, "لماذا محكم", "Why Mohkam")}</Eyebrow>
        <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
          {ar(locale, "مبني ", "Built for the ")}
          <em className="not-italic [font-style:italic] text-gold">
            {ar(locale, "للسوق القانوني العربي", "Arab legal market")}
          </em>
        </h2>
        <p className="mt-6 text-[16px] leading-[1.8] text-foreground/65">
          {ar(
            locale,
            "أدوات الإدارة العالمية لم تُصمَّم للعمل العربي. وأدوات الذكاء العامة قوية لكنها ليست نظام تشغيل المكتب.",
            "Global practice-management tools were not designed for Arabic-first legal work. Generic AI tools are powerful, but they are not a law firm's system of record.",
          )}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reasons.map((r, i) => (
          <motion.div
            key={r.t}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 3) * 0.08 }}
            className="rounded-2xl border border-border bg-pearl/40 p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="grid size-11 place-items-center rounded-xl bg-gold text-onyx">
              <r.icon className="size-5" />
            </div>
            <h3 className="mt-5 font-serif text-xl">{r.t}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/65">{r.d}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── SECURITY ───────────────────────── */

function Security() {
  const { locale } = useI18n();
  const items = [
    ar(locale, "مساحات عمل بنطاق المؤسسة", "Organization-scoped workspaces"),
    ar(locale, "صلاحيات حسب الدور", "Role-based permissions"),
    ar(locale, "مصادقة آمنة", "Secure authentication"),
    ar(locale, "تسجيل خروج تلقائي بعد الخمول", "Auto sign-out after inactivity"),
    ar(locale, "تخزين مستندات محمي", "Protected document storage"),
    ar(locale, "سجلات نشاط", "Activity logs"),
    ar(locale, "وصول مضبوط للقضايا والمالية", "Controlled access to cases & financial records"),
  ];
  return (
    <Section id="security" className="bg-pearl/40">
      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>{ar(locale, "الأمان", "Security")}</Eyebrow>
          <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
            {ar(locale, "مصمَّم للعمل ", "Designed for ")}
            <em className="not-italic [font-style:italic] text-gold">
              {ar(locale, "السري", "confidential legal work")}
            </em>
          </h2>
          <p className="mt-6 text-[15px] leading-[1.8] text-foreground/65">
            {ar(
              locale,
              "محكم يُبنى وفق مبادئ أمان مؤسسية. شهادات الامتثال الرسمية ستُضاف مع نضوج المنصة.",
              "Mohkam is being built with enterprise-grade security principles. Formal certifications and compliance reports will be added as the platform matures.",
            )}
          </p>
        </div>
        <div className="lg:col-span-7">
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((it, i) => (
              <motion.div
                key={it}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-4"
              >
                <ShieldCheck className="size-5 shrink-0 text-gold" />
                <span className="text-sm text-foreground/80">{it}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ───────────────────────── DASHBOARD ───────────────────────── */

function Dashboard() {
  const { locale } = useI18n();
  const items = [
    ar(locale, "القضايا النشطة", "Active cases"),
    ar(locale, "المواعيد القادمة", "Upcoming deadlines"),
    ar(locale, "المهام المتأخرة", "Overdue tasks"),
    ar(locale, "المستندات الأخيرة", "Recent documents"),
    ar(locale, "الفواتير غير المسددة", "Unpaid invoices"),
    ar(locale, "تذكيرات الدفع", "Payment reminders"),
    ar(locale, "نشاط الفريق", "Team activity"),
    ar(locale, "أداء المكتب", "Firm performance insights"),
  ];
  return (
    <Section className="bg-background">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <Eyebrow>{ar(locale, "لوحة التحكم", "Dashboard")}</Eyebrow>
        <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
          {ar(locale, "اعرف ما يحتاج انتباهك ", "Know what needs your ")}
          <em className="not-italic [font-style:italic] text-gold">
            {ar(locale, "اليوم", "attention today")}
          </em>
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <motion.div
            key={it}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 4) * 0.06 }}
            className="rounded-xl border border-border bg-pearl/40 p-5 transition-colors hover:border-gold/60"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-foreground/45">
              <Layers className="size-3 text-gold" /> {String(i + 1).padStart(2, "0")}
            </div>
            <div className="mt-3 font-serif text-xl text-foreground">{it}</div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── WHO IT'S FOR ───────────────────────── */

function WhoFor() {
  const { locale } = useI18n();
  const cards = [
    { t: ar(locale, "المحامون الأفراد", "Solo Lawyers"), d: ar(locale, "أدِر ممارستك بأقل عمل إداري. قضايا، عملاء، مستندات، مواعيد، وقت وفواتير من مكان واحد.", "Run your practice with less admin work. Track cases, clients, documents, deadlines, time, and invoices from one place.") },
    { t: ar(locale, "المكاتب الصغيرة", "Small Law Firms"), d: ar(locale, "امنح فريقك مساحة واحدة مشتركة للقضايا والمواعيد والمستندات والفوترة وعمل العملاء.", "Give your team one shared workspace for cases, deadlines, documents, billing, and client work.") },
    { t: ar(locale, "المكاتب النامية", "Growing Firms"), d: ar(locale, "وحّد العمليات، حسّن الرؤية، قلّل المواعيد المفقودة، واستعدّ للتوسّع الإقليمي.", "Standardize operations, improve visibility, reduce missed deadlines, and prepare for regional growth.") },
  ];
  return (
    <Section className="bg-pearl/40">
      <div className="mb-14">
        <Eyebrow>{ar(locale, "لمن صُمم", "Who It's For")}</Eyebrow>
        <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
          {ar(locale, "للمحامين الأفراد والمكاتب", "Built for solo lawyers and law firms")}
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.t}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-background p-8 transition-all hover:-translate-y-1 hover:border-gold/60 hover:shadow-xl"
          >
            <Scale className="size-7 text-gold" />
            <h3 className="mt-6 font-serif text-3xl">{c.t}</h3>
            <p className="mt-4 text-[14.5px] leading-relaxed text-foreground/65">{c.d}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── BETA FORM ───────────────────────── */

function Beta() {
  const { locale } = useI18n();
  const benefits = [
    ar(locale, "تنظيم القضايا والمستندات", "Organize cases and documents"),
    ar(locale, "تتبّع مواعيد أكثر موثوقية", "Track deadlines more reliably"),
    ar(locale, "فواتير احترافية", "Generate professional invoices"),
    ar(locale, "رؤية أفضل للفريق", "Improve team visibility"),
    ar(locale, "اختبار مزايا الذكاء", "Test legal AI features"),
    ar(locale, "تقليل العمل الإداري اليومي", "Reduce daily admin work"),
  ];
  return (
    <Section id="beta" className="bg-background">
      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>{ar(locale, "النسخة الخاصة", "Private Beta")}</Eyebrow>
          <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
            {ar(locale, "انضم للبيتا ", "Join the ")}
            <em className="not-italic [font-style:italic] text-gold">
              {ar(locale, "الخاصة", "private beta")}
            </em>
          </h2>
          <p className="mt-6 text-[15px] leading-[1.8] text-foreground/65">
            {ar(
              locale,
              "محكم يفتح وصولاً مبكراً لمحامين ومكاتب مختارة في الأردن. أعضاء البيتا يشاركون في تشكيل المنتج.",
              "Mohkam is opening early access for selected lawyers and law firms in Jordan. Private beta members will help shape the product and get early access to the core platform.",
            )}
          </p>
          <ul className="mt-8 space-y-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[14px] text-foreground/75">
                <CheckCircle2 className="mt-0.5 size-4 text-gold" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="lg:col-span-7 rounded-3xl border border-border bg-pearl/40 p-8 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={ar(locale, "الاسم الكامل", "Full name")} />
            <Field label={ar(locale, "اسم المكتب", "Law firm name")} />
            <Field label={ar(locale, "البريد الإلكتروني", "Email")} type="email" />
            <Field label={ar(locale, "رقم الهاتف", "Phone number")} type="tel" />
            <Field label={ar(locale, "الدولة", "Country")} defaultValue={ar(locale, "الأردن", "Jordan")} />
            <Field label={ar(locale, "حجم المكتب", "Firm size")} placeholder="1–5, 6–20, 20+" />
            <div className="sm:col-span-2">
              <label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-foreground/55">
                {ar(locale, "أكبر تحدٍ حالياً", "Main pain point")}
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-gold"
              />
            </div>
          </div>
          <Button type="submit" size="lg" variant="gold" className="mt-6 h-12 w-full text-[12px] uppercase tracking-[0.22em] shadow-lg sm:w-auto sm:px-10">
            {ar(locale, "طلب الوصول للبيتا", "Request Private Beta Access")}
          </Button>
        </form>
      </div>
    </Section>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  defaultValue,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-foreground/55">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-gold"
      />
    </label>
  );
}

/* ───────────────────────── PRICING ───────────────────────── */

function Pricing() {
  const { locale } = useI18n();
  const tiers = [
    {
      name: ar(locale, "البداية", "Starter"),
      sub: ar(locale, "للمحامين الأفراد والممارسات الصغيرة.", "For solo lawyers and small practices."),
      cta: ar(locale, "طلب البداية", "Request Starter Access"),
      featured: false,
      items: [
        ar(locale, "القضايا", "Cases"),
        ar(locale, "العملاء", "Clients"),
        ar(locale, "المستندات", "Documents"),
        ar(locale, "المواعيد", "Deadlines"),
        ar(locale, "فواتير أساسية", "Basic invoices"),
        ar(locale, "مساحة عمل ثنائية اللغة", "Bilingual workspace"),
      ],
    },
    {
      name: ar(locale, "النمو", "Growth"),
      sub: ar(locale, "للمكاتب الصغيرة والنامية.", "For small and growing law firms."),
      cta: ar(locale, "طلب النمو", "Request Growth Access"),
      featured: true,
      items: [
        ar(locale, "كل ما في البداية", "Everything in Starter"),
        ar(locale, "أعضاء الفريق", "Team members"),
        ar(locale, "صلاحيات حسب الدور", "Role-based access"),
        ar(locale, "تتبّع الوقت", "Time tracking"),
        ar(locale, "تسجيل الدفعات", "Payment recording"),
        ar(locale, "سجل النشاط", "Activity log"),
        ar(locale, "لوحة متقدمة", "Advanced dashboard"),
      ],
    },
    {
      name: ar(locale, "برو", "Pro"),
      sub: ar(locale, "للمكاتب التي تريد الذكاء وسير عمل متقدم.", "For firms that want AI and advanced workflows."),
      cta: ar(locale, "طلب برو", "Request Pro Access"),
      featured: false,
      items: [
        ar(locale, "كل ما في النمو", "Everything in Growth"),
        ar(locale, "بحث قانوني AI", "AI legal research"),
        ar(locale, "صياغة عقود AI", "AI contract drafting"),
        ar(locale, "ملخصات قضايا AI", "AI case summaries"),
        ar(locale, "تحليلات متقدمة", "Advanced analytics"),
        ar(locale, "إعداد بأولوية", "Priority onboarding"),
      ],
    },
  ];
  return (
    <Section id="pricing" className="bg-pearl/40">
      <div className="mx-auto mb-14 max-w-3xl text-center">
        <Eyebrow>{ar(locale, "الأسعار", "Pricing")}</Eyebrow>
        <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
          {ar(locale, "أسعار بسيطة ", "Simple pricing for ")}
          <em className="not-italic [font-style:italic] text-gold">
            {ar(locale, "للمكاتب المبكرة", "early firms")}
          </em>
        </h2>
        <p className="mt-5 text-[15px] text-foreground/60">
          {ar(
            locale,
            "محكم متاح حالياً عبر البيتا الخاصة. الأسعار المبكرة تعتمد على حجم المكتب وعدد المستخدمين والوحدات المختارة.",
            "Mohkam is currently available through private beta access. Early pricing depends on firm size, number of users, and selected modules.",
          )}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className={`relative rounded-3xl border p-8 transition-all ${
              tier.featured
                ? "border-gold/60 bg-onyx text-pearl shadow-2xl lg:-translate-y-4"
                : "border-border bg-background hover:border-gold/40 hover:shadow-lg"
            }`}
          >
            {tier.featured && (
              <span className="absolute -top-3 start-8 rounded-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-onyx">
                {ar(locale, "موصى به", "Most Popular")}
              </span>
            )}
            <h3 className={`font-serif text-3xl ${tier.featured ? "text-pearl" : ""}`}>{tier.name}</h3>
            <p className={`mt-2 text-sm ${tier.featured ? "text-pearl/65" : "text-foreground/60"}`}>{tier.sub}</p>
            <ul className="mt-6 space-y-2.5">
              {tier.items.map((it) => (
                <li key={it} className={`flex items-start gap-2 text-[14px] ${tier.featured ? "text-pearl/85" : "text-foreground/75"}`}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
                  {it}
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant={tier.featured ? "gold" : "outline"}
              className={`mt-8 w-full text-[12px] uppercase tracking-[0.22em] ${
                !tier.featured ? "border-onyx/20 hover:bg-onyx hover:text-pearl" : ""
              }`}
            >
              <a href="#beta">{tier.cta}</a>
            </Button>
          </motion.div>
        ))}
      </div>
      <p className="mt-10 text-center text-[12px] uppercase tracking-[0.22em] text-foreground/45">
        {ar(locale, "أسعار البيتا الخاصة متاحة بالطلب.", "Private beta pricing available by request.")}
      </p>
    </Section>
  );
}

/* ───────────────────────── TESTIMONIAL PLACEHOLDER ───────────────────────── */

function Testimonial() {
  const { locale } = useI18n();
  return (
    <Section className="bg-background">
      <div className="mx-auto max-w-4xl text-center">
        <Eyebrow>{ar(locale, "بصوت المحامين", "Built with Lawyers")}</Eyebrow>
        <div className="mt-8 flex justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="size-5 fill-gold text-gold" />
          ))}
        </div>
        <p className="mt-8 font-serif text-3xl leading-[1.4] italic text-foreground/85 md:text-4xl">
          “
          {ar(
            locale,
            "يجري تطوير محكم بمشاركة محامين من الأردن والمنطقة. قصص العملاء الموثّقة ستُنشر بعد البيتا الخاصة.",
            "Mohkam is currently being shaped with input from legal professionals in Jordan and the region. Verified customer stories will be published after the private beta.",
          )}
          ”
        </p>
      </div>
    </Section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */

function FAQ() {
  const { locale } = useI18n();
  const qs = [
    [
      ar(locale, "هل محكم للمحامين أم للعموم؟", "Is Mohkam for lawyers or the public?"),
      ar(locale, "محكم مصمَّم للمحامين والمكاتب لإدارة القضايا والعملاء والمستندات والمواعيد والفوترة والبحث القانوني.", "Mohkam is designed for lawyers, solo practitioners, and law firms that need to manage cases, clients, documents, deadlines, billing, and legal research."),
    ],
    [
      ar(locale, "هل يحلّ محكم محلّ المحامي؟", "Does Mohkam replace a lawyer?"),
      ar(locale, "لا. محكم يدعم المحامين، وكل مخرج ذكاء يجب أن يراجعه محامٍ مؤهَّل.", "No. Mohkam supports legal professionals. AI outputs should always be reviewed and approved by a qualified lawyer."),
    ],
    [
      ar(locale, "هل يدعم العربية؟", "Does Mohkam support Arabic?"),
      ar(locale, "نعم، منصة ثنائية اللغة عربي/إنجليزي مع دعم RTL.", "Yes. Mohkam is designed as a bilingual Arabic and English platform with RTL support."),
    ],
    [
      ar(locale, "هل أستطيع إدارة فريق المكتب؟", "Can I manage my law firm team?"),
      ar(locale, "نعم، حسابات مؤسسات ودعوات فريق وصلاحيات حسب الدور.", "Yes. Mohkam supports organization accounts, team invitations, and role-based access."),
    ],
    [
      ar(locale, "هل أستطيع إصدار فواتير؟", "Can I create invoices?"),
      ar(locale, "نعم، عروض أسعار وفواتير ضريبية بالدينار وجداول سداد وPDF.", "Yes. Mohkam supports quotes, JOD tax invoices, payment recording, payment schedules, and PDF invoice generation."),
    ],
    [
      ar(locale, "هل بياناتي معزولة عن المكاتب الأخرى؟", "Is my data separated from other firms?"),
      ar(locale, "نعم. محكم مبني حول نطاق المؤسسة لعزل بيانات كل مكتب.", "Yes. Mohkam is designed around organization-scoped access so each firm's data remains separated."),
    ],
    [
      ar(locale, "هل الذكاء مدرَّب على القانون الأردني؟", "Is the AI trained for Jordanian law?"),
      ar(locale, "وحدة البحث القانوني مخطَّط لها لدعم القانون المدني والجزائي والمراجع الدستورية وقضايا مختارة.", "The AI legal research module is planned to support Jordanian legal materials including civil, penal, constitutional references, and selected case-law sources."),
    ],
    [
      ar(locale, "متى سيتاح محكم؟", "When will Mohkam be available?"),
      ar(locale, "محكم يحضّر حالياً للبيتا الخاصة لمكاتب مختارة.", "Mohkam is currently preparing private beta access for selected firms."),
    ],
  ];
  return (
    <Section className="bg-pearl/40">
      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Eyebrow>{ar(locale, "أسئلة شائعة", "FAQ")}</Eyebrow>
          <h2 className="mt-5 font-serif text-5xl leading-[1.02] tracking-[-0.02em] md:text-6xl">
            {ar(locale, "أسئلة ", "Frequently asked ")}
            <em className="not-italic [font-style:italic] text-gold">
              {ar(locale, "متكرّرة", "questions")}
            </em>
          </h2>
        </div>
        <div className="lg:col-span-8">
          <div className="divide-y divide-border rounded-2xl border border-border bg-background">
            {qs.map(([q, a], i) => (
              <details key={i} className="group p-6 open:bg-pearl/40">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                  <span className="font-serif text-xl text-foreground">{q}</span>
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full border border-gold/40 text-gold transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/70">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ───────────────────────── FINAL CTA ───────────────────────── */

function FinalCTA({ Arrow }: { Arrow: ComponentType<{ className?: string }> }) {
  const { locale } = useI18n();
  return (
    <section className="relative overflow-hidden border-b border-border bg-onyx text-pearl">
      <div className="arabesque absolute inset-0 opacity-30" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-[480px] opacity-50 blur-3xl"
        style={{ background: "radial-gradient(ellipse at top, color-mix(in oklch, var(--gold), transparent 55%), transparent 70%)" }}
      />
      <div className="container relative mx-auto max-w-5xl px-6 py-28 text-center lg:py-36">
        <img src={logoSrc} alt="Mohkam" className="mx-auto h-24 w-24 rounded-2xl bg-white p-2 shadow-2xl" />
        <h2 className="mt-10 font-serif text-5xl leading-[1.02] tracking-[-0.02em] text-pearl md:text-6xl">
          {ar(locale, "جاهز ", "Ready to ")}
          <em className="not-italic [font-style:italic] text-gold">
            {ar(locale, "لتحديث مكتبك؟", "modernize your law firm?")}
          </em>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.8] text-pearl/70">
          {ar(
            locale,
            "انقل القضايا والمواعيد والمستندات والفوترة والذكاء القانوني إلى مساحة عمل واحدة ثنائية اللغة.",
            "Move your cases, deadlines, documents, billing, and legal AI into one bilingual workspace.",
          )}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="gold" className="h-12 px-7 text-[12px] uppercase tracking-[0.22em] shadow-xl">
            <a href="#beta">
              {ar(locale, "النسخة الخاصة", "Request Private Beta")} <Arrow className="size-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 border-pearl/30 bg-transparent px-7 text-[12px] uppercase tracking-[0.22em] text-pearl hover:bg-pearl hover:text-onyx">
            <a href="#beta">{ar(locale, "حجز عرض", "Book a Demo")}</a>
          </Button>
        </div>
        <p className="mt-10 text-[12px] uppercase tracking-[0.32em] text-gold">
          {ar(locale, "صُنع في الأردن للمهنة القانونية العربية.", "Built in Jordan for the Arab legal profession.")}
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── FOOTER ───────────────────────── */

function SiteFooter() {
  const { locale } = useI18n();
  const cols = [
    {
      title: ar(locale, "المنصة", "Platform"),
      links: [
        [ar(locale, "المنتج", "Product"), "#product"],
        [ar(locale, "المزايا", "Features"), "#features"],
        [ar(locale, "الذكاء", "AI"), "#ai"],
        [ar(locale, "الأمان", "Security"), "#security"],
        [ar(locale, "الأسعار", "Pricing"), "#pricing"],
      ],
    },
    {
      title: ar(locale, "الشركة", "Company"),
      links: [
        [ar(locale, "طلب الوصول", "Request Access"), "#beta"],
        [ar(locale, "اتصل بنا", "Contact"), "#beta"],
      ],
    },
    {
      title: ar(locale, "قانوني", "Legal"),
      links: [
        [ar(locale, "سياسة الخصوصية", "Privacy Policy"), "#"],
        [ar(locale, "شروط الخدمة", "Terms of Service"), "#"],
      ],
    },
  ];
  return (
    <footer className="bg-background">
      <div className="container mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <BrandMark size="lg" />
            <p className="mt-5 max-w-sm text-[14px] leading-[1.7] text-foreground/65">
              {ar(
                locale,
                "نظام تشغيل المكاتب القانونية العربية. صُنع في الأردن.",
                "The operating system for Arab law firms. Built in Jordan.",
              )}
            </p>
            <div className="mt-6 flex items-center gap-4 text-[12px] text-foreground/55">
              <a href="mailto:hello@mohkam.app" className="flex items-center gap-1.5 hover:text-foreground"><Mail className="size-3.5" /> hello@mohkam.app</a>
              <a href="#beta" className="flex items-center gap-1.5 hover:text-foreground"><Phone className="size-3.5" /> +962</a>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title} className="lg:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.28em] text-gold">{c.title}</div>
              <ul className="mt-4 space-y-2">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-[13.5px] text-foreground/70 hover:text-foreground">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="lg:col-span-1 lg:text-end">
            <LangToggle />
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-[12px] text-foreground/50 md:flex-row md:items-center md:justify-between">
          <span>© 2026 Mohkam. {ar(locale, "جميع الحقوق محفوظة.", "All rights reserved.")}</span>
          <span className="max-w-3xl text-[11px] leading-[1.6] text-foreground/45">
            {ar(
              locale,
              "محكم يقدّم أدوات برمجية وإنتاجية مدعومة بالذكاء للمهنيين القانونيين. لا يقدّم نصائح قانونية، وكل مخرجاته يجب أن يراجعها محامٍ مؤهَّل.",
              "Mohkam provides software and AI-assisted productivity tools for legal professionals. It does not provide legal advice. All legal outputs must be reviewed by a qualified lawyer.",
            )}
          </span>
        </div>
      </div>
    </footer>
  );
}
