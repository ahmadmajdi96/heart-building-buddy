import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { useOrg, roleLabel, type OrgRole } from "@/lib/org-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LogoPicker } from "@/components/logo-picker";
import { listTeamMembers, inviteTeamMember, removeTeamMember, updateTeamMemberRole } from "@/lib/team.functions";

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
          <TabsTrigger value="region">{locale === "ar" ? "اللغة والمنطقة" : "Region"}</TabsTrigger>
        </TabsList>
        <TabsContent value="organization" className="mt-6"><OrgTab editable={can("manage_org")}/></TabsContent>
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

    </DialogContent>
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
