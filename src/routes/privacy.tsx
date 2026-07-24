import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — محكم | Privacy Policy — Mohkam" },
      { name: "description", content: "Mohkam's privacy commitments under Jordan's Personal Data Protection Law (PDPL) No. 24/2023." },
      { property: "og:title", content: "Privacy Policy — Mohkam" },
      { property: "og:description", content: "How Mohkam handles personal data under PDPL No. 24/2023." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mohkamlaw.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://mohkamlaw.com/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link to="/"><BrandMark /></Link>
          <LangToggle />
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-14">
        <div className="mb-8 text-[11px] uppercase tracking-[0.28em] text-gold">
          {isAr ? "الخصوصية" : "Privacy"}
        </div>
        <h1 className="font-serif text-4xl leading-tight">
          {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
        </h1>
        <p className="mt-4 text-[13px] text-foreground/55">
          {isAr ? "آخر تحديث: ٢٠٢٦" : "Last updated: 2026"}
        </p>

        <div className="prose prose-neutral mt-10 max-w-none text-[15px] leading-[1.85] text-foreground/80">
          {isAr ? <ArabicBody /> : <EnglishBody />}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-card p-5 text-[13px] text-foreground/70">
          {isAr
            ? "للاستفسارات المتعلقة بالبيانات الشخصية، راسلنا على "
            : "For personal-data enquiries, email "}
          <a href="mailto:privacy@mohkamlaw.com" className="text-gold underline">privacy@mohkamlaw.com</a>.
        </div>
      </main>
    </div>
  );
}

function ArabicBody() {
  return (
    <>
      <h2>الالتزام</h2>
      <p>يلتزم محكم بأحكام قانون حماية البيانات الشخصية رقم ٢٤ لسنة ٢٠٢٣ في المملكة الأردنية الهاشمية. نحن نعالج بياناتك كمعالج بيانات نيابةً عن مكتبك (المتحكم بالبيانات) وفق اتفاقية معالجة البيانات (DPA) الموقعة.</p>

      <h2>البيانات التي نجمعها</h2>
      <ul>
        <li>بيانات حساب المستخدم: الاسم، البريد الإلكتروني، الدور داخل المكتب.</li>
        <li>بيانات المكتب: الاسم القانوني، الرقم الضريبي، شعار الترويسة.</li>
        <li>بيانات القضايا والموكلين: يرفعها المكتب وتظل ملكاً له.</li>
        <li>بيانات تقنية: عناوين IP وسجلات الوصول للأغراض الأمنية.</li>
      </ul>

      <h2>الأساس القانوني للمعالجة</h2>
      <p>تنفيذ اتفاقية تقديم الخدمة، ومصلحة مشروعة في تأمين المنصة، وموافقة صريحة عند الاقتضاء.</p>

      <h2>عزل بيانات المكاتب</h2>
      <p>يتم عزل بيانات كل مكتب على مستوى المؤسسة (Row-Level Security)، ولا يمكن لأي مكتب الوصول إلى بيانات مكتب آخر.</p>

      <h2>مكان الاستضافة ومعالجو البيانات الفرعيون</h2>
      <p>يتم الإفصاح عن مكان الاستضافة الفعلي وقائمة المعالجين الفرعيين (بما في ذلك مزودو الذكاء الاصطناعي، ومزودو الرسائل النصية، وخدمات النسخ الاحتياطي) في ملحق اتفاقية معالجة البيانات المتاحة عند الطلب.</p>

      <h2>حقوق الأشخاص أصحاب البيانات</h2>
      <ul>
        <li>الحق في الاطلاع على البيانات.</li>
        <li>الحق في التصحيح والتحديث.</li>
        <li>الحق في الحذف عند انتفاء الغرض.</li>
        <li>الحق في نقل البيانات بصيغة منظمة.</li>
      </ul>

      <h2>الاحتفاظ بالبيانات</h2>
      <p>نحتفظ بالبيانات طوال مدة الاشتراك النشط، وحتى ٩٠ يوماً بعد إنهاء الاشتراك لأغراض الاسترجاع، ثم تُحذف حذفاً نهائياً.</p>

      <h2>الإفصاح عن الاختراقات</h2>
      <p>في حال وقوع اختراق أمني يمس بيانات شخصية، نلتزم بإبلاغ المكتب المعني خلال ٢٤ ساعة والجهة التنظيمية المختصة خلال ٧٢ ساعة وفق القانون.</p>

      <h2>الذكاء الاصطناعي</h2>
      <p>يتم إرسال المدخلات إلى مزودي نماذج الذكاء الاصطناعي الموثقين في اتفاقية معالجة البيانات. لا تُستخدم بياناتك لتدريب نماذج طرف ثالث.</p>
    </>
  );
}

function EnglishBody() {
  return (
    <>
      <h2>Commitment</h2>
      <p>Mohkam is committed to Jordan's Personal Data Protection Law No. 24/2023 (PDPL). We act as a data processor on behalf of your firm (the data controller) under a signed Data Processing Agreement (DPA).</p>

      <h2>Data we collect</h2>
      <ul>
        <li>User account data: name, email, firm role.</li>
        <li>Firm data: legal name, tax number, letterhead assets.</li>
        <li>Case and client data: uploaded by the firm and owned by the firm.</li>
        <li>Technical data: IP addresses and access logs for security.</li>
      </ul>

      <h2>Legal basis for processing</h2>
      <p>Performance of the service agreement, legitimate interest in securing the platform, and explicit consent where required.</p>

      <h2>Firm-level isolation</h2>
      <p>Every firm's data is isolated at the organization level (row-level security). No firm can access another firm's data.</p>

      <h2>Hosting & sub-processors</h2>
      <p>The physical hosting location and the full list of sub-processors — including AI model providers, SMS gateways, and backup services — are disclosed in the DPA schedule available on request.</p>

      <h2>Data subject rights</h2>
      <ul>
        <li>Right of access.</li>
        <li>Right of rectification.</li>
        <li>Right of erasure when the purpose ceases.</li>
        <li>Right of portability in a structured format.</li>
      </ul>

      <h2>Retention</h2>
      <p>We retain data for the active subscription term and for 90 days after termination for recovery, then delete it permanently.</p>

      <h2>Breach disclosure</h2>
      <p>In the event of a personal-data breach we commit to notifying the affected firm within 24 hours and the competent regulator within 72 hours, per PDPL.</p>

      <h2>AI</h2>
      <p>Inputs are sent to the AI model providers listed in the DPA. Your data is not used to train third-party models.</p>
    </>
  );
}
