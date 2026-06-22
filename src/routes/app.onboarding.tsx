import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/org-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Scale, Building2 } from "lucide-react";
import { toast } from "sonner";
import { LogoPicker } from "@/components/logo-picker";

export const Route = createFileRoute("/app/onboarding")({ component: OnboardingPage });

function OnboardingPage() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const { org, loading, refresh } = useOrg();
  const [type, setType] = useState<"solo" | "firm" | null>(null);
  const [form, setForm] = useState({
    legal_name: "", display_name: "", email: "", phone: "", address: "", tax_id: "",
    logo_path: "", currency: "SAR", default_tax_rate: "15",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && org) navigate({ to: "/app/dashboard" });
  }, [loading, org, navigate]);

  async function submit() {
    if (!type) return;
    setSaving(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { toast.error("Not signed in"); setSaving(false); return; }
    const { data: orgRow, error: oErr } = await supabase.from("organizations").insert({
      type, legal_name: form.legal_name, display_name: form.display_name || form.legal_name,
      email: form.email || sess.session!.user.email, phone: form.phone, address: form.address,
      tax_id: form.tax_id, logo_path: form.logo_path || null, currency: form.currency,
      default_tax_rate: Number(form.default_tax_rate) || 0, created_by: uid,
    }).select("id").single();
    if (oErr || !orgRow) { toast.error(oErr?.message ?? "Failed"); setSaving(false); return; }
    const { error: mErr } = await supabase.from("organization_members").insert({
      org_id: orgRow.id, user_id: uid, role: "owner", status: "active",
    });
    if (mErr) { toast.error(mErr.message); setSaving(false); return; }
    await refresh();
    toast.success(locale === "ar" ? "تم إنشاء المؤسسة" : "Organization created");
    navigate({ to: "/app/dashboard" });
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-6 animate-spin text-gold"/></div>;

  if (!type) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 py-8">
        <div className="text-center">
          <div className="mb-2 text-xs uppercase tracking-[0.28em] text-gold">{locale === "ar" ? "أهلاً بك" : "Welcome"}</div>
          <h1 className="font-serif text-4xl">{locale === "ar" ? "كيف تريد العمل؟" : "How will you practice?"}</h1>
          <p className="mt-2 text-muted-foreground">{locale === "ar" ? "اختر نوع الحساب لإكمال الإعداد." : "Choose an account type to complete setup."}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ChoiceCard icon={<Scale className="size-8 text-gold"/>}
            title={locale === "ar" ? "محامٍ مستقل" : "Solo Lawyer"}
            desc={locale === "ar" ? "ممارسة فردية، حساب واحد، إدارة كاملة." : "Individual practice with one account and full control."}
            onClick={() => setType("solo")} />
          <ChoiceCard icon={<Building2 className="size-8 text-gold"/>}
            title={locale === "ar" ? "مكتب محاماة" : "Law Firm"}
            desc={locale === "ar" ? "فريق متعدد الأدوار: شركاء، محامون، محاسبون، إداريون." : "Team with roles: partners, associates, accountants, assistants."}
            onClick={() => setType("firm")} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6">
        <button onClick={() => setType(null)} className="text-sm text-muted-foreground hover:text-foreground">← {locale === "ar" ? "العودة" : "Back"}</button>
        <h1 className="mt-3 font-serif text-3xl">{type === "solo" ? (locale === "ar" ? "بيانات المحامي" : "Lawyer profile") : (locale === "ar" ? "بيانات المكتب" : "Firm profile")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{locale === "ar" ? "ستستخدم هذه البيانات في الفواتير وعروض الأسعار." : "These details appear on every invoice and quote."}</p>
      </div>
      <Card className="p-6 space-y-4">
        <Field label={locale === "ar" ? "الاسم القانوني" : "Legal name"} required>
          <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
        </Field>
        <Field label={locale === "ar" ? "الاسم التجاري (اختياري)" : "Display name (optional)"}>
          <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={locale === "ar" ? "البريد الإلكتروني" : "Email"}>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={locale === "ar" ? "الهاتف" : "Phone"}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </div>
        <Field label={locale === "ar" ? "العنوان" : "Address"}>
          <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={locale === "ar" ? "الرقم الضريبي" : "Tax ID / VAT"}>
            <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
          </Field>
          <Field label={locale === "ar" ? "العملة" : "Currency"}>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </Field>
          <Field label={locale === "ar" ? "ضريبة افتراضية %" : "Default tax %"}>
            <Input type="number" step="0.01" value={form.default_tax_rate} onChange={(e) => setForm({ ...form, default_tax_rate: e.target.value })} />
          </Field>
        </div>
        <Field label={locale === "ar" ? "رابط الشعار (URL)" : "Logo URL"}>
          <Input placeholder="https://…/logo.png" value={form.logo_path} onChange={(e) => setForm({ ...form, logo_path: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setType(null)}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button variant="gold" disabled={!form.legal_name || saving} onClick={submit}>
            {saving && <Loader2 className="size-4 animate-spin"/>}
            {locale === "ar" ? "إنشاء المؤسسة" : "Create organization"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ChoiceCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group text-start card-elev rounded-xl border bg-card p-6 transition-all hover:border-gold/40 hover:shadow-lg">
      <div className="mb-4">{icon}</div>
      <div className="font-serif text-xl">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
