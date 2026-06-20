import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";
import {
  ArrowLeft,
  ArrowRight,
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
  KeyRound,
  Lock,
  Globe2,
  CheckCircle2,
  Star,
} from "lucide-react";
import type { ComponentType } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arab Law — منظومة العمل القانوني الذكية" },
      { name: "description", content: "منصة قانونية موحدة للمكاتب والإدارات والجامعات والمؤسسات القضائية في العالم العربي." },
      { property: "og:title", content: "Arab Law — AI-Native Legal OS" },
      { property: "og:description", content: "Unified legal platform for Arab firms, in-house counsel and judicial institutions." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { t, locale, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="hero-gradient relative overflow-hidden text-sidebar-foreground">
        <div className="arabesque absolute inset-0 opacity-50" aria-hidden />
        <div className="container relative mx-auto max-w-7xl px-6 pb-24 pt-20 lg:pb-32 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium tracking-wide text-gold">
                <Sparkles className="size-3.5" /> {t("hero_eyebrow")}
              </span>
              <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
                <span className="block">{t("hero_title_1")}</span>
                <span className="block bg-gradient-to-r from-gold via-amber-300 to-gold bg-clip-text text-transparent">
                  {t("hero_title_2")}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sidebar-foreground/75">
                {t("hero_sub")}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" variant="gold" className="h-12 px-6 text-base">
                  <Link to="/app/dashboard">
                    {t("hero_cta_primary")} <Arrow className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghostLight" className="h-12 px-6 text-base">
                  <a href="#modules">{t("hero_cta_secondary")}</a>
                </Button>
              </div>

              <div className="mt-12">
                <div className="text-xs uppercase tracking-[0.25em] text-sidebar-foreground/50">
                  {t("hero_trust")}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 text-sidebar-foreground/70">
                  {["AlBayan & Partners", "Gulf Legal Group", "Cairo Bar Association", "Riyadh Law School", "Dubai Arbitration Centre"].map((n) => (
                    <span key={n} className="font-serif text-base italic opacity-80">{n}</span>
                  ))}
                </div>
              </div>
            </div>

            <HeroPreview />
          </div>
        </div>
        <div className="gold-divider" />
      </section>

      {/* MODULES */}
      <section id="modules" className="container mx-auto max-w-7xl px-6 py-24">
        <SectionHeading eyebrow="modules_eyebrow" title="modules_title" sub="modules_sub" />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard key={m.key} icon={m.icon} titleKey={m.key} descKey={m.descKey} accent={m.accent} />
          ))}
        </div>
      </section>

      {/* SOLUTIONS */}
      <section className="bg-secondary/40 py-24">
        <div className="container mx-auto max-w-7xl px-6">
          <SectionHeading title="sol_title" />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Scale, titleKey: "sol_firms", descKey: "sol_firms_desc" },
              { icon: Building2, titleKey: "sol_inhouse", descKey: "sol_inhouse_desc" },
              { icon: School, titleKey: "sol_universities", descKey: "sol_universities_desc" },
              { icon: Landmark, titleKey: "sol_judiciary", descKey: "sol_judiciary_desc" },
            ].map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="card-elev group rounded-xl border bg-card p-6">
                <div className="mb-5 inline-grid size-12 place-items-center rounded-lg bg-primary/5 text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" />
                </div>
                <div className="font-semibold text-foreground">{t(titleKey as TKey)}</div>
                <p className="mt-2 text-sm text-muted-foreground">{t(descKey as TKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="container mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
              <ShieldCheck className="me-1.5 inline size-3.5" /> Security
            </span>
            <h2 className="mt-3 font-serif text-4xl tracking-tight md:text-5xl">{t("sec_title")}</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">{t("sec_sub")}</p>
            <ul className="mt-8 space-y-3">
              {(["sec_iso", "sec_gdpr", "sec_residency", "sec_sso", "sec_audit", "sec_rbac"] as TKey[]).map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  <span className="text-foreground/90">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="card-elev rounded-2xl border bg-card p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Lock, label: locale === "ar" ? "تشفير AES-256" : "AES-256 encryption" },
                  { icon: KeyRound, label: locale === "ar" ? "إدارة المفاتيح KMS" : "KMS key management" },
                  { icon: Globe2, label: locale === "ar" ? "إقامة بيانات إقليمية" : "Regional residency" },
                  { icon: ShieldCheck, label: locale === "ar" ? "اختبارات اختراق دورية" : "Quarterly pen-tests" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-lg border bg-secondary/50 p-4">
                    <Icon className="size-5 text-primary" />
                    <div className="mt-2 text-sm font-medium">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg bg-primary p-5 text-primary-foreground">
                <div className="text-xs uppercase tracking-widest text-gold">SOC 2 · ISO 27001 · GDPR</div>
                <div className="mt-2 font-serif text-2xl">99.99% Uptime SLA</div>
                <div className="mt-1 text-sm text-primary-foreground/70">
                  {locale === "ar" ? "نسخ احتياطي يومي مشفر — استعادة خلال 15 دقيقة" : "Encrypted daily backups — 15-min RTO"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-center font-serif text-4xl tracking-tight md:text-5xl">{t("pricing_title")}</h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              { plan: "plan_starter", price: "49", popular: false, features: locale === "ar" ? ["إدارة القضايا", "200 مستند", "بحث قانوني أساسي", "1 جيجا تخزين"] : ["Case management", "200 documents", "Basic legal search", "1 GB storage"] },
              { plan: "plan_pro", price: "129", popular: true, features: locale === "ar" ? ["كل ما في البداية", "صياغة بالذكاء الاصطناعي", "بحث قانوني متقدم", "تقارير وتحليلات", "تكاملات الفوترة"] : ["Everything in Starter", "AI drafting", "Advanced research", "Reports & analytics", "Billing integrations"] },
              { plan: "plan_enterprise", price: "—", popular: false, features: locale === "ar" ? ["إقامة بيانات مخصصة", "SSO / SAML", "مدير حساب مخصص", "اتفاقية SLA"] : ["Custom data residency", "SSO / SAML", "Dedicated CSM", "Custom SLA"] },
            ].map((p) => (
              <div
                key={p.plan}
                className={[
                  "relative rounded-2xl border p-7 backdrop-blur",
                  p.popular
                    ? "border-gold bg-gold/10 shadow-glow"
                    : "border-primary-foreground/10 bg-primary-foreground/5",
                ].join(" ")}
              >
                {p.popular && (
                  <span className="absolute -top-3 start-6 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-foreground">
                    {locale === "ar" ? "الأكثر اختياراً" : "Most popular"}
                  </span>
                )}
                <div className="text-sm uppercase tracking-widest text-primary-foreground/60">{t(p.plan as TKey)}</div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-serif text-5xl">{p.price === "—" ? "—" : `$${p.price}`}</span>
                  {p.price !== "—" && <span className="text-sm text-primary-foreground/60">{t("pricing_monthly")}</span>}
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />
                      <span className="text-primary-foreground/85">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-7 w-full" variant={p.popular ? "gold" : "outline"} size="lg">
                  <Link to="/app/dashboard">{p.plan === "plan_enterprise" ? t("plan_contact") : t("plan_cta")}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto max-w-5xl px-6 py-24 text-center">
        <h2 className="font-serif text-4xl tracking-tight md:text-5xl">{t("cta_title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("cta_sub")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-12 px-6">
            <Link to="/app/dashboard">{t("nav_launch")} <Arrow className="size-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6">
            <a href="#modules">{t("hero_cta_secondary")}</a>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <a href="#modules" className="text-muted-foreground transition-colors hover:text-foreground">{t("nav_features")}</a>
          <a href="#modules" className="text-muted-foreground transition-colors hover:text-foreground">{t("nav_solutions")}</a>
          <a href="#modules" className="text-muted-foreground transition-colors hover:text-foreground">{t("nav_pricing")}</a>
          <a href="#modules" className="text-muted-foreground transition-colors hover:text-foreground">{t("nav_security")}</a>
        </nav>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/app/dashboard">{t("nav_signin")}</Link>
          </Button>
          <Button asChild size="sm" variant="gold">
            <Link to="/app/dashboard">{t("nav_launch")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <BrandMark tone="dark" />
            <p className="mt-4 text-sm text-primary-foreground/60">{t("brand_tagline")}</p>
          </div>
          {[
            { h: t("nav_features"), items: ["Cases", "Documents", "Research", "Drafting", "Billing"] },
            { h: t("nav_solutions"), items: ["Law firms", "In-house", "Universities", "Judiciary"] },
            { h: "Company", items: ["About", "Security", "Privacy", "Contact"] },
          ].map((col) => (
            <div key={col.h}>
              <div className="text-sm font-semibold">{col.h}</div>
              <ul className="mt-4 space-y-2 text-sm text-primary-foreground/65">
                {col.items.map((i) => (<li key={i}><a className="hover:text-gold" href="#">{i}</a></li>))}
              </ul>
            </div>
          ))}
        </div>
        <div className="gold-divider mt-12" />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-primary-foreground/50">
          <div>© {new Date().getFullYear()} Arab Law. {t("footer_rights")}.</div>
          <div className="flex items-center gap-4">
            <span>SOC 2</span><span>ISO 27001</span><span>GDPR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow?: TKey; title: TKey; sub?: TKey }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <span className="text-xs font-medium uppercase tracking-[0.25em] text-gold">{t(eyebrow)}</span>
      )}
      <h2 className="mt-3 font-serif text-4xl tracking-tight md:text-5xl">{t(title)}</h2>
      {sub && <p className="mt-4 text-muted-foreground">{t(sub)}</p>}
    </div>
  );
}

type ModuleDef = { key: TKey; descKey: TKey; icon: ComponentType<{ className?: string }>; accent: string };

const modules: ModuleDef[] = [
  { key: "m_cases", descKey: "m_cases_desc", icon: Briefcase, accent: "from-blue-500/10 to-indigo-500/10" },
  { key: "m_documents", descKey: "m_documents_desc", icon: FileText, accent: "from-amber-500/10 to-orange-500/10" },
  { key: "m_research", descKey: "m_research_desc", icon: Search, accent: "from-emerald-500/10 to-teal-500/10" },
  { key: "m_drafting", descKey: "m_drafting_desc", icon: Sparkles, accent: "from-violet-500/10 to-fuchsia-500/10" },
  { key: "m_calendar", descKey: "m_calendar_desc", icon: CalendarDays, accent: "from-sky-500/10 to-cyan-500/10" },
  { key: "m_billing", descKey: "m_billing_desc", icon: Receipt, accent: "from-rose-500/10 to-pink-500/10" },
  { key: "m_education", descKey: "m_education_desc", icon: GraduationCap, accent: "from-yellow-500/10 to-amber-500/10" },
  { key: "m_analytics", descKey: "m_analytics_desc", icon: BarChart3, accent: "from-purple-500/10 to-violet-500/10" },
  { key: "m_clients", descKey: "m_clients_desc", icon: Building2, accent: "from-slate-500/10 to-zinc-500/10" },
];

function ModuleCard({
  icon: Icon, titleKey, descKey, accent,
}: { icon: ComponentType<{ className?: string }>; titleKey: TKey; descKey: TKey; accent: string }) {
  const { t } = useI18n();
  return (
    <div className={`card-elev group relative overflow-hidden rounded-xl border bg-gradient-to-br ${accent} bg-card p-6`}>
      <div className="mb-5 inline-grid size-11 place-items-center rounded-lg bg-card text-primary ring-1 ring-border">
        <Icon className="size-5" />
      </div>
      <div className="text-lg font-semibold">{t(titleKey)}</div>
      <p className="mt-2 text-sm text-muted-foreground">{t(descKey)}</p>
    </div>
  );
}

function HeroPreview() {
  const { locale } = useI18n();
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-gold/20 via-transparent to-blue-400/10 blur-2xl" aria-hidden />
      <div className="relative rounded-2xl border border-white/10 bg-sidebar/90 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs text-sidebar-foreground/60">
          <span className="font-mono">arablaw.app / dashboard</span>
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-red-400/70" />
            <span className="size-2 rounded-full bg-amber-400/70" />
            <span className="size-2 rounded-full bg-green-400/70" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: locale === "ar" ? "قضايا نشطة" : "Active matters", value: "128", trend: "+12%" },
            { label: locale === "ar" ? "ساعات الشهر" : "Hours / month", value: "1,284", trend: "+8%" },
            { label: locale === "ar" ? "إيرادات" : "Revenue", value: "$295K", trend: "+22%" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-white/5 p-3 ring-1 ring-white/5">
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">{s.label}</div>
              <div className="mt-1 font-serif text-xl text-sidebar-foreground">{s.value}</div>
              <div className="text-[10px] text-emerald-300/90">{s.trend}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-white/5 p-4 ring-1 ring-white/5">
          <div className="mb-3 flex items-center gap-2 text-xs text-sidebar-foreground/60">
            <Sparkles className="size-3.5 text-gold" />
            {locale === "ar" ? "مساعد الصياغة الذكي" : "AI Drafting Assistant"}
          </div>
          <div className="space-y-2 text-sm">
            <div className="rounded-md bg-gold/15 p-2.5 text-sidebar-foreground/90 ring-1 ring-gold/20">
              {locale === "ar" ? "اقترح بنوداً لاتفاقية امتياز بين طرف سعودي وإماراتي…" : "Draft franchise clauses between a Saudi and UAE party…"}
            </div>
            <div className="rounded-md bg-white/5 p-2.5 text-sidebar-foreground/80">
              {locale === "ar"
                ? "تمت صياغة 7 بنود مرجعية بناءً على النظام التجاري السعودي والقانون الإماراتي رقم 5/1985."
                : "Generated 7 reference clauses citing Saudi Commercial Code & UAE Federal Law 5/1985."}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-sidebar-foreground/50">
          <span className="flex items-center gap-1.5"><Star className="size-3 text-gold" /> 4.9 / 5</span>
          <span>{locale === "ar" ? "تحديث مباشر" : "Live preview"}</span>
        </div>
      </div>
    </div>
  );
}
