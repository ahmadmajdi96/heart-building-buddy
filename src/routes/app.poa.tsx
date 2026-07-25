import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Stamp, Plus, Trash2, Pencil, Ban, FileDown, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useOrg } from "@/lib/org-context";
import { PageHeader } from "@/components/app/primitives";
import { EmptyState, TableSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDensityClasses } from "@/hooks/use-density";
import { bi, POA_SCOPES, POA_POWERS, powersForScope, type PoaScope } from "@/lib/jordan-legal";
import { listPowersOfAttorney, savePowerOfAttorney, deletePowerOfAttorney, revokePowerOfAttorney } from "@/lib/poa.functions";
import { listClients, saveClient } from "@/lib/clients.functions";
import { exportDraftPdf } from "@/lib/draft-export";

export const Route = createFileRoute("/app/poa")({
  component: PoaPage,
  head: () => ({
    meta: [
      { title: "Powers of Attorney — Mohkam" },
      { name: "description", content: "Register, track and print Jordanian powers of attorney (وكالات) for your clients and cases." },
      { property: "og:title", content: "Powers of Attorney — Mohkam" },
      { property: "og:description", content: "Register, track and print Jordanian powers of attorney for your clients and cases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Poa = any;

const blank = {
  id: undefined as string | undefined,
  client_id: "" as string,
  reference: "",
  scope: "litigation" as PoaScope,
  principal_name: "",
  principal_id_number: "",
  principal_address: "",
  agent_name: "",
  agent_bar_number: "",
  powers: [] as string[],
  notary_office: "",
  notarised_on: "",
  starts_on: "",
  expires_on: "",
  status: "active" as "draft" | "active" | "revoked" | "expired",
  notes: "",
};

type ClientRow = { id: string; name: string; national_id?: string | null; address?: string | null; phone?: string | null };

function PoaPage() {
  const { locale } = useI18n(); const ar = locale === "ar";
  const { org } = useOrg();
  const d = useDensityClasses();
  const list = useServerFn(listPowersOfAttorney);
  const save = useServerFn(savePowerOfAttorney);
  const del = useServerFn(deletePowerOfAttorney);
  const revoke = useServerFn(revokePowerOfAttorney);
  const clientsFn = useServerFn(listClients);
  const saveClientFn = useServerFn(saveClient);

  const [rows, setRows] = useState<Poa[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [q, setQ] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", national_id: "", address: "" });
  const [savingClient, setSavingClient] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([list(), clientsFn()]);
      setRows(p as Poa[]);
      setClients((c as any[]).map((x) => ({
        id: x.id, name: x.name, national_id: x.national_id, address: x.address, phone: x.phone,
      })));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const clientOptions = useMemo(() => {
    const n = clientQuery.trim().toLowerCase();
    if (!n) return clients;
    return clients.filter((c) => (c.name ?? "").toLowerCase().includes(n) || (c.phone ?? "").includes(n));
  }, [clients, clientQuery]);

  /** Selecting a client fills the principal block from their profile. */
  function pickClient(id: string) {
    if (!id) { setForm((f) => ({ ...f, client_id: "" })); return; }
    const c = clients.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      client_id: id,
      principal_name: c?.name ?? f.principal_name,
      principal_id_number: c?.national_id || f.principal_id_number,
      principal_address: c?.address || f.principal_address,
    }));
  }

  async function createClient() {
    if (!newClient.name.trim()) {
      toast.error(ar ? "اسم الموكّل مطلوب." : "Client name is required.");
      return;
    }
    setSavingClient(true);
    try {
      const row: any = await saveClientFn({ data: { ...newClient, type: "individual", status: "active", locale } });
      const created: ClientRow = { id: row.id, name: row.name, national_id: row.national_id, address: row.address, phone: row.phone };
      setClients((prev) => [created, ...prev]);
      setForm((f) => ({
        ...f,
        client_id: created.id,
        principal_name: created.name ?? f.principal_name,
        principal_id_number: created.national_id || f.principal_id_number,
        principal_address: created.address || f.principal_address,
      }));
      setNewClient({ name: "", phone: "", email: "", national_id: "", address: "" });
      setNewClientOpen(false);
      toast.success(ar ? "تم إضافة الموكّل" : "Client added");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSavingClient(false); }
  }

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) =>
      [r.principal_name, r.agent_name, r.reference, r.clients?.name].filter(Boolean).join(" ").toLowerCase().includes(n));
  }, [rows, q]);


  function edit(r: Poa) {
    setForm({
      id: r.id,
      client_id: r.client_id ?? "",
      reference: r.reference ?? "",
      scope: r.scope,
      principal_name: r.principal_name ?? "",
      principal_id_number: r.principal_id_number ?? "",
      principal_address: r.principal_address ?? "",
      agent_name: r.agent_name ?? "",
      agent_bar_number: r.agent_bar_number ?? "",
      powers: r.powers ?? [],
      notary_office: r.notary_office ?? "",
      notarised_on: r.notarised_on ?? "",
      starts_on: r.starts_on ?? "",
      expires_on: r.expires_on ?? "",
      status: r.status,
      notes: r.notes ?? "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.principal_name.trim() || !form.agent_name.trim()) {
      toast.error(ar ? "اسم الموكّل والوكيل مطلوبان." : "Principal and agent names are required.");
      return;
    }
    try {
      await save({ data: { ...form, client_id: form.client_id || null } });
      toast.success(ar ? "تم الحفظ" : "Saved");
      setOpen(false); setForm({ ...blank }); refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function printPoa(r: Poa) {
    const scope = bi(POA_SCOPES.find((s) => s.value === r.scope)?.label, locale);
    const powers = (r.powers ?? []).map((p: string) => `<li>${bi(POA_POWERS.find((x) => x.value === p)?.label, locale) || p}</li>`).join("");
    const html = ar
      ? `<h1>وكالة ${scope}</h1>
<p>إنه في يوم ${r.notarised_on || "[التاريخ]"} الموافق، حضر أمام كاتب العدل ${r.notary_office || "[دائرة كاتب العدل]"}:</p>
<p><strong>الموكِّل:</strong> ${r.principal_name}${r.principal_id_number ? `، الرقم الوطني ${r.principal_id_number}` : ""}${r.principal_address ? `، العنوان ${r.principal_address}` : ""}.</p>
<p><strong>الوكيل:</strong> المحامي ${r.agent_name}${r.agent_bar_number ? `، رقم النقابة ${r.agent_bar_number}` : ""}.</p>
<p>وقرّر الموكِّل أنه قد وكّل الوكيل المذكور وكالة ${scope} للقيام بما يلي:</p>
<ol>${powers}</ol>
<p>وتسري هذه الوكالة اعتباراً من ${r.starts_on || "[تاريخ البدء]"}${r.expires_on ? ` وحتى ${r.expires_on}` : " ولحين إلغائها"}.</p>
${r.notes ? `<p>${r.notes}</p>` : ""}
<p>الموكِّل: ________________ &nbsp;&nbsp; الوكيل: ________________</p>`
      : `<h1>Power of Attorney — ${scope}</h1>
<p>On ${r.notarised_on || "[date]"}, before the Notary Public ${r.notary_office || "[notary office]"}, appeared:</p>
<p><strong>Principal:</strong> ${r.principal_name}${r.principal_id_number ? `, national ID ${r.principal_id_number}` : ""}${r.principal_address ? `, of ${r.principal_address}` : ""}.</p>
<p><strong>Agent:</strong> Advocate ${r.agent_name}${r.agent_bar_number ? `, JBA no. ${r.agent_bar_number}` : ""}.</p>
<p>The Principal appoints the Agent under a ${scope.toLowerCase()} power of attorney to do the following:</p>
<ol>${powers}</ol>
<p>This power of attorney takes effect on ${r.starts_on || "[start date]"}${r.expires_on ? ` and expires on ${r.expires_on}` : " and remains in force until revoked"}.</p>
${r.notes ? `<p>${r.notes}</p>` : ""}
<p>Principal: ________________ &nbsp;&nbsp; Agent: ________________</p>`;
    try {
      await exportDraftPdf({ org, title: r.reference || (ar ? "وكالة" : "Power of attorney"), html });
    } catch (e) { toast.error((e as Error).message); }
  }

  const statusTone: Record<string, string> = {
    active: "bg-emerald-600/10 text-emerald-700 border-emerald-600/30",
    draft: "bg-secondary text-muted-foreground",
    revoked: "bg-destructive/10 text-destructive border-destructive/30",
    expired: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  };
  const statusLabel: Record<string, string> = {
    active: ar ? "سارية" : "Active",
    draft: ar ? "مسودة" : "Draft",
    revoked: ar ? "ملغاة" : "Revoked",
    expired: ar ? "منتهية" : "Expired",
  };

  const availablePowers = powersForScope(form.scope);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "الوكالات" : "Powers of Attorney"}
        subtitle={ar
          ? "سجل وكالات الموكّلين — النطاق، الصلاحيات، كاتب العدل، وتاريخ السريان."
          : "Register client powers of attorney — scope, granted powers, notary and validity."}
        actions={
          <Button variant="gold" onClick={() => { setForm({ ...blank }); setOpen(true); }}>
            <Plus className="size-4" />{ar ? "وكالة جديدة" : "New PoA"}
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <Input className="h-9 ps-9" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={ar ? "ابحث بالموكّل أو الوكيل…" : "Search principal or agent…"} />
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Stamp className="size-5" />}
          title={ar ? "لا توجد وكالات" : "No powers of attorney"}
          description={ar
            ? "سجّل وكالة لكل موكّل لتتبّع نطاقها وصلاحياتها وتاريخ انتهائها."
            : "Register a PoA per client to track its scope, powers and expiry."}
          action={<Button size="sm" onClick={() => { setForm({ ...blank }); setOpen(true); }}>{ar ? "وكالة جديدة" : "New PoA"}</Button>}
        />
      ) : (
        <div className="card-elev overflow-x-auto rounded-xl border bg-card">
          <table className="w-full">
            <thead className="border-b bg-secondary/40 text-start">
              <tr className="text-muted-foreground">
                <th className={`${d.head} text-start`}>{ar ? "الموكّل" : "Principal"}</th>
                <th className={`${d.head} text-start`}>{ar ? "الوكيل" : "Agent"}</th>
                <th className={`${d.head} text-start`}>{ar ? "النطاق" : "Scope"}</th>
                <th className={`${d.head} text-start`}>{ar ? "السريان" : "Validity"}</th>
                <th className={`${d.head} text-start`}>{ar ? "الحالة" : "Status"}</th>
                <th className={`${d.head} text-end`} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/30">
                  <td className={d.cell}>
                    <div className="font-medium">{r.principal_name}</div>
                    {r.clients?.name && <div className="text-[10px] text-muted-foreground">{r.clients.name}</div>}
                  </td>
                  <td className={d.cell}>{r.agent_name}</td>
                  <td className={d.cell}>{bi(POA_SCOPES.find((s) => s.value === r.scope)?.label, locale)}</td>
                  <td className={d.cell}>
                    {r.starts_on || "—"}{r.expires_on ? ` → ${r.expires_on}` : ""}
                  </td>
                  <td className={d.cell}>
                    <Badge variant="outline" className={statusTone[r.status] ?? ""}>{statusLabel[r.status] ?? r.status}</Badge>
                  </td>
                  <td className={`${d.cell} text-end whitespace-nowrap`}>
                    <Button variant="ghost" size="icon" title={ar ? "طباعة" : "Print"} onClick={() => printPoa(r)}><FileDown className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" title={ar ? "تعديل" : "Edit"} onClick={() => edit(r)}><Pencil className="size-3.5" /></Button>
                    {r.status === "active" && (
                      <Button variant="ghost" size="icon" title={ar ? "إلغاء" : "Revoke"}
                        onClick={async () => {
                          if (!confirm(ar ? "إلغاء هذه الوكالة؟" : "Revoke this power of attorney?")) return;
                          await revoke({ data: { id: r.id } }); refresh();
                        }}>
                        <Ban className="size-3.5 text-amber-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title={ar ? "حذف" : "Delete"}
                      onClick={async () => {
                        if (!confirm(ar ? "حذف الوكالة؟" : "Delete PoA?")) return;
                        await del({ data: { id: r.id } }); refresh();
                      }}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? (ar ? "تعديل وكالة" : "Edit PoA") : (ar ? "وكالة جديدة" : "New PoA")}</DialogTitle></DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "الموكّل (الاسم الكامل)" : "Principal (full name)"} *</Label>
              <Input className="h-9" value={form.principal_name} onChange={(e) => setForm({ ...form, principal_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "الرقم الوطني" : "National ID"}</Label>
              <Input className="h-9" value={form.principal_id_number} onChange={(e) => setForm({ ...form, principal_id_number: e.target.value })} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">{ar ? "عنوان الموكّل" : "Principal address"}</Label>
              <Input className="h-9" value={form.principal_address} onChange={(e) => setForm({ ...form, principal_address: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "الوكيل (المحامي)" : "Agent (advocate)"} *</Label>
              <Input className="h-9" value={form.agent_name} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "رقم نقابة المحامين" : "JBA number"}</Label>
              <Input className="h-9" value={form.agent_bar_number} onChange={(e) => setForm({ ...form, agent_bar_number: e.target.value })} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{ar ? "الموكّل من العملاء" : "Link to client"}</Label>
                <button type="button" onClick={() => setNewClientOpen(true)}
                  className="text-[11px] font-medium text-gold underline-offset-2 hover:underline">
                  + {ar ? "موكّل جديد" : "New client"}
                </button>
              </div>
              <Select value={form.client_id || "none"} onValueChange={(v) => pickClient(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={ar ? "اختر موكّلاً" : "Select a client"}>
                    {form.client_id
                      ? (clients.find((c) => c.id === form.client_id)?.name ?? (ar ? "موكّل" : "Client"))
                      : (ar ? "بدون" : "None")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-1.5">
                    <Input autoFocus className="h-8" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder={ar ? "ابحث بالاسم أو الهاتف…" : "Search name or phone…"} />
                  </div>
                  <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
                  {clientOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  {clientOptions.length === 0 && (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      {ar ? "لا نتائج" : "No matches"}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{ar ? "المرجع" : "Reference"}</Label>
              <Input className="h-9" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">{ar ? "نطاق الوكالة" : "Scope"}</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as PoaScope, powers: [] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POA_SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{bi(s.label, locale)}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{bi(POA_SCOPES.find((s) => s.value === form.scope)?.blurb, locale)}</p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">{ar ? "الصلاحيات الممنوحة" : "Granted powers"}</Label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {availablePowers.map((p) => {
                  const on = form.powers.includes(p.value);
                  return (
                    <label key={p.value}
                      className={`flex cursor-pointer items-start gap-2 rounded border px-2.5 py-1.5 text-xs transition ${on ? "border-gold bg-gold/5" : "hover:bg-secondary/40"}`}>
                      <Checkbox checked={on} onCheckedChange={() =>
                        setForm({ ...form, powers: on ? form.powers.filter((x) => x !== p.value) : [...form.powers, p.value] })} />
                      <span>{bi(p.label, locale)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{ar ? "كاتب العدل" : "Notary office"}</Label>
              <Input className="h-9" value={form.notary_office} onChange={(e) => setForm({ ...form, notary_office: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "تاريخ التصديق" : "Notarised on"}</Label>
              <Input type="date" className="h-9" value={form.notarised_on} onChange={(e) => setForm({ ...form, notarised_on: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "بداية السريان" : "Starts on"}</Label>
              <Input type="date" className="h-9" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "تاريخ الانتهاء" : "Expires on"}</Label>
              <Input type="date" className="h-9" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? "الحالة" : "Status"}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["draft", "active", "revoked", "expired"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">{ar ? "ملاحظات" : "Notes"}</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={submit}>{ar ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
