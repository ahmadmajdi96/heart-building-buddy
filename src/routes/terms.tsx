import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الخدمة — محكم | Terms of Service — Mohkam" },
      { name: "description", content: "Terms governing your use of Mohkam's law-firm operating system." },
      { property: "og:title", content: "Terms of Service — Mohkam" },
      { property: "og:description", content: "The service terms for Mohkam law-firm software." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mohkamlaw.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://mohkamlaw.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
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
          {isAr ? "الشروط" : "Terms"}
        </div>
        <h1 className="font-serif text-4xl leading-tight">
          {isAr ? "شروط الخدمة" : "Terms of Service"}
        </h1>
        <p className="mt-4 text-[13px] text-foreground/55">
          {isAr ? "آخر تحديث: ٢٠٢٦" : "Last updated: 2026"}
        </p>

        <div className="prose prose-neutral mt-10 max-w-none text-[15px] leading-[1.85] text-foreground/80">
          {isAr ? (
            <>
              <h2>الخدمة</h2>
              <p>يقدّم محكم أدوات برمجية للمهنيين القانونيين لإدارة القضايا والموكلين والفوترة والتحصيل والصياغة. محكم لا يقدّم استشارات قانونية.</p>
              <h2>الحسابات</h2>
              <p>يوافق المستخدم على تقديم بيانات صحيحة والمحافظة على سرية بيانات الدخول. المكتب هو المتحكم بالبيانات المرفوعة إلى المنصة.</p>
              <h2>الاستخدام المقبول</h2>
              <p>يُحظر استخدام المنصة لأغراض غير مشروعة، أو انتحال هوية، أو تحميل محتوى مخالف للقانون الأردني.</p>
              <h2>الذكاء الاصطناعي</h2>
              <p>جميع المخرجات المولّدة بالذكاء الاصطناعي هي مسودات تتطلب مراجعة محامٍ مؤهل قبل الاستخدام. لا يتحمل محكم مسؤولية الأخطاء الناتجة عن عدم المراجعة.</p>
              <h2>الفوترة</h2>
              <p>الاشتراكات بالدينار الأردني وتخضع لضريبة المبيعات ١٦٪. يتم الإفصاح عن أي رسوم قبل الاشتراك.</p>
              <h2>إنهاء الخدمة</h2>
              <p>يحق لأي طرف إنهاء الاتفاقية بإشعار خطي. تُتاح للمكتب مهلة ٩٠ يوماً لتصدير بياناته بعد الإنهاء.</p>
              <h2>المسؤولية</h2>
              <p>يُقدَّم محكم كما هو، ومسؤوليتنا محدودة بمقدار الرسوم المدفوعة خلال الاثني عشر شهراً السابقة للحادثة.</p>
              <h2>القانون الحاكم</h2>
              <p>تخضع هذه الشروط لقوانين المملكة الأردنية الهاشمية، والاختصاص لمحاكم عمّان.</p>
            </>
          ) : (
            <>
              <h2>The service</h2>
              <p>Mohkam provides software tools for legal professionals to manage cases, clients, billing, collections, and drafting. Mohkam does not provide legal advice.</p>
              <h2>Accounts</h2>
              <p>You agree to provide accurate information and keep credentials confidential. Your firm is the controller of data uploaded to the platform.</p>
              <h2>Acceptable use</h2>
              <p>The platform may not be used for unlawful purposes, impersonation, or uploading content that violates Jordanian law.</p>
              <h2>AI outputs</h2>
              <p>All AI-generated outputs are drafts and require review by a qualified lawyer before use. Mohkam is not liable for errors resulting from unreviewed outputs.</p>
              <h2>Billing</h2>
              <p>Subscriptions are billed in Jordanian dinars and subject to 16% GST. All fees are disclosed before subscribing.</p>
              <h2>Termination</h2>
              <p>Either party may terminate with written notice. Firms have a 90-day export window after termination.</p>
              <h2>Liability</h2>
              <p>Mohkam is provided as-is. Our liability is capped at the fees paid in the 12 months preceding the incident.</p>
              <h2>Governing law</h2>
              <p>These terms are governed by the laws of the Hashemite Kingdom of Jordan; the courts of Amman have jurisdiction.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
