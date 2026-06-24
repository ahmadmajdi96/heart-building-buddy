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

function MembersTab({ editable }: { editable: boolean }) {
  const { locale } = useI18n();
  const { userId } = useOrg();
  const listFn = useServerFn(listTeamMembers);
  const removeFn = useServerFn(removeTeamMember);
  const updateFn = useServerFn(updateTeamMemberRole);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    try { setMembers(await listFn()); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function changeRole(id: string, role: string) {
    try { await updateFn({ data: { id, role: role as any } }); toast.success(locale === "ar" ? "تم التحديث" : "Updated"); load(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function remove(id: string) {
    if (!confirm(locale === "ar" ? "إزالة العضو؟" : "Remove member?")) return;
    try { await removeFn({ data: { id } }); load(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const roles: OrgRole[] = ["owner","partner","associate","paralegal","accountant","assistant"];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b p-4">
        <div className="text-sm font-semibold">{locale === "ar" ? "أعضاء المكتب" : "Firm members"}</div>
        {editable && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4"/>{locale === "ar" ? "دعوة عضو" : "Invite member"}</Button></DialogTrigger>
            <InviteDialog onSaved={() => { setOpen(false); load(); }} onClose={() => setOpen(false)}/>
          </Dialog>
        )}
      </div>
      {loading ? <div className="p-8 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground"/></div> : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "العضو" : "Member"}</th><th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الدور" : "Role"}</th><th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الحالة" : "Status"}</th><th></th></tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3">
                  <div className="font-medium">{m.user_id === userId ? (locale === "ar" ? "أنت" : "You") : (m.name || m.email || "—")}</div>
                  {m.email && m.name && <div className="text-xs text-muted-foreground">{m.email}</div>}
                </td>
                <td className="px-5 py-3">
                  {editable && m.user_id !== userId ? (
                    <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                      <SelectTrigger className="h-8 w-40"><SelectValue/></SelectTrigger>
                      <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{roleLabel(r, locale)}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <span className="text-muted-foreground">{roleLabel(m.role as OrgRole, locale)}</span>}
                </td>
                <td className="px-5 py-3 capitalize text-muted-foreground">{m.status}</td>
                <td className="px-5 py-3 text-end">{editable && m.user_id !== userId && <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="size-4 text-destructive"/></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="border-t bg-muted/30 p-3 text-xs text-muted-foreground">
        {locale === "ar"
          ? "ندعو العضو بإرسال رابط دخول إلى بريده. عند الدخول لأول مرة سيختار كلمة المرور الخاصة به."
          : "Inviting sends a sign-in link to the member's email. On first login they choose their own password."}
      </div>
    </Card>
  );
}

function InviteDialog({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const { locale } = useI18n();
  const inviteFn = useServerFn(inviteTeamMember);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("associate");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await inviteFn({ data: { email, role, redirectTo: window.location.origin + "/set-password" } });
      toast.success(locale === "ar" ? "تمت الدعوة — تم إرسال رابط البريد." : "Invited — sign-in link sent.");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  const roles: OrgRole[] = ["partner","associate","paralegal","accountant","assistant"];
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{locale === "ar" ? "دعوة عضو" : "Invite member"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>{locale === "ar" ? "البريد" : "Email"}</Label><Input type="email" className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)}/></div>
        <div><Label>{locale === "ar" ? "الدور" : "Role"}</Label>
          <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
            <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
            <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{roleLabel(r, locale)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{locale === "ar" ? "إلغاء" : "Cancel"}</Button>
        <Button variant="gold" onClick={save} disabled={saving || !email}>{saving && <Loader2 className="size-4 animate-spin"/>}{locale === "ar" ? "إرسال الدعوة" : "Send invite"}</Button>
      </DialogFooter>
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
