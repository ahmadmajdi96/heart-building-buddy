import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { useOrg } from "@/lib/org-context";
import { PageHeader, StatusBadge, StatTile } from "@/components/app/primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Wallet, Users, TrendingUp, Search } from "lucide-react";
import { toast } from "sonner";
import { listDebtCases, saveDebtCase } from "@/lib/debt-collection.functions";
import { listClients } from "@/lib/clients.functions";

export const Route = createFileRoute("/app/debt-collection/")({
  component: DebtCollectionListPage,
});

function DebtCollectionListPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { org, loading: orgLoading } = useOrg();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [q, setQ] = useState("");

  const listFn = useServerFn(listDebtCases);
  const listClientsFn = useServerFn(listClients);
  const saveFn = useServerFn(saveDebtCase);

  const { data: cases, isLoading } = useQuery({
    queryKey: ["debt-cases"],
    queryFn: () => listFn(),
    enabled: !!org,
  });
  const { data: clients } = useQuery({
    queryKey: ["clients-lite"],
    queryFn: () => listClientsFn(),
    enabled: !!org,
  });

  const create = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: (row: any) => {
      toast.success(ar ? "تم إنشاء قضية التحصيل" : "Debt case created");
      qc.invalidateQueries({ queryKey: ["debt-cases"] });
      setOpenNew(false);
      if (row?.id) navigate({ to: "/app/debt-collection/$id", params: { id: row.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const filtered = (cases ?? []).filter((c: any) =>
    !q || c.title?.toLowerCase().includes(q.toLowerCase()) || c.reference?.toLowerCase().includes(q.toLowerCase())
  );

  const totalCollected = (cases ?? []).reduce((a: number, c: any) => a + Number(c._collected || 0), 0);
  const totalFees = (cases ?? []).reduce((a: number, c: any) => a + Number(c._fees || 0), 0);
  const activeCount = (cases ?? []).filter((c: any) => c.status === "active" || c.status === "partial").length;

  if (orgLoading) return <div className="grid place-items-center py-20"><Loader2 className="size-6 animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title={ar ? "تحصيل الديون" : "Debt Collection"}
        subtitle={ar ? "إدارة ملفات تحصيل الإيجارات والقروض والمدفوعات المتأخرة" : "Manage rent, loan, and overdue payment collection cases"}
        actions={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button variant="gold"><Plus className="size-4" />{ar ? "قضية جديدة" : "New case"}</Button>
            </DialogTrigger>
            <NewCaseDialog clients={clients ?? []} onSubmit={(v: any) => create.mutate(v)} pending={create.isPending} ar={ar} />
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatTile label={ar ? "قضايا نشطة" : "Active cases"} value={String(activeCount)} icon={<Wallet className="size-4" />} tone="gold" />
        <StatTile label={ar ? "إجمالي المُحصَّل" : "Total collected"} value={totalCollected.toFixed(2)} icon={<TrendingUp className="size-4" />} tone="success" />
        <StatTile label={ar ? "رسوم الخدمة" : "Service fees earned"} value={totalFees.toFixed(2)} icon={<Users className="size-4" />} />
      </div>

      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "بحث بالعنوان أو المرجع" : "Search title or reference"} className="ps-9" />
          </div>
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{ar ? "لا توجد قضايا" : "No cases yet"}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? "العنوان" : "Title"}</TableHead>
                <TableHead>{ar ? "العميل" : "Client"}</TableHead>
                <TableHead>{ar ? "النوع" : "Type"}</TableHead>
                <TableHead>{ar ? "الاستحقاق" : "Due"}</TableHead>
                <TableHead className="text-end">{ar ? "المبلغ" : "Amount"}</TableHead>
                <TableHead className="text-end">{ar ? "المُحصَّل" : "Collected"}</TableHead>
                <TableHead>{ar ? "الدافعون" : "Payers"}</TableHead>
                <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate({ to: "/app/debt-collection/$id", params: { id: c.id } })}>
                  <TableCell className="font-medium">
                    <Link to="/app/debt-collection/$id" params={{ id: c.id }} className="hover:text-gold">{c.title}</Link>
                    {c.reference && <div className="text-xs text-muted-foreground">{c.reference}</div>}
                  </TableCell>
                  <TableCell>{c.clients?.name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{c.debt_type}</TableCell>
                  <TableCell>{c.due_date ?? "—"}</TableCell>
                  <TableCell className="text-end tabular-nums">{Number(c.total_amount).toFixed(2)} {c.currency}</TableCell>
                  <TableCell className="text-end tabular-nums">{Number(c._collected).toFixed(2)}</TableCell>
                  <TableCell>{c._payer_count} / 25</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function NewCaseDialog({ clients, onSubmit, pending, ar }: { clients: any[]; onSubmit: (v: any) => void; pending: boolean; ar: boolean }) {
  const [form, setForm] = useState({
    title: "", description: "", debt_type: "rent" as const, total_amount: 0, currency: "USD",
    client_id: "", service_fee_type: "percent" as const, service_fee_value: 10,
    due_date: "", forwarder_name: "", forwarder_contact: "", reference: "",
  });
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{ar ? "قضية تحصيل جديدة" : "New debt collection case"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>{ar ? "العنوان" : "Title"}</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>{ar ? "العميل الرئيسي" : "Lead client"}</Label>
          <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder={ar ? "اختر" : "Select"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{ar ? "بدون" : "None"}</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{ar ? "النوع" : "Debt type"}</Label>
          <Select value={form.debt_type} onValueChange={(v: any) => setForm({ ...form, debt_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rent">{ar ? "إيجار" : "Rent"}</SelectItem>
              <SelectItem value="loan">{ar ? "قرض" : "Loan"}</SelectItem>
              <SelectItem value="service">{ar ? "خدمة" : "Service"}</SelectItem>
              <SelectItem value="installment">{ar ? "قسط" : "Installment"}</SelectItem>
              <SelectItem value="other">{ar ? "أخرى" : "Other"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{ar ? "المبلغ الإجمالي" : "Total amount"}</Label>
          <Input type="number" step="0.01" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })} />
        </div>
        <div>
          <Label>{ar ? "العملة" : "Currency"}</Label>
          <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <Label>{ar ? "تاريخ الاستحقاق" : "Due date"}</Label>
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </div>
        <div>
          <Label>{ar ? "المرجع" : "Reference"}</Label>
          <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </div>
        <div>
          <Label>{ar ? "نوع رسوم الخدمة" : "Service fee type"}</Label>
          <Select value={form.service_fee_type} onValueChange={(v: any) => setForm({ ...form, service_fee_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">{ar ? "نسبة %" : "Percent %"}</SelectItem>
              <SelectItem value="fixed">{ar ? "مبلغ ثابت" : "Fixed amount"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{ar ? "قيمة الرسوم" : "Fee value"}</Label>
          <Input type="number" step="0.01" value={form.service_fee_value} onChange={(e) => setForm({ ...form, service_fee_value: Number(e.target.value) })} />
        </div>
        <div>
          <Label>{ar ? "المستلم النهائي (المُحوَّل إليه)" : "Forwarder (recipient)"}</Label>
          <Input value={form.forwarder_name} onChange={(e) => setForm({ ...form, forwarder_name: e.target.value })} />
        </div>
        <div>
          <Label>{ar ? "بيانات المستلم" : "Forwarder contact"}</Label>
          <Input value={form.forwarder_contact} onChange={(e) => setForm({ ...form, forwarder_contact: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>{ar ? "الوصف" : "Description"}</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="gold" disabled={pending || !form.title} onClick={() => onSubmit(form)}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : ar ? "إنشاء" : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
