import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { locale } = useI18n();
  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "الإعدادات" : "Settings"}
        subtitle={locale === "ar" ? "إعدادات المكتب، الفريق، والأمان." : "Firm, team and security preferences."}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-elev space-y-4 rounded-xl border bg-card p-6">
          <h3 className="font-serif text-xl">{locale === "ar" ? "ملف المكتب" : "Firm profile"}</h3>
          <div className="space-y-3">
            <div>
              <Label>{locale === "ar" ? "اسم المكتب" : "Firm name"}</Label>
              <Input className="mt-1.5" defaultValue="Al Mansour & Partners — مكتب المنصور وشركاؤه" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{locale === "ar" ? "البلد" : "Country"}</Label>
                <Input className="mt-1.5" defaultValue={locale === "ar" ? "المملكة العربية السعودية" : "Saudi Arabia"} />
              </div>
              <div>
                <Label>{locale === "ar" ? "العملة" : "Currency"}</Label>
                <Input className="mt-1.5" defaultValue="SAR" />
              </div>
            </div>
            <Button variant="gold">{locale === "ar" ? "حفظ التغييرات" : "Save changes"}</Button>
          </div>
        </section>

        <section className="card-elev space-y-4 rounded-xl border bg-card p-6">
          <h3 className="font-serif text-xl">{locale === "ar" ? "الأمان والمصادقة" : "Security & Auth"}</h3>
          <Row label={locale === "ar" ? "المصادقة الثنائية (2FA)" : "Two-factor authentication"} defaultChecked />
          <Row label={locale === "ar" ? "تسجيل الدخول الموحد SSO / SAML" : "Single Sign-On (SSO / SAML)"} />
          <Row label={locale === "ar" ? "تنبيه عند تسجيل دخول جديد" : "Notify on new sign-in"} defaultChecked />
          <Row label={locale === "ar" ? "تشفير الملفات بمفتاح العميل" : "Customer-managed encryption keys"} />
        </section>

        <section className="card-elev space-y-4 rounded-xl border bg-card p-6">
          <h3 className="font-serif text-xl">{locale === "ar" ? "الفوترة والاشتراك" : "Billing & subscription"}</h3>
          <div className="rounded-lg border bg-secondary/50 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{locale === "ar" ? "الخطة الحالية" : "Current plan"}</div>
            <div className="mt-1 font-serif text-2xl">Professional</div>
            <div className="mt-1 text-sm text-muted-foreground">$129 / user / month · 28 seats</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">{locale === "ar" ? "إدارة المقاعد" : "Manage seats"}</Button>
            <Button variant="gold">{locale === "ar" ? "ترقية للمؤسسات" : "Upgrade to Enterprise"}</Button>
          </div>
        </section>

        <section className="card-elev space-y-4 rounded-xl border bg-card p-6">
          <h3 className="font-serif text-xl">{locale === "ar" ? "اللغة والمنطقة" : "Language & region"}</h3>
          <Row label={locale === "ar" ? "افتراضي: العربية" : "Default to Arabic"} defaultChecked />
          <Row label={locale === "ar" ? "تنسيق التاريخ الهجري" : "Hijri date format"} />
          <Row label={locale === "ar" ? "إقامة بيانات داخل الخليج" : "GCC data residency"} defaultChecked />
        </section>
      </div>
    </div>
  );
}

function Row({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-0">
      <Label className="font-normal text-foreground">{label}</Label>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
