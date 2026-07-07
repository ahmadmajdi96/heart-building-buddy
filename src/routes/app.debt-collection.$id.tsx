import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatusBadge, StatTile } from "@/components/app/primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Plus, Trash2, MessageSquare, User, DollarSign, Users, Send, Phone, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getDebtCase, saveDebtCase, deleteDebtCase,
  savePayer, deletePayer,
  listOrgMembersForAssignment, addAssignee, removeAssignee,
  recordDebtPayment, deleteDebtPayment,
  sendDebtSms,
  listReminderRules, saveReminderRule, deleteReminderRule,
} from "@/lib/debt-collection.functions";
import { listClients } from "@/lib/clients.functions";

export const Route = createFileRoute("/app/debt-collection/$id")({
  component: DebtCaseDetail,
});

function DebtCaseDetail() {
  const { id } = Route.useParams();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(getDebtCase);
  const { data, isLoading } = useQuery({
    queryKey: ["debt-case", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const deleteFn = useServerFn(deleteDebtCase);
  const del = useMutation({
    mutationFn: () => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success(ar ? "تم الحذف" : "Deleted"); navigate({ to: "/app/debt-collection" }); },
  });

  if (isLoading) return <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin" /></div>;
  if (!data?.case) return <div className="py-10 text-center text-muted-foreground">{ar ? "غير موجود" : "Not found"}</div>;

  const c = data.case as any;
  const collected = data.payments.reduce((a: number, p: any) => a + Number(p.amount_received || 0), 0);
  const fees = data.payments.reduce((a: number, p: any) => a + Number(p.service_fee || 0), 0);
  const forwarded = data.payments.reduce((a: number, p: any) => a + Number(p.amount_forwarded || 0), 0);

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild><Link to="/app/debt-collection"><ArrowLeft className="size-4" />{ar ? "رجوع" : "Back"}</Link></Button>
      </div>
      <PageHeader
        title={c.title}
        subtitle={c.description}
        actions={
          <>
            <StatusBadge status={c.status} />
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="size-4" />{ar ? "حذف" : "Delete"}</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{ar ? "حذف قضية التحصيل؟" : "Delete debt case?"}</AlertDialogTitle>
                  <AlertDialogDescription>{ar ? "لا يمكن التراجع." : "This cannot be undone."}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => del.mutate()}>{ar ? "حذف" : "Delete"}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatTile label={ar ? "المطلوب" : "Total"} value={`${Number(c.total_amount).toFixed(2)} ${c.currency}`} icon={<DollarSign className="size-4" />} />
        <StatTile label={ar ? "المُحصَّل" : "Collected"} value={collected.toFixed(2)} icon={<DollarSign className="size-4" />} tone="success" />
        <StatTile label={ar ? "المُحوَّل" : "Forwarded"} value={forwarded.toFixed(2)} icon={<Send className="size-4" />} />
        <StatTile label={ar ? "الرسوم" : "Service fees"} value={fees.toFixed(2)} icon={<DollarSign className="size-4" />} tone="gold" />
      </div>

      <Card className="p-5 mb-4">
        <div className="grid gap-3 md:grid-cols-4 text-sm">
          <div><div className="text-xs text-muted-foreground">{ar ? "النوع" : "Type"}</div><div className="capitalize">{c.debt_type}</div></div>
          <div><div className="text-xs text-muted-foreground">{ar ? "الاستحقاق" : "Due date"}</div><div>{c.due_date ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{ar ? "العميل" : "Client"}</div><div>{c.clients?.name ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{ar ? "المرجع" : "Reference"}</div><div>{c.reference ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{ar ? "المستلم النهائي" : "Forwarder"}</div><div>{c.forwarder_name ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{ar ? "بيانات المستلم" : "Forwarder contact"}</div><div>{c.forwarder_contact ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">{ar ? "الرسوم" : "Fee"}</div><div>{c.service_fee_value}{c.service_fee_type === "percent" ? "%" : ` ${c.currency}`}</div></div>
        </div>
      </Card>

      <Tabs defaultValue="payers">
        <TabsList>
          <TabsTrigger value="payers">{ar ? "الدافعون" : "Payers"} ({data.payers.length}/25)</TabsTrigger>
          <TabsTrigger value="team">{ar ? "الفريق" : "Team"} ({data.assignees.length})</TabsTrigger>
          <TabsTrigger value="payments">{ar ? "المدفوعات" : "Payments"} ({data.payments.length})</TabsTrigger>
          <TabsTrigger value="sms">{ar ? "رسائل نصية" : "SMS log"} ({data.sms.length})</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="size-4" />{ar ? "الإعدادات" : "Settings"}</TabsTrigger>
        </TabsList>

        <TabsContent value="payers">
          <PayersTab caseId={id} caseData={c} payers={data.payers} assignees={data.assignees} ar={ar} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab caseId={id} assignees={data.assignees} ar={ar} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab caseId={id} caseData={c} payers={data.payers} payments={data.payments} ar={ar} />
        </TabsContent>
        <TabsContent value="sms">
          <SmsTab sms={data.sms} ar={ar} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab caseId={id} caseData={c} ar={ar} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------- Payers -------------- */

function PayersTab({ caseId, caseData, payers, assignees, ar }: any) {
  const qc = useQueryClient();
  const saveFn = useServerFn(savePayer);
  const delFn = useServerFn(deletePayer);
  const sendFn = useServerFn(sendDebtSms);
  const listClientsFn = useServerFn(listClients);
  const [openAdd, setOpenAdd] = useState(false);
  const [openSms, setOpenSms] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const { data: clients } = useQuery({ queryKey: ["clients-lite"], queryFn: () => listClientsFn() });

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { toast.success(ar ? "تم الحفظ" : "Saved"); qc.invalidateQueries({ queryKey: ["debt-case", caseId] }); setOpenAdd(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success(ar ? "تم الحذف" : "Removed"); qc.invalidateQueries({ queryKey: ["debt-case", caseId] }); },
  });
  const send = useMutation({
    mutationFn: (v: any) => sendFn({ data: v }),
    onSuccess: (r: any) => {
      const sent = r.results.filter((x: any) => x.status === "sent").length;
      const failed = r.results.length - sent;
      toast.success(`${ar ? "تم الإرسال" : "Sent"}: ${sent}${failed ? ` · ${ar ? "فشل" : "failed"}: ${failed}` : ""}`);
      qc.invalidateQueries({ queryKey: ["debt-case", caseId] });
      setOpenSms(false); setSelected([]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Send failed"),
  });

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">{ar ? "حتى 25 دافعاً لكل قضية" : "Up to 25 payers per case"}</div>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <Dialog open={openSms} onOpenChange={setOpenSms}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><MessageSquare className="size-4" />{ar ? "إرسال رسائل نصية" : "Send SMS"} ({selected.length})</Button></DialogTrigger>
              <SendSmsDialog caseId={caseId} caseData={caseData} payerIds={selected} assigneeUserIds={[]}
                onSubmit={(v: any) => send.mutate(v)} pending={send.isPending} ar={ar} />
            </Dialog>
          )}
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button size="sm" variant="gold" disabled={payers.length >= 25}><Plus className="size-4" />{ar ? "إضافة دافع" : "Add payer"}</Button>
            </DialogTrigger>
            <PayerDialog caseId={caseId} clients={clients ?? []} onSubmit={(v: any) => save.mutate(v)} pending={save.isPending} ar={ar} />
          </Dialog>
        </div>
      </div>
      {payers.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{ar ? "لا يوجد دافعون بعد" : "No payers yet"}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>{ar ? "الاسم" : "Name"}</TableHead>
              <TableHead>{ar ? "الهاتف" : "Phone"}</TableHead>
              <TableHead>{ar ? "الاستحقاق" : "Due date"}</TableHead>
              <TableHead className="text-end">{ar ? "المستحق" : "Due"}</TableHead>
              <TableHead className="text-end">{ar ? "المدفوع" : "Paid"}</TableHead>
              <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
              <TableHead>{ar ? "آخر تذكير" : "Last reminder"}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payers.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Checkbox checked={selected.includes(p.id)} onCheckedChange={(v: boolean | "indeterminate") => setSelected((s) => v ? [...s, p.id] : s.filter((x) => x !== p.id))} />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  {p.clients && <div className="text-xs text-muted-foreground">{ar ? "عميل: " : "Client: "}{p.clients.name}</div>}
                </TableCell>
                <TableCell><span className="tabular-nums">{p.phone ?? "—"}</span></TableCell>
                <TableCell>{p.due_date ?? "—"}</TableCell>
                <TableCell className="text-end tabular-nums">{Number(p.amount_due).toFixed(2)}</TableCell>
                <TableCell className="text-end tabular-nums">{Number(p.amount_paid).toFixed(2)}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.last_reminder_sent_at ? new Date(p.last_reminder_sent_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}><Trash2 className="size-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function PayerDialog({ caseId, clients, onSubmit, pending, ar }: any) {
  const [form, setForm] = useState({
    case_id: caseId, client_id: "", name: "", phone: "", email: "",
    amount_due: 0, due_date: "", status: "pending" as const, notes: "",
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{ar ? "إضافة دافع" : "Add payer"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label>{ar ? "عميل موجود (اختياري)" : "Existing client (optional)"}</Label>
          <Select value={form.client_id || "none"} onValueChange={(v) => {
            if (v === "none") { setForm({ ...form, client_id: "" }); return; }
            const cl = clients.find((c: any) => c.id === v);
            setForm({ ...form, client_id: v, name: cl?.name ?? form.name, phone: cl?.phone ?? form.phone, email: cl?.email ?? form.email });
          }}>
            <SelectTrigger><SelectValue placeholder={ar ? "اختر" : "Select or leave blank"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{ar ? "بدون / يدوي" : "None / free-form"}</SelectItem>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>{ar ? "الاسم" : "Name"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{ar ? "الهاتف (E.164)" : "Phone (E.164)"}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+15551234567" /></div>
          <div><Label>{ar ? "البريد" : "Email"}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{ar ? "المبلغ المستحق" : "Amount due"}</Label><Input type="number" step="0.01" value={form.amount_due} onChange={(e) => setForm({ ...form, amount_due: Number(e.target.value) })} /></div>
          <div><Label>{ar ? "الاستحقاق" : "Due date"}</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
        </div>
        <div><Label>{ar ? "ملاحظات" : "Notes"}</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button variant="gold" disabled={pending || !form.name} onClick={() => onSubmit(form)}>{pending ? <Loader2 className="size-4 animate-spin" /> : ar ? "إضافة" : "Add"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* -------------- Team assignees -------------- */

function TeamTab({ caseId, assignees, ar }: any) {
  const qc = useQueryClient();
  const listMembersFn = useServerFn(listOrgMembersForAssignment);
  const addFn = useServerFn(addAssignee);
  const removeFn = useServerFn(removeAssignee);
  const sendFn = useServerFn(sendDebtSms);
  const [openAdd, setOpenAdd] = useState(false);
  const [openSms, setOpenSms] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const { data: members } = useQuery({ queryKey: ["org-members-assign"], queryFn: () => listMembersFn() });

  const add = useMutation({
    mutationFn: (v: any) => addFn({ data: v }),
    onSuccess: () => { toast.success(ar ? "تمت الإضافة" : "Assigned"); qc.invalidateQueries({ queryKey: ["debt-case", caseId] }); setOpenAdd(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const remove = useMutation({
    mutationFn: (user_id: string) => removeFn({ data: { case_id: caseId, user_id } }),
    onSuccess: () => { toast.success(ar ? "تمت الإزالة" : "Removed"); qc.invalidateQueries({ queryKey: ["debt-case", caseId] }); },
  });
  const send = useMutation({
    mutationFn: (v: any) => sendFn({ data: v }),
    onSuccess: (r: any) => {
      const sent = r.results.filter((x: any) => x.status === "sent").length;
      const failed = r.results.length - sent;
      toast.success(`${ar ? "تم الإرسال" : "Sent"}: ${sent}${failed ? ` · ${ar ? "فشل" : "failed"}: ${failed}` : ""}`);
      setOpenSms(false); setSelected([]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const availableMembers = (members ?? []).filter((m: any) => !assignees.some((a: any) => a.user_id === m.user_id));

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">{ar ? "الفريق المعيَّن للقضية" : "Team members working on this case"}</div>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <Dialog open={openSms} onOpenChange={setOpenSms}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><MessageSquare className="size-4" />{ar ? "إشعار عبر رسائل نصية" : "Notify via SMS"}</Button></DialogTrigger>
              <SendSmsDialog caseId={caseId} caseData={{ title: "" }} payerIds={[]} assigneeUserIds={selected}
                onSubmit={(v: any) => send.mutate(v)} pending={send.isPending} ar={ar} defaultKind="assignment" />
            </Dialog>
          )}
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4" />{ar ? "تعيين عضو" : "Assign member"}</Button></DialogTrigger>
            <AssignDialog caseId={caseId} members={availableMembers} onSubmit={(v: any) => add.mutate(v)} pending={add.isPending} ar={ar} />
          </Dialog>
        </div>
      </div>
      {assignees.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{ar ? "لم يتم تعيين أعضاء" : "No members assigned"}</div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {assignees.map((a: any) => (
            <div key={a.user_id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Checkbox checked={selected.includes(a.user_id)} onCheckedChange={(v: boolean | "indeterminate") => setSelected((s) => v ? [...s, a.user_id] : s.filter((x) => x !== a.user_id))} />
                <div>
                  <div className="font-medium flex items-center gap-2"><User className="size-3.5 text-muted-foreground" />{a._name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="capitalize">{a.role}</span>
                    {a.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{a.phone}</span>}
                    {!a.phone && <span className="text-warning">{ar ? "لا يوجد رقم رسائل نصية" : "No phone number"}</span>}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(a.user_id)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AssignDialog({ caseId, members, onSubmit, pending, ar }: any) {
  const [form, setForm] = useState({ case_id: caseId, user_id: "", role: "collector", phone: "", notify_sms: true });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{ar ? "تعيين عضو فريق" : "Assign team member"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label>{ar ? "العضو" : "Member"}</Label>
          <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
            <SelectTrigger><SelectValue placeholder={ar ? "اختر" : "Select"} /></SelectTrigger>
            <SelectContent>{members.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>{ar ? "الدور" : "Role"}</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">{ar ? "قائد" : "Lead"}</SelectItem>
              <SelectItem value="collector">{ar ? "محصِّل" : "Collector"}</SelectItem>
              <SelectItem value="viewer">{ar ? "مشاهد" : "Viewer"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{ar ? "هاتف الإشعار (E.164)" : "Notification phone (E.164)"}</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+15551234567" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="notify" checked={form.notify_sms} onCheckedChange={(v: boolean | "indeterminate") => setForm({ ...form, notify_sms: !!v })} />
          <Label htmlFor="notify" className="cursor-pointer">{ar ? "إشعار عبر رسائل نصية" : "Notify via SMS"}</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="gold" disabled={pending || !form.user_id} onClick={() => onSubmit(form)}>{pending ? <Loader2 className="size-4 animate-spin" /> : ar ? "تعيين" : "Assign"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* -------------- Payments -------------- */

function PaymentsTab({ caseId, caseData, payers, payments, ar }: any) {
  const qc = useQueryClient();
  const recordFn = useServerFn(recordDebtPayment);
  const delFn = useServerFn(deleteDebtPayment);
  const [openAdd, setOpenAdd] = useState(false);

  const record = useMutation({
    mutationFn: (v: any) => recordFn({ data: v }),
    onSuccess: () => { toast.success(ar ? "تم تسجيل الدفعة" : "Payment recorded"); qc.invalidateQueries({ queryKey: ["debt-case", caseId] }); setOpenAdd(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success(ar ? "تم الحذف" : "Deleted"); qc.invalidateQueries({ queryKey: ["debt-case", caseId] }); },
  });

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{ar ? "المدفوعات المُستلمة (المُحوَّل + رسوم الخدمة)" : "Received payments (forwarded + service fee)"}</div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild><Button size="sm" variant="gold"><Plus className="size-4" />{ar ? "تسجيل دفعة" : "Record payment"}</Button></DialogTrigger>
          <PaymentDialog caseId={caseId} caseData={caseData} payers={payers} onSubmit={(v: any) => record.mutate(v)} pending={record.isPending} ar={ar} />
        </Dialog>
      </div>
      {payments.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{ar ? "لا توجد مدفوعات" : "No payments yet"}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ar ? "التاريخ" : "Date"}</TableHead>
              <TableHead>{ar ? "الدافع" : "Payer"}</TableHead>
              <TableHead className="text-end">{ar ? "المُستلم" : "Received"}</TableHead>
              <TableHead className="text-end">{ar ? "الرسوم" : "Fee"}</TableHead>
              <TableHead className="text-end">{ar ? "المُحوَّل" : "Forwarded"}</TableHead>
              <TableHead>{ar ? "المستلم النهائي" : "Forwarder"}</TableHead>
              <TableHead>{ar ? "الطريقة" : "Method"}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p: any) => {
              const payer = payers.find((x: any) => x.id === p.payer_id);
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.paid_at}</TableCell>
                  <TableCell>{payer?.name ?? "—"}</TableCell>
                  <TableCell className="text-end tabular-nums">{Number(p.amount_received).toFixed(2)}</TableCell>
                  <TableCell className="text-end tabular-nums text-gold">{Number(p.service_fee).toFixed(2)}</TableCell>
                  <TableCell className="text-end tabular-nums">{Number(p.amount_forwarded).toFixed(2)}</TableCell>
                  <TableCell>{p.forwarder_name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}><Trash2 className="size-4" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function PaymentDialog({ caseId, caseData, payers, onSubmit, pending, ar }: any) {
  const [form, setForm] = useState({
    case_id: caseId, payer_id: "", amount_received: 0, service_fee: 0, amount_forwarded: 0,
    forwarder_name: caseData.forwarder_name ?? "", method: "bank_transfer" as const,
    reference: "", paid_at: new Date().toISOString().slice(0, 10),
    currency: caseData.currency ?? "USD", notes: "",
  });

  function autoCompute(received: number) {
    const feeType = caseData.service_fee_type;
    const feeVal = Number(caseData.service_fee_value || 0);
    const fee = feeType === "percent" ? Number(((received * feeVal) / 100).toFixed(2)) : Math.min(feeVal, received);
    const forwarded = Number((received - fee).toFixed(2));
    return { fee, forwarded };
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{ar ? "تسجيل دفعة" : "Record payment"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label>{ar ? "الدافع" : "Payer"}</Label>
          <Select value={form.payer_id || "none"} onValueChange={(v) => setForm({ ...form, payer_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{ar ? "غير محدد" : "Unassigned"}</SelectItem>
              {payers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>{ar ? "المبلغ المُستلم" : "Received"}</Label>
            <Input type="number" step="0.01" value={form.amount_received} onChange={(e) => {
              const v = Number(e.target.value);
              const { fee, forwarded } = autoCompute(v);
              setForm({ ...form, amount_received: v, service_fee: fee, amount_forwarded: forwarded });
            }} />
          </div>
          <div>
            <Label>{ar ? "الرسوم" : "Service fee"}</Label>
            <Input type="number" step="0.01" value={form.service_fee} onChange={(e) => setForm({ ...form, service_fee: Number(e.target.value), amount_forwarded: Number((form.amount_received - Number(e.target.value)).toFixed(2)) })} />
          </div>
          <div>
            <Label>{ar ? "المُحوَّل" : "Forwarded"}</Label>
            <Input type="number" step="0.01" value={form.amount_forwarded} onChange={(e) => setForm({ ...form, amount_forwarded: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{ar ? "المستلم النهائي" : "Forwarder name"}</Label><Input value={form.forwarder_name} onChange={(e) => setForm({ ...form, forwarder_name: e.target.value })} /></div>
          <div><Label>{ar ? "الطريقة" : "Method"}</Label>
            <Select value={form.method} onValueChange={(v: any) => setForm({ ...form, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{ar ? "التاريخ" : "Paid at"}</Label><Input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} /></div>
          <div><Label>{ar ? "المرجع" : "Reference"}</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
        </div>
        <div><Label>{ar ? "ملاحظات" : "Notes"}</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button variant="gold" disabled={pending || !form.amount_received} onClick={() => onSubmit(form)}>{pending ? <Loader2 className="size-4 animate-spin" /> : ar ? "تسجيل" : "Record"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* -------------- SMS -------------- */

function SmsTab({ sms, ar }: any) {
  return (
    <Card className="p-4">
      {sms.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{ar ? "لا توجد رسائل رسائل نصية مُرسلة" : "No SMS messages sent yet"}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ar ? "الوقت" : "Sent at"}</TableHead>
              <TableHead>{ar ? "الهاتف" : "Phone"}</TableHead>
              <TableHead>{ar ? "النوع" : "Kind"}</TableHead>
              <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
              <TableHead>{ar ? "النص" : "Message"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sms.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="text-xs">{new Date(s.sent_at).toLocaleString()}</TableCell>
                <TableCell className="tabular-nums">{s.phone}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{s.kind.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell>
                  {s.status === "sent" ? <Badge className="bg-success/15 text-success">sent</Badge>
                    : <Badge variant="destructive" title={s.error ?? ""}>failed</Badge>}
                </TableCell>
                <TableCell className="max-w-md truncate text-xs">{s.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function SendSmsDialog({ caseId, caseData, payerIds, assigneeUserIds, onSubmit, pending, ar, defaultKind = "manual" }: any) {
  const defaultMsg = defaultKind === "assignment"
    ? (ar ? `تم تعيينك على قضية تحصيل: ${caseData.title || ""}` : `You've been assigned to debt collection case: ${caseData.title || ""}`)
    : (ar ? `تذكير بمدفوعات مستحقة${caseData.title ? ` — ${caseData.title}` : ""}` : `Payment reminder${caseData.title ? ` — ${caseData.title}` : ""}`);
  const [form, setForm] = useState({
    case_id: caseId, payer_ids: payerIds, assignee_user_ids: assigneeUserIds,
    message: defaultMsg, from: "", kind: defaultKind,
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{ar ? "إرسال رسائل نصية عبر Twilio" : "Send SMS via Twilio"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label>{ar ? "رقم رسائل نصية المُرسِل (Twilio, E.164)" : "SMS sender (Twilio, E.164)"}</Label>
          <Input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} placeholder="+15558675310" />
        </div>
        <div>
          <Label>{ar ? "الرسالة" : "Message"}</Label>
          <Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <div className="mt-1 text-xs text-muted-foreground">{form.message.length} / 1600</div>
        </div>
        <div className="text-xs text-muted-foreground">
          {ar ? "سيتم إرسالها إلى" : "Recipients"}: {payerIds.length} {ar ? "دافع" : "payer(s)"} · {assigneeUserIds.length} {ar ? "عضو فريق" : "team member(s)"}
        </div>
      </div>
      <DialogFooter>
        <Button variant="gold" disabled={pending || !form.from || !form.message} onClick={() => onSubmit(form)}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" />{ar ? "إرسال" : "Send"}</>}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* -------------- Settings: reminder rules -------------- */

// Friendly tokens use bracketed English (works for both locales in UI) and
// map to underlying template vars stored in the database.
const TEMPLATE_VARS: { key: string; friendly: string; label: { ar: string; en: string }; sample: string }[] = [
  { key: "{{name}}",       friendly: "[Payer name]",   label: { ar: "اسم الدافع",   en: "Payer name"        }, sample: "Ahmad" },
  { key: "{{amount_due}}", friendly: "[Amount]",       label: { ar: "المبلغ",       en: "Amount"            }, sample: "500.00" },
  { key: "{{amount_paid}}",friendly: "[Amount paid]",  label: { ar: "المدفوع",      en: "Amount paid"       }, sample: "0.00" },
  { key: "{{balance}}",    friendly: "[Balance]",      label: { ar: "المتبقي",      en: "Remaining balance" }, sample: "500.00" },
  { key: "{{due_date}}",   friendly: "[Due date]",     label: { ar: "تاريخ الاستحقاق", en: "Due date"       }, sample: "2026-07-15" },
  { key: "{{case_title}}", friendly: "[Case]",         label: { ar: "القضية",       en: "Case title"        }, sample: "Rental arrears" },
  { key: "{{currency}}",   friendly: "[Currency]",     label: { ar: "العملة",       en: "Currency"          }, sample: "JOD" },
  { key: "{{reference}}",  friendly: "[Reference]",    label: { ar: "المرجع",       en: "Case reference"    }, sample: "REF-001" },
];

function toFriendly(tpl: string) {
  let out = tpl;
  const sorted = [...TEMPLATE_VARS].sort((a, b) => b.key.length - a.key.length);
  for (const v of sorted) out = out.split(v.key).join(v.friendly);
  return out;
}
function toRaw(tpl: string) {
  let out = tpl;
  const sorted = [...TEMPLATE_VARS].sort((a, b) => b.friendly.length - a.friendly.length);
  for (const v of sorted) out = out.split(v.friendly).join(v.key);
  return out;
}
function renderPreview(tpl: string) {
  let out = toRaw(tpl);
  const sorted = [...TEMPLATE_VARS].sort((a, b) => b.key.length - a.key.length);
  for (const v of sorted) out = out.split(v.key).join(v.sample);
  return out;
}

const REMINDER_PRESETS: { id: string; label: { ar: string; en: string }; template: string }[] = [
  { id: "friendly", label: { ar: "لبق ومحترم", en: "Friendly & polite" },
    template: "Hi [Payer name], a friendly reminder that [Amount] [Currency] is due on [Due date] for [Case]. Please let us know if you have any questions." },
  { id: "firm", label: { ar: "رسمي وحازم", en: "Formal & firm" },
    template: "Dear [Payer name], your payment of [Amount] [Currency] for [Case] is due on [Due date]. Kindly arrange settlement before that date to avoid further action." },
  { id: "overdue", label: { ar: "متأخر السداد", en: "Overdue notice" },
    template: "[Payer name], the payment of [Amount] [Currency] for [Case] was due on [Due date] and is now overdue. Please contact us immediately." },
];

function offsetLabel(days: number, ar: boolean) {
  if (days === 0) return ar ? "في يوم الاستحقاق" : "On due date";
  if (days < 0) return ar ? `${Math.abs(days)} يوم قبل الاستحقاق` : `${Math.abs(days)} day(s) before due`;
  return ar ? `${days} يوم بعد الاستحقاق` : `${days} day(s) after due`;
}

function SettingsTab({ caseId, caseData, ar }: any) {
  const qc = useQueryClient();
  const listFn = useServerFn(listReminderRules);
  const saveFn = useServerFn(saveReminderRule);
  const delFn = useServerFn(deleteReminderRule);
  const [editing, setEditing] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["debt-reminder-rules", caseId],
    queryFn: () => listFn({ data: { case_id: caseId } }),
  });

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => {
      toast.success(ar ? "تم الحفظ" : "Saved");
      qc.invalidateQueries({ queryKey: ["debt-reminder-rules", caseId] });
      setOpenDialog(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success(ar ? "تم الحذف" : "Deleted");
      qc.invalidateQueries({ queryKey: ["debt-reminder-rules", caseId] });
    },
  });

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{ar ? "قواعد التذكير التلقائي" : "Automatic reminder rules"}</div>
          <div className="text-xs text-muted-foreground">
            {ar
              ? "أضف عدة تذكيرات مع محتوى مخصص. سيتم إرسالها تلقائياً للدافعين حسب تاريخ الاستحقاق."
              : "Add multiple reminders with custom message content. Sent to payers automatically based on their due date."}
          </div>
        </div>
        <Dialog open={openDialog} onOpenChange={(v) => { setOpenDialog(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="gold" onClick={() => setEditing(null)}>
              <Plus className="size-4" />{ar ? "إضافة تذكير" : "Add reminder"}
            </Button>
          </DialogTrigger>
          <ReminderRuleDialog
            caseId={caseId}
            initial={editing}
            onSubmit={(v: any) => save.mutate(v)}
            pending={save.isPending}
            ar={ar}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-10 text-center"><Loader2 className="size-5 animate-spin inline" /></div>
      ) : (rules ?? []).length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد قواعد بعد. أضف واحدة للبدء." : "No rules yet. Add one to start."}
        </div>
      ) : (
        <div className="space-y-2">
          {(rules ?? []).map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{r.label}</div>
                  <Badge variant="outline" className="text-xs">{offsetLabel(r.offset_days, ar)}</Badge>
                  {!r.active && <Badge variant="secondary" className="text-xs">{ar ? "معطل" : "Inactive"}</Badge>}
                </div>
                <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{toFriendly(r.message_template)}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(r); setOpenDialog(true); }}>
                  {ar ? "تعديل" : "Edit"}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">{ar ? "الحقول المتاحة (تُملأ تلقائياً)" : "Available fields (auto-filled)"}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {TEMPLATE_VARS.map((v) => (
            <code key={v.key} className="rounded bg-background px-1.5 py-0.5">{v.friendly}</code>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ReminderRuleDialog({ caseId, initial, onSubmit, pending, ar }: any) {
  const initialTpl = initial?.message_template ?? "Hi [Payer name], this is a reminder that [Amount] [Currency] is due on [Due date] for [Case].";
  const [form, setForm] = useState(() => ({
    id: initial?.id,
    case_id: caseId,
    label: initial?.label ?? "",
    offset_days: initial?.offset_days ?? -3,
    kind: initial?.kind ?? "reminder_upcoming",
    // Friendly (bracketed) text in the editor; converted to raw tokens on save.
    message_template: toFriendly(initialTpl),
    active: initial?.active ?? true,
  }));
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const insertVar = (v: string) => {
    const el = textareaRef.current;
    if (!el) { setForm((f) => ({ ...f, message_template: f.message_template + v })); return; }
    const start = el.selectionStart ?? form.message_template.length;
    const end = el.selectionEnd ?? form.message_template.length;
    const next = form.message_template.slice(0, start) + v + form.message_template.slice(end);
    setForm({ ...form, message_template: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + v.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{initial ? (ar ? "تعديل التذكير" : "Edit reminder") : (ar ? "تذكير جديد" : "New reminder")}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label>{ar ? "التسمية" : "Label"}</Label>
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={ar ? "مثال: تذكير قبل ٣ أيام" : "e.g. 3-day advance reminder"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{ar ? "التوقيت (أيام مقارنة بالاستحقاق)" : "Timing (days vs due date)"}</Label>
            <Input type="number" value={form.offset_days} onChange={(e) => setForm({ ...form, offset_days: Number(e.target.value) })} />
            <div className="mt-1 text-xs text-muted-foreground">{offsetLabel(form.offset_days, ar)}</div>
          </div>
          <div>
            <Label>{ar ? "النوع" : "Kind"}</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reminder_upcoming">{ar ? "قبل الاستحقاق" : "Upcoming"}</SelectItem>
                <SelectItem value="reminder_due">{ar ? "يوم الاستحقاق" : "Due"}</SelectItem>
                <SelectItem value="reminder_overdue">{ar ? "متأخر" : "Overdue"}</SelectItem>
                <SelectItem value="manual">{ar ? "يدوي" : "Manual"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">{ar ? "قوالب جاهزة" : "Quick presets"}</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {REMINDER_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm({ ...form, message_template: p.template })}
                className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs hover:border-gold/50 hover:bg-gold/5"
              >
                {ar ? p.label.ar : p.label.en}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>{ar ? "محتوى الرسالة" : "Message content"}</Label>
          <Textarea
            ref={textareaRef}
            rows={5}
            value={form.message_template}
            onChange={(e) => setForm({ ...form, message_template: e.target.value })}
            placeholder={ar ? "اكتب رسالتك، وانقر على أي حقل أدناه لإدراجه." : "Type your message and click a field below to insert it."}
          />
          <div className="mt-2">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              {ar ? "أدرج حقلاً" : "Insert a field"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVar(v.friendly)}
                  className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs hover:border-gold/50 hover:bg-gold/5"
                  title={ar ? v.label.ar : v.label.en}
                >
                  {v.friendly}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-md border border-dashed border-border/60 bg-muted/20 p-3">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              {ar ? "معاينة (بيانات تجريبية)" : "Preview (with sample data)"}
            </div>
            <div className="whitespace-pre-wrap text-sm">{renderPreview(form.message_template) || <span className="text-muted-foreground">—</span>}</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
          <div>
            <div className="text-sm font-medium">{ar ? "مفعل" : "Active"}</div>
            <div className="text-xs text-muted-foreground">{ar ? "أوقف مؤقتاً بدون حذف" : "Pause without deleting"}</div>
          </div>
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="gold"
          disabled={pending || !form.label || !form.message_template}
          onClick={() => onSubmit({ ...form, message_template: toRaw(form.message_template) })}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : (ar ? "حفظ" : "Save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
