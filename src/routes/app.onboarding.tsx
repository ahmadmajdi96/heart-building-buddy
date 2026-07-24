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
import { useServerFn } from "@tanstack/react-start";
import { logOnboardingFailure, verifyOnboarding } from "@/lib/onboarding.functions";

type PgErr = { message: string; code?: string; details?: string | null; hint?: string | null };

function describeError(e: PgErr, locale: string): string {
  const code = e.code ?? "";
  // 42501 = insufficient_privilege (missing GRANT). 42P17 = recursive policy.
  // PostgREST returns "PGRST" codes; "42501" surfaces as message too.
  const isRls = code === "42501" || /row-level security|permission denied|violates row-level/i.test(e.message);
  if (isRls) {
    return locale === "ar"
      ? `رفض الوصول من قِبَل سياسة الأمان (RLS). ${e.message}${e.hint ? ` — ${e.hint}` : ""}`
      : `Blocked by row-level security policy. ${e.message}${e.hint ? ` — ${e.hint}` : ""}`;
  }
  if (/Failed to fetch|NetworkError|ERR_NETWORK/i.test(e.message)) {
    return locale === "ar" ? "تعذّر الاتصال بالخادم. تحقق من الشبكة." : "Network error reaching the server. Check your connection.";
  }
  return e.message;
}


export const Route = createFileRoute("/app/onboarding")({ component: OnboardingPage });

function OnboardingPage() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const { org, loading, refresh, userId } = useOrg();
  const [type, setType] = useState<"solo" | "firm" | null>(null);
  // Jordan-first pilot: currency, country, tax rate, phone prefix and timezone are locked.
  const [form, setForm] = useState({
    legal_name: "", display_name: "", email: "", phone: "+962", address: "", tax_id: "",
    logo_path: "", currency: "JOD", default_tax_rate: "16",
    country: "JO", preferred_language: locale as string, timezone: "Asia/Amman",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && org) navigate({ to: "/app/dashboard" });
  }, [loading, org, navigate]);

  const logFailure = useServerFn(logOnboardingFailure);
  const verify = useServerFn(verifyOnboarding);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!type || saving) return;
    if (!form.legal_name.trim()) { toast.error(locale === "ar" ? "أدخل الاسم القانوني" : "Legal name is required"); return; }
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) { toast.error(locale === "ar" ? "غير مسجّل الدخول" : "Not signed in. Please sign in again."); return; }

      // Atomic create via security-definer RPC (org + owner membership).
      const { data: created, error: oErr } = await (supabase as any).rpc("create_workspace", {
        _legal_name: form.legal_name,
        _display_name: form.display_name || form.legal_name,
        _type: type,
        _currency: form.currency,
        _preferred_language: form.preferred_language || "en",
      });
      if (oErr || !created) {
        const err = (oErr ?? { message: "Failed to create workspace" }) as PgErr;
        toast.error(describeError(err, locale));
        await logFailure({ data: { stage: "org_insert", code: err.code, message: err.message, details: err.details, hint: err.hint, payload: { type } } }).catch(() => {});
        return;
      }
      const orgId = created.id as string;

      // Persist the extra profile fields the RPC doesn't take.
      const extras = {
        email: form.email || sess.session!.user.email,
        phone: form.phone, address: form.address, tax_id: form.tax_id,
        logo_path: form.logo_path || null,
        default_tax_rate: Number(form.default_tax_rate) || 0,
        country: form.country || null,
      };
      const { error: uErr } = await supabase.from("organizations").update(extras as any).eq("id", orgId);
      if (uErr) {
        await logFailure({ data: { stage: "unknown", code: (uErr as PgErr).code, message: uErr.message, details: (uErr as PgErr).details, hint: (uErr as PgErr).hint, payload: { orgId } } }).catch(() => {});
        // Non-fatal: workspace exists and user is owner. Continue.
      }
      // Move any pending-uploaded logo into the real org folder
      if (form.logo_path && form.logo_path.startsWith(`pending/${uid}/`)) {
        const newPath = form.logo_path.replace(`pending/${uid}/`, `${orgId}/`);
        const { error: mvErr } = await supabase.storage.from("org-assets").move(form.logo_path, newPath);
        if (mvErr) {
          await logFailure({ data: { stage: "logo_move", code: null, message: mvErr.message, payload: { from: form.logo_path, to: newPath } } }).catch(() => {});
        } else {
          await supabase.from("organizations").update({ logo_path: newPath }).eq("id", orgId);
        }
      }
      // Backend verification — confirms both rows are visible under user RLS.
      const v = await verify({ data: { orgId } }).catch((e: Error) => ({ orgExists: false, memberExists: false, orgError: e.message, memberError: e.message, role: null, status: null }));
      if (!v.orgExists || !v.memberExists) {
        const msg = locale === "ar"
          ? `تم الإنشاء لكن لم تظهر السجلات (org=${v.orgExists}, member=${v.memberExists}). تحقق من سياسات RLS.`
          : `Created, but verification could not read it back (org=${v.orgExists}, member=${v.memberExists}). Check RLS policies.`;
        toast.error(msg);
        await logFailure({ data: { stage: v.orgExists ? "verify_member" : "verify_org", message: msg, details: v.orgError || v.memberError || null, payload: { orgId } } }).catch(() => {});
        return;
      }
      await refresh();
      toast.success(locale === "ar" ? "تم إنشاء المؤسسة" : "Organization created");
      navigate({ to: "/app/dashboard" });
    } catch (err) {
      const e = err as PgErr;
      toast.error(describeError(e, locale));
      await logFailure({ data: { stage: "unknown", code: e.code, message: e.message, details: e.details, hint: e.hint } }).catch(() => {});
    } finally {
      setSaving(false);
    }
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
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label={locale === "ar" ? "الاسم القانوني" : "Legal name"} required>
            <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} required />
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
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm">
                <span className="font-mono font-semibold">JOD</span>
                <span className="text-xs text-muted-foreground">{locale === "ar" ? "الدينار الأردني (ثابت للنسخة التجريبية)" : "Jordanian dinar (locked for pilot)"}</span>
              </div>
            </Field>
            <Field label={locale === "ar" ? "ضريبة المبيعات" : "Sales tax"}>
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm">
                <span className="font-mono font-semibold">16%</span>
                <span className="text-xs text-muted-foreground">{locale === "ar" ? "المعدل الأردني القياسي" : "Jordan standard rate"}</span>
              </div>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={locale === "ar" ? "الدولة" : "Country"}>
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm">
                <span>🇯🇴</span>
                <span className="font-semibold">{locale === "ar" ? "الأردن" : "Jordan"}</span>
              </div>
            </Field>
            <Field label={locale === "ar" ? "المنطقة الزمنية" : "Timezone"}>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-mono">
                Asia/Amman
              </div>
            </Field>
            <Field label={locale === "ar" ? "اللغة المفضّلة" : "Preferred language"}>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>

          <Field label={locale === "ar" ? "الشعار" : "Logo"}>
            <LogoPicker
              value={form.logo_path}
              onChange={(v) => setForm({ ...form, logo_path: v })}
              ownerKey={userId ? `pending/${userId}` : "pending/anon"}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setType(null)}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button type="submit" variant="gold" disabled={!form.legal_name.trim() || saving}>
              {saving && <Loader2 className="size-4 animate-spin"/>}
              {locale === "ar" ? "إنشاء المؤسسة" : "Create organization"}
            </Button>
          </div>
        </form>
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
