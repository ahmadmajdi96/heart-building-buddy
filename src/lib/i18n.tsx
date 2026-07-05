import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "ar" | "en";

type Dict = Record<string, { ar: string; en: string }>;

const dict = {
  // Brand
  brand: { ar: "محكم", en: "mohkam" },
  brand_tagline: {
    ar: "منظومة العمل القانوني الذكية للعالم العربي",
    en: "The AI-native legal operating system for the Arab world",
  },

  // Nav
  nav_features: { ar: "المزايا", en: "Features" },
  nav_solutions: { ar: "الحلول", en: "Solutions" },
  nav_pricing: { ar: "الأسعار", en: "Pricing" },
  nav_security: { ar: "الأمان", en: "Security" },
  nav_signin: { ar: "تسجيل الدخول", en: "Sign in" },
  nav_request_demo: { ar: "اطلب عرضاً", en: "Request a demo" },
  nav_launch: { ar: "افتح المنصة", en: "Launch platform" },

  // Hero
  hero_eyebrow: { ar: "منصة قانونية متعددة المستأجرين", en: "Multi-tenant legal platform" },
  hero_title_1: { ar: "ذكاء قانوني", en: "Legal intelligence" },
  hero_title_2: { ar: "بمعايير المحاكم العربية", en: "built for Arab jurisdictions" },
  hero_sub: {
    ar: "أنظمة إدارة القضايا، الصياغة الذكية، البحث القانوني، الجدولة القضائية، الفوترة، والتعليم القانوني — في منصة واحدة آمنة، ثنائية اللغة، وقابلة للتوسع على مستوى المؤسسات.",
    en: "Case management, AI drafting, legal research, court scheduling, billing, and legal education — in one secure, bilingual, enterprise-grade platform.",
  },
  hero_cta_primary: { ar: "ابدأ تجربتك", en: "Start free trial" },
  hero_cta_secondary: { ar: "شاهد العرض التوضيحي", en: "Watch product tour" },
  hero_trust: { ar: "موثوق به من قبل المؤسسات القانونية الرائدة", en: "Trusted by leading legal institutions" },

  // Modules section
  modules_eyebrow: { ar: "منصة موحدة", en: "Unified platform" },
  modules_title: { ar: "كل ما يحتاجه المكتب القانوني الحديث", en: "Everything a modern firm needs" },
  modules_sub: {
    ar: "وحدات متكاملة تغطي دورة العمل القانوني من البداية إلى النهاية.",
    en: "Integrated modules covering the full legal workflow end to end.",
  },

  // Module names (used in sidebar too)
  m_dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  m_cases: { ar: "إدارة القضايا", en: "Cases" },
  m_documents: { ar: "إدارة المستندات", en: "Documents" },
  m_research: { ar: "البحث القانوني", en: "Legal Research" },
  m_drafting: { ar: "الصياغة الذكية", en: "AI Drafting" },
  m_calendar: { ar: "جدول المحاكم", en: "Court Calendar" },
  m_financials: { ar: "الماليات", en: "Financials" },
  m_education: { ar: "الأكاديمية القانونية", en: "Legal Academy" },
  m_analytics: { ar: "التحليلات", en: "Analytics" },
  m_clients: { ar: "العملاء", en: "Clients" },
  m_courtroom: { ar: "محاكاة المحكمة", en: "Courtroom Sim" },
  m_live_sessions: { ar: "الجلسات المباشرة", en: "Live Sessions" },
  m_meetings: { ar: "الاجتماعات", en: "Meetings" },
  m_time: { ar: "تتبع الوقت", en: "Time Tracking" },
  m_deadlines: { ar: "المواعيد", en: "Deadlines" },
  m_activity: { ar: "سجل النشاط", en: "Activity Log" },
  m_team: { ar: "الفريق", en: "Team" },
  m_workspace: { ar: "مساحة العمل", en: "Workspace" },
  m_debt_collection: { ar: "تحصيل الديون", en: "Debt Collection" },
  m_settings: { ar: "الإعدادات", en: "Settings" },

  m_dashboard_desc: { ar: "نظرة شاملة على أداء المكتب والإنذارات والمهام.", en: "Firm-wide overview of performance, alerts and tasks." },
  m_cases_desc: { ar: "تتبع القضايا، الأطراف، الجلسات، والوثائق المرتبطة.", en: "Track matters, parties, hearings and linked documents." },
  m_documents_desc: { ar: "تخزين آمن، إصدارات، تواقيع إلكترونية، واسترجاع ذكي.", en: "Secure storage, versioning, e-signatures and smart retrieval." },
  m_research_desc: { ar: "بحث في التشريعات والاجتهاد القضائي مدعوم بالذكاء الاصطناعي.", en: "AI-powered search across legislation and case law." },
  m_drafting_desc: { ar: "صياغة العقود والمذكرات بقوالب ذكية وتدقيق فوري.", en: "Draft contracts and briefs with smart templates and review." },
  m_calendar_desc: { ar: "إدارة الجلسات، المواعيد النهائية، والتذكيرات.", en: "Hearings, deadlines and statute-of-limitation reminders." },
  m_financials_desc: { ar: "المدفوعات والجدولة، عروض الأسعار والفواتير الضريبية.", en: "Payments, schedules, quotes and tax invoices." },
  m_education_desc: { ar: "دورات قانونية معتمدة وشهادات للمحامين والطلاب.", en: "Accredited legal courses and certifications." },
  m_analytics_desc: { ar: "مؤشرات الأداء الرئيسية للمكتب والشركاء.", en: "KPIs for the firm, partners and practice areas." },
  m_clients_desc: { ar: "إدارة العلاقات والاتصالات مع الموكلين.", en: "Manage client relationships and communications." },

  // Solutions
  sol_title: { ar: "مصمم لكل مؤسسة قانونية", en: "Built for every legal institution" },
  sol_firms: { ar: "مكاتب المحاماة", en: "Law firms" },
  sol_firms_desc: { ar: "من الممارس الفردي إلى المكاتب الإقليمية.", en: "From solo practitioners to regional firms." },
  sol_inhouse: { ar: "الإدارات القانونية", en: "In-house counsel" },
  sol_inhouse_desc: { ar: "إدارة العقود والمخاطر داخل الشركات.", en: "Contracts and risk management for corporates." },
  sol_universities: { ar: "الجامعات", en: "Universities" },
  sol_universities_desc: { ar: "كليات الحقوق ومراكز التدريب القانوني.", en: "Law schools and clinical programs." },
  sol_judiciary: { ar: "المؤسسات القضائية", en: "Judicial institutions" },
  sol_judiciary_desc: { ar: "تدفقات عمل المحاكم وإدارة الملفات.", en: "Court workflows and docket management." },

  // Security
  sec_title: { ar: "أمان واعتمادية بمعايير المؤسسات", en: "Enterprise security & compliance" },
  sec_sub: {
    ar: "بنية متعددة المستأجرين، عزل بيانات، تشفير من الطرف إلى الطرف، وسجلات تدقيق كاملة.",
    en: "Multi-tenant isolation, end-to-end encryption, and complete audit trails.",
  },
  sec_iso: { ar: "ISO 27001 جاهز", en: "ISO 27001 ready" },
  sec_gdpr: { ar: "متوافق مع GDPR وأنظمة حماية البيانات الإقليمية", en: "GDPR & regional data-protection compliant" },
  sec_residency: { ar: "إقامة البيانات في الإقليم", en: "In-region data residency" },
  sec_sso: { ar: "تسجيل دخول موحد وSAML", en: "SSO & SAML 2.0" },
  sec_audit: { ar: "سجلات تدقيق غير قابلة للتغيير", en: "Immutable audit logs" },
  sec_rbac: { ar: "تحكم دقيق بالصلاحيات", en: "Granular RBAC" },

  // Pricing
  pricing_title: { ar: "خطط مرنة لكل حجم", en: "Plans that scale with you" },
  pricing_monthly: { ar: "شهرياً / لكل مستخدم", en: "per user / month" },
  plan_starter: { ar: "البداية", en: "Starter" },
  plan_pro: { ar: "احترافي", en: "Professional" },
  plan_enterprise: { ar: "مؤسسات", en: "Enterprise" },
  plan_cta: { ar: "ابدأ الآن", en: "Get started" },
  plan_contact: { ar: "تواصل مع المبيعات", en: "Contact sales" },

  // CTA / Footer
  cta_title: { ar: "جاهز لتطوير ممارستك القانونية؟", en: "Ready to modernize your practice?" },
  cta_sub: { ar: "ابدأ خلال دقائق. لا حاجة لبطاقة ائتمان.", en: "Get started in minutes. No credit card required." },
  footer_rights: { ar: "جميع الحقوق محفوظة", en: "All rights reserved" },

  // App shell
  app_search: { ar: "ابحث في كل شيء…", en: "Search everything…" },
  app_new: { ar: "جديد", en: "New" },
  app_notifications: { ar: "الإشعارات", en: "Notifications" },
  app_logout: { ar: "تسجيل الخروج", en: "Sign out" },
  app_back_site: { ar: "إلى الموقع", en: "Back to site" },

  // Common
  view_all: { ar: "عرض الكل", en: "View all" },
  status_active: { ar: "نشطة", en: "Active" },
  status_pending: { ar: "معلّقة", en: "Pending" },
  status_closed: { ar: "مغلقة", en: "Closed" },
  status_urgent: { ar: "عاجل", en: "Urgent" },
} satisfies Dict;

export type TKey = keyof typeof dict;

type Ctx = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: (key: TKey) => string;
  setLocale: (l: Locale) => void;
  toggle: () => void;
};

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("locale")) as Locale | null;
    if (saved === "ar" || saved === "en") setLocaleState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("locale", locale); } catch {}
  }, [locale]);

  const value: Ctx = {
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    t: (k) => dict[k]?.[locale] ?? String(k),
    setLocale: setLocaleState,
    toggle: () => setLocaleState((l) => (l === "ar" ? "en" : "ar")),
  };

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
