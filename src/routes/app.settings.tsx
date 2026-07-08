import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LogoPicker } from "@/components/logo-picker";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { locale } = useI18n();
  const { org, loading, can } = useOrg();

  if (loading) return <div className="grid min-h-[40vh] place-items-center"><Loader2 className="size-6 animate-spin text-gold"/></div>;
  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader title={locale === "ar" ? "الإعدادات" : "Settings"}/>
        <Card className="p-8 text-center">
          <p className="mb-4 text-muted-foreground">{locale === "ar" ? "أكمل إعداد مؤسستك أولاً." : "Complete organization setup first."}</p>
          <Button asChild variant="gold"><Link to="/app/onboarding">{locale === "ar" ? "إعداد" : "Start onboarding"}</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={locale === "ar" ? "الإعدادات" : "Settings"} subtitle={org.legal_name}/>
      <Tabs defaultValue="organization">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="organization">{locale === "ar" ? "المؤسسة" : "Organization"}</TabsTrigger>
          <TabsTrigger value="sms">{locale === "ar" ? "الرسائل النصية" : "SMS"}</TabsTrigger>
          <TabsTrigger value="region">{locale === "ar" ? "اللغة والمنطقة" : "Region"}</TabsTrigger>
        </TabsList>
        <TabsContent value="organization" className="mt-6"><OrgTab editable={can("manage_org")}/></TabsContent>
        <TabsContent value="sms" className="mt-6"><SmsTab editable={can("manage_org")}/></TabsContent>
        <TabsContent value="region" className="mt-6"><RegionTab/></TabsContent>
      </Tabs>
      {org.type === "firm" && (
        <Card className="p-4 text-sm text-muted-foreground">
          {locale === "ar" ? "إدارة الفريق انتقلت إلى صفحة مخصصة." : "Team management has moved to its own page."}
          {" "}<Link to="/app/team" className="text-gold hover:underline">{locale === "ar" ? "افتح صفحة الفريق" : "Open Team page"}</Link>
        </Card>
      )}
    </div>
  );
}

function OrgTab({ editable }: { editable: boolean }) {
  const { locale } = useI18n();
  const { org, refresh } = useOrg();
  const [form, setForm] = useState(org ?? ({} as any));
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (org) setForm(org); }, [org?.id]);

  async function save() {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").update({
      legal_name: form.legal_name, display_name: form.display_name,
      email: form.email, phone: form.phone, address: form.address, tax_id: form.tax_id,
      logo_path: form.logo_path, currency: form.currency, default_tax_rate: Number(form.default_tax_rate),
      invoice_prefix: form.invoice_prefix, quote_prefix: form.quote_prefix,
    }).eq("id", org.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    await refresh();
    toast.success(locale === "ar" ? "تم الحفظ" : "Saved"); setSaving(false);
  }

  return (
    <Card className="p-6">
      <form onSubmit={(e) => { e.preventDefault(); if (editable) save(); }} className="space-y-4">
        <div>
          <Label className="mb-2 block">{locale === "ar" ? "الشعار" : "Logo"}</Label>
          <LogoPicker
            value={form.logo_path}
            onChange={(v) => setForm({ ...form, logo_path: v })}
            ownerKey={org!.id}
            disabled={!editable}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>{locale === "ar" ? "الاسم القانوني" : "Legal name"}</Label><Input className="mt-1.5" value={form.legal_name ?? ""} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "الاسم التجاري" : "Display name"}</Label><Input className="mt-1.5" value={form.display_name ?? ""} onChange={(e) => setForm({ ...form, display_name: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "البريد الإلكتروني" : "Email"}</Label><Input className="mt-1.5" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "الهاتف" : "Phone"}</Label><Input className="mt-1.5" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!editable}/></div>
        </div>
        <div><Label>{locale === "ar" ? "العنوان" : "Address"}</Label><Textarea rows={2} className="mt-1.5" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!editable}/></div>
        <div className="grid gap-4 md:grid-cols-3">
          <div><Label>{locale === "ar" ? "الرقم الضريبي" : "Tax ID"}</Label><Input className="mt-1.5" value={form.tax_id ?? ""} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "العملة" : "Currency"}</Label><Input className="mt-1.5" value={form.currency ?? ""} onChange={(e) => setForm({ ...form, currency: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "ضريبة افتراضية %" : "Default tax %"}</Label><Input type="number" step="0.01" className="mt-1.5" value={form.default_tax_rate ?? 0} onChange={(e) => setForm({ ...form, default_tax_rate: e.target.value })} disabled={!editable}/></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>{locale === "ar" ? "بادئة الفاتورة" : "Invoice prefix"}</Label><Input className="mt-1.5" value={form.invoice_prefix ?? "INV"} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "بادئة عرض السعر" : "Quote prefix"}</Label><Input className="mt-1.5" value={form.quote_prefix ?? "QUO"} onChange={(e) => setForm({ ...form, quote_prefix: e.target.value })} disabled={!editable}/></div>
        </div>
        {editable && <div className="pt-2"><Button type="submit" variant="gold" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin"/>}{locale === "ar" ? "حفظ التغييرات" : "Save changes"}</Button></div>}
      </form>
    </Card>
  );
}



function RegionTab() {
  const { locale } = useI18n();
  return (
    <Card className="p-6 space-y-3 text-sm text-muted-foreground">
      <p>{locale === "ar" ? "الإعدادات الإقليمية تُدار من زر اللغة في الشريط العلوي." : "Region & language are controlled from the language toggle in the top bar."}</p>
    </Card>
  );
}

function SmsTab({ editable }: { editable: boolean }) {
  const { locale } = useI18n();
  const { org, refresh } = useOrg();
  const [form, setForm] = useState<any>(org ?? {});
  const [saving, setSaving] = useState(false);
  const [optOuts, setOptOuts] = useState<Array<{ id: string; phone: string; reason: string | null; opted_out_at: string }>>([]);
  const [newOptOut, setNewOptOut] = useState({ phone: "", reason: "" });

  useEffect(() => { if (org) setForm(org); }, [org?.id]);

  useEffect(() => {
    if (!org) return;
    (async () => {
      const { data } = await supabase
        .from("sms_opt_outs" as any)
        .select("id, phone, reason, opted_out_at")
        .eq("org_id", org.id)
        .order("opted_out_at", { ascending: false })
        .limit(200);
      setOptOuts((data as any) ?? []);
    })();
  }, [org?.id]);

  async function saveConfig() {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").update({
      sms_sender_id: form.sms_sender_id || null,
      sms_quiet_hours_start: form.sms_quiet_hours_start || "21:00",
      sms_quiet_hours_end: form.sms_quiet_hours_end || "09:00",
      sms_timezone: form.sms_timezone || "Asia/Amman",
      sms_daily_cap_per_recipient: Number(form.sms_daily_cap_per_recipient ?? 1),
      sms_bilingual_footer: !!form.sms_bilingual_footer,
    } as any).eq("id", org.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refresh();
    toast.success(locale === "ar" ? "تم الحفظ" : "Saved");
  }

  async function addOptOut() {
    if (!org || !newOptOut.phone.trim()) return;
    const phone = newOptOut.phone.trim();
    const { error, data } = await supabase.from("sms_opt_outs" as any)
      .insert({ org_id: org.id, phone, reason: newOptOut.reason || null } as any)
      .select("id, phone, reason, opted_out_at")
      .maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (data) setOptOuts((prev) => [data as any, ...prev]);
    setNewOptOut({ phone: "", reason: "" });
    toast.success(locale === "ar" ? "تمت الإضافة إلى قائمة الحظر" : "Added to opt-out list");
  }

  async function removeOptOut(id: string) {
    const { error } = await supabase.from("sms_opt_outs" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setOptOuts((prev) => prev.filter((r) => r.id !== id));
  }

  const preview =
    (locale === "ar"
      ? "تذكير: عليك 100.00 دينار مستحقة اليوم — القضية"
      : "Reminder: you owe 100.00 JOD due today — Case") +
    (form.sms_bilingual_footer !== false ? "\nللإيقاف أرسل STOP · Reply STOP to unsubscribe" : "");

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-medium">{locale === "ar" ? "الامتثال للوائح TRC الأردنية" : "Jordan TRC compliance"}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {locale === "ar"
              ? "معرّف المرسل يجب أن يكون مسجّلاً لدى هيئة تنظيم الاتصالات الأردنية. لا نرسل خارج ساعات العمل، ولا نتجاوز الحد اليومي، ونحترم قائمة إيقاف الاشتراك."
              : "The sender ID must be TRC-registered. We refuse sends outside working hours, above the daily cap, or to opted-out numbers."}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>{locale === "ar" ? "معرّف المرسل (TRC)" : "Sender ID (TRC)"}</Label>
            <Input className="mt-1.5" placeholder="e.g. LAWFIRM" value={form.sms_sender_id ?? ""}
              onChange={(e) => setForm({ ...form, sms_sender_id: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "المنطقة الزمنية" : "Timezone"}</Label>
            <Input className="mt-1.5" value={form.sms_timezone ?? "Asia/Amman"}
              onChange={(e) => setForm({ ...form, sms_timezone: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "بداية ساعات الصمت" : "Quiet-hours start"}</Label>
            <Input type="time" className="mt-1.5" value={(form.sms_quiet_hours_start ?? "21:00").slice(0,5)}
              onChange={(e) => setForm({ ...form, sms_quiet_hours_start: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "نهاية ساعات الصمت" : "Quiet-hours end"}</Label>
            <Input type="time" className="mt-1.5" value={(form.sms_quiet_hours_end ?? "09:00").slice(0,5)}
              onChange={(e) => setForm({ ...form, sms_quiet_hours_end: e.target.value })} disabled={!editable}/></div>
          <div><Label>{locale === "ar" ? "الحد اليومي لكل مستلم" : "Daily cap per recipient"}</Label>
            <Input type="number" min={0} className="mt-1.5" value={form.sms_daily_cap_per_recipient ?? 1}
              onChange={(e) => setForm({ ...form, sms_daily_cap_per_recipient: e.target.value })} disabled={!editable}/></div>
          <div className="flex items-center gap-2 pt-6">
            <input id="footer" type="checkbox" checked={form.sms_bilingual_footer !== false}
              onChange={(e) => setForm({ ...form, sms_bilingual_footer: e.target.checked })} disabled={!editable}/>
            <Label htmlFor="footer">{locale === "ar" ? "إلحاق تذييل إلغاء الاشتراك ثنائي اللغة" : "Append bilingual opt-out footer"}</Label>
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{locale === "ar" ? "معاينة" : "Preview"}</Label>
          <pre className="mt-1.5 whitespace-pre-wrap rounded border border-border/60 bg-secondary/40 p-3 text-sm">{preview}</pre>
        </div>

        {editable && (
          <div className="pt-2"><Button variant="gold" onClick={saveConfig} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin"/>}
            {locale === "ar" ? "حفظ" : "Save"}
          </Button></div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-medium">{locale === "ar" ? "قائمة إيقاف الاشتراك" : "Opt-out list"}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {locale === "ar" ? "الأرقام هنا لن تستقبل أي رسائل تجارية." : "Numbers here will not receive commercial messages."}
          </p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="+9627..." value={newOptOut.phone}
            onChange={(e) => setNewOptOut({ ...newOptOut, phone: e.target.value })} disabled={!editable}/>
          <Input placeholder={locale === "ar" ? "السبب (اختياري)" : "Reason (optional)"} value={newOptOut.reason}
            onChange={(e) => setNewOptOut({ ...newOptOut, reason: e.target.value })} disabled={!editable}/>
          {editable && <Button onClick={addOptOut}>{locale === "ar" ? "إضافة" : "Add"}</Button>}
        </div>
        <div className="divide-y divide-border/60 rounded border border-border/60">
          {optOuts.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">{locale === "ar" ? "لا يوجد" : "No opt-outs yet."}</div>
          )}
          {optOuts.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <div>
                <div className="font-medium">{r.phone}</div>
                <div className="text-xs text-muted-foreground">{r.reason || "—"} · {new Date(r.opted_out_at).toLocaleString()}</div>
              </div>
              {editable && <Button variant="ghost" size="sm" onClick={() => removeOptOut(r.id)}>{locale === "ar" ? "حذف" : "Remove"}</Button>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
