import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatusBadge } from "@/components/app/primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, ArrowLeft, Users, FileText, CalendarDays, Clock, Receipt,
  AlertTriangle, Crown, Eye, ExternalLink, Download, Check, XCircle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { getWorkspaceCase } from "@/lib/workspace.functions";
import { getSignedDownloadUrl } from "@/lib/documents.functions";
import { acceptDraftInvoice, rejectDraftInvoice } from "@/lib/draft-invoices.functions";
import { setInvoiceStatus } from "@/lib/invoicing.functions";
import { getTimeEntriesByIds } from "@/lib/time-entries.functions";
import { supabase } from "@/integrations/supabase/client";
import { DocumentPreviewBody } from "@/components/documents/preview-body";
import { DocumentPreview } from "@/components/financials/document-preview";

export const Route = createFileRoute("/app/workspace/$caseId")({
  component: WorkspaceCasePage,
});

function initials(s?: string | null) {
  if (!s) return "·";
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "·";
}
function fmtBytes(n: number) {
  if (!n) return "—";
  const k = 1024; const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(1)} ${u[i]}`;
}
function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fmtMoney(n: number, c: string) {
  return `${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${c}`;
}

function WorkspaceCasePage() {
  const { caseId } = Route.useParams();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const load = useServerFn(getWorkspaceCase);
  const signedUrl = useServerFn(getSignedDownloadUrl);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string | null } | null>(null);

  useEffect(() => {
    setLoading(true);
    load({ data: { id: caseId } })
      .then((r) => setData(r))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [caseId]);

  async function openDoc(doc: any) {
    try {
      const r: any = await signedUrl({ data: { file_path: doc.file_path } });
      setPreview({ url: r.url, name: doc.name, mime: doc.file_type ?? null });
    } catch (e) { toast.error((e as Error).message); }
  }
  async function downloadDoc(doc: any) {
    try {
      const r: any = await signedUrl({ data: { file_path: doc.file_path } });
      const a = document.createElement("a"); a.href = r.url; a.download = doc.name; a.click();
    } catch (e) { toast.error((e as Error).message); }
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  if (!data) return <Card className="p-12 text-center text-muted-foreground">{ar ? "لم يتم العثور على القضية." : "Case not found."}</Card>;

  const c = data.case;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/app/workspace"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {ar ? "مساحة العمل" : "Workspace"}
        </Link>
        <Link
          to="/app/cases/$caseId"
          params={{ caseId }}
          className="ms-auto inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
        >
          <ExternalLink className="size-3" /> {ar ? "فتح الملف الكامل للقضية" : "Open full case profile"}
        </Link>
      </div>

      <PageHeader
        title={c.title}
        subtitle={`${c.case_number || "—"} · ${c.clients?.name || (ar ? "بدون عميل" : "No client")}`}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: team roster */}
        <Card className="h-fit overflow-hidden">
          <div className="border-b p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-gold" /> {ar ? "الفريق" : "Team"}
              <span className="ms-auto text-xs font-normal text-muted-foreground">{data.members.length + 1}</span>
            </div>
          </div>
          <ul className="divide-y">
            <li className="flex items-center gap-3 p-4">
              <Avatar className="size-9"><AvatarFallback className="bg-gold/15 text-xs text-gold">{initials(c.owner_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate font-medium">
                  {c.owner_name || (ar ? "المالك" : "Owner")}
                  <Crown className="size-3 text-gold" />
                </div>
                <div className="text-xs text-muted-foreground">{ar ? "مالك القضية" : "Case owner"}</div>
              </div>
            </li>
            {data.members.map((m: any) => (
              <li key={m.id} className="flex items-center gap-3 p-4">
                <Avatar className="size-9"><AvatarFallback className="bg-secondary text-xs">{initials(m.full_name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.full_name || m.user_id.slice(0, 8)}</div>
                  <div className="text-xs capitalize text-muted-foreground">{m.role}</div>
                </div>
              </li>
            ))}
            {data.members.length === 0 && (
              <li className="p-6 text-center text-xs text-muted-foreground">{ar ? "لا يوجد أعضاء إضافيون" : "No additional members"}</li>
            )}
          </ul>
          <div className="border-t p-3">
            <Link
              to="/app/cases/$caseId"
              params={{ caseId }}
              className="block w-full text-center text-xs text-gold hover:underline"
            >
              {ar ? "إدارة الفريق ←" : "Manage team →"}
            </Link>
          </div>
        </Card>

        {/* Right: resource tabs */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard icon={FileText} label={ar ? "مستندات" : "Documents"} value={data.documents.length} />
            <StatCard icon={CalendarDays} label={ar ? "مواعيد" : "Appointments"} value={data.appointments.length} />
            <StatCard icon={AlertTriangle} label={ar ? "مواعيد نهائية" : "Deadlines"} value={data.deadlines.length} />
            <StatCard icon={Receipt} label={ar ? "فواتير" : "Invoices"} value={data.invoices.length} />
          </div>

          <Tabs defaultValue="documents" className="space-y-4">
            <TabsList className="bg-secondary/60">
              <TabsTrigger value="documents"><FileText className="size-3.5 me-1.5" />{ar ? "المستندات" : "Documents"}</TabsTrigger>
              <TabsTrigger value="deadlines"><AlertTriangle className="size-3.5 me-1.5" />{ar ? "المواعيد النهائية" : "Deadlines"}</TabsTrigger>
              <TabsTrigger value="appointments"><CalendarDays className="size-3.5 me-1.5" />{ar ? "المواعيد" : "Appointments"}</TabsTrigger>
              <TabsTrigger value="time"><Clock className="size-3.5 me-1.5" />{ar ? "الوقت" : "Time"}</TabsTrigger>
              <TabsTrigger value="invoices"><Receipt className="size-3.5 me-1.5" />{ar ? "الفواتير" : "Invoices"}</TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
              <Card className="overflow-hidden">
                {data.documents.length === 0 ? <Empty msg={ar ? "لا مستندات" : "No documents"} /> : (
                  <ul className="divide-y">
                    {data.documents.map((d: any) => (
                      <li key={d.id} className="flex items-center gap-3 p-4 hover:bg-secondary/40">
                        <div className="grid size-10 place-items-center rounded-lg bg-secondary text-muted-foreground"><FileText className="size-4" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(d.created_at).toLocaleDateString()} · {fmtBytes(d.file_size)} · {d.uploader_name || (ar ? "غير معروف" : "Unknown")}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => openDoc(d)} title={ar ? "معاينة" : "Preview"}><Eye className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => downloadDoc(d)} title={ar ? "تنزيل" : "Download"}><Download className="size-4" /></Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="deadlines">
              <Card className="overflow-hidden">
                {data.deadlines.length === 0 ? <Empty msg={ar ? "لا مواعيد نهائية" : "No deadlines"} /> : (
                  <ul className="divide-y">
                    {data.deadlines.map((d: any) => (
                      <li key={d.id} className="flex items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{d.title}</div>
                          <div className="text-xs text-muted-foreground">{d.due_date}</div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] uppercase">{d.priority}</Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">{d.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="appointments">
              <Card className="overflow-hidden">
                {data.appointments.length === 0 ? <Empty msg={ar ? "لا مواعيد" : "No appointments"} /> : (
                  <ul className="divide-y">
                    {data.appointments.map((a: any) => (
                      <li key={a.id} className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{a.title}</div>
                          <Badge variant="outline" className="ms-auto text-[10px] uppercase">{a.status}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(a.starts_at).toLocaleString()} {a.location ? `· ${a.location}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="time">
              <Card className="overflow-hidden">
                {data.timeEntries.length === 0 ? <Empty msg={ar ? "لا سجلات وقت" : "No time entries"} /> : (
                  <ul className="divide-y">
                    {data.timeEntries.map((t: any) => (
                      <li key={t.id} className="flex items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{t.description || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(t.started_at).toLocaleDateString()} · {t.user_name || (ar ? "غير معروف" : "Unknown")}
                          </div>
                        </div>
                        <div className="text-sm tabular-nums text-muted-foreground">{fmtDuration(t.duration_seconds)}</div>
                        {t.billable && t.hourly_rate ? (
                          <div className="w-20 text-end text-sm tabular-nums">${((t.duration_seconds / 3600) * t.hourly_rate).toFixed(2)}</div>
                        ) : <div className="w-20 text-end text-xs text-muted-foreground">—</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <InvoicesPanel
                drafts={data.drafts ?? []}
                taxInvoices={data.invoices ?? []}
                reload={() => { load({ data: { id: caseId } }).then(setData).catch(() => {}); }}
                ar={ar}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle className="truncate pe-6">{preview?.name}</DialogTitle></DialogHeader>
          {preview && <DocumentPreviewBody url={preview.url} name={preview.name} mime={preview.mime} locale={locale} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-gold/15 text-gold"><Icon className="size-4" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold tabular-nums">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="p-12 text-center text-sm text-muted-foreground">{msg}</div>;
}

function InvoicesPanel({ drafts, taxInvoices, reload, ar }: {
  drafts: any[]; taxInvoices: any[]; reload: () => void; ar: boolean;
}) {
  const [tab, setTab] = useState<"drafts" | "tax">("drafts");
  const acceptFn = useServerFn(acceptDraftInvoice);
  const rejectFn = useServerFn(rejectDraftInvoice);
  const setStatusFn = useServerFn(setInvoiceStatus);
  const getEntries = useServerFn(getTimeEntriesByIds);

  const [pendingAccept, setPendingAccept] = useState<any | null>(null);
  const [acceptDueDate, setAcceptDueDate] = useState("");
  const [acceptEntries, setAcceptEntries] = useState<any[] | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const [payTarget, setPayTarget] = useState<any | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!pendingAccept) { setAcceptEntries(null); setAcceptDueDate(""); return; }
    setAcceptDueDate(pendingAccept.due_date ?? "");
    const ids: string[] = pendingAccept.time_entry_ids ?? [];
    if (ids.length === 0) { setAcceptEntries([]); return; }
    setAcceptEntries(null);
    getEntries({ data: { ids } })
      .then((r) => setAcceptEntries(r as any[]))
      .catch(() => setAcceptEntries([]));
  }, [pendingAccept]);

  async function accept() {
    if (!pendingAccept) return;
    setBusy(true);
    try {
      await acceptFn({ data: { id: pendingAccept.id, due_date: acceptDueDate || null } });
      toast.success(ar ? "تم تحويلها إلى فاتورة ضريبية" : "Converted to tax invoice");
      setPendingAccept(null); reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  async function reject(id: string) {
    try { await rejectFn({ data: { id } }); toast.success(ar ? "تم الرفض" : "Rejected"); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function confirmMarkPaid() {
    if (!payTarget) return;
    setBusy(true);
    try {
      const remaining = Number(payTarget.total) - Number(payTarget.amount_paid || 0);
      if (remaining > 0) {
        const { data: sess } = await supabase.auth.getSession();
        const { data: mem } = await supabase.from("organization_members")
          .select("org_id").eq("user_id", sess.session!.user.id).eq("status", "active")
          .order("created_at").limit(1).maybeSingle();
        await supabase.from("payments").insert({
          org_id: (mem as any)?.org_id,
          created_by: sess.session!.user.id,
          invoice_id: payTarget.id,
          client_name: payTarget.client_name,
          amount: remaining,
          method: "bank_transfer",
          paid_at: payDate,
          currency: payTarget.currency,
        });
        await supabase.from("tax_invoices").update({ amount_paid: Number(payTarget.total), status: "paid" }).eq("id", payTarget.id);
      } else {
        await setStatusFn({ data: { id: payTarget.id, status: "paid" } });
      }
      toast.success(ar ? "تم تعليمها كمدفوعة" : "Marked as paid");
      setPayTarget(null); reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const acceptEntryIds = (pendingAccept?.time_entry_ids ?? []) as string[];

  return (
    <>
      <Card className="overflow-hidden">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="border-b p-3">
            <TabsList className="bg-secondary/60">
              <TabsTrigger value="drafts">{ar ? "المسودات" : "Drafts"} <span className="ms-1.5 text-xs text-muted-foreground">({drafts.length})</span></TabsTrigger>
              <TabsTrigger value="tax">{ar ? "الفواتير الضريبية" : "Tax invoices"} <span className="ms-1.5 text-xs text-muted-foreground">({taxInvoices.length})</span></TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="drafts" className="m-0">
            {drafts.length === 0 ? <Empty msg={ar ? "لا مسودات" : "No drafts"} /> : (
              <ul className="divide-y">
                {drafts.map((d: any) => (
                  <li key={d.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{d.client_name}</div>
                      <div className="text-xs text-muted-foreground">{d.issue_date} · {ar ? "استحقاق" : "due"} {d.due_date || "—"}</div>
                    </div>
                    <StatusBadge status={d.status} />
                    <div className="w-28 text-end font-mono tabular-nums">{fmtMoney(d.total, d.currency)}</div>
                    <Button size="icon" variant="ghost" onClick={() => setPreview({ ...d, number: d.id.slice(0, 8).toUpperCase() })} title={ar ? "معاينة" : "Preview"}><Eye className="size-4" /></Button>
                    {d.status === "draft" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setPendingAccept(d)} title={ar ? "قبول" : "Accept"}><Check className="size-4 text-emerald-600" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => reject(d.id)} title={ar ? "رفض" : "Reject"}><XCircle className="size-4 text-amber-600" /></Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="tax" className="m-0">
            {taxInvoices.length === 0 ? <Empty msg={ar ? "لا فواتير" : "No invoices"} /> : (
              <ul className="divide-y">
                {taxInvoices.map((i: any) => (
                  <li key={i.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm">{i.number}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.issue_date} · <span className={i.status === "overdue" ? "text-destructive font-semibold" : ""}>{ar ? "استحقاق" : "due"} {i.due_date || "—"}</span>
                      </div>
                    </div>
                    <StatusBadge status={i.status} />
                    <div className="w-28 text-end font-mono tabular-nums">
                      {fmtMoney(i.total, i.currency)}
                      {Number(i.amount_paid) > 0 && Number(i.amount_paid) < Number(i.total) && (
                        <div className="text-[10px] text-muted-foreground">{ar ? "مدفوع" : "paid"} {fmtMoney(i.amount_paid, i.currency)}</div>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setPreview({ ...i, tax_rate: i.tax_rate ?? 0 })} title={ar ? "معاينة" : "Preview"}><Eye className="size-4" /></Button>
                    {(i.status === "issued" || i.status === "overdue" || i.status === "partial") && (
                      <Button size="icon" variant="ghost" onClick={() => { setPayTarget(i); setPayDate(new Date().toISOString().slice(0, 10)); }} title={ar ? "مدفوعة" : "Mark paid"}>
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {preview && <DocumentPreview kind="invoice" doc={preview} onClose={() => setPreview(null)} />}

      <Dialog open={!!pendingAccept} onOpenChange={(o) => { if (!o) setPendingAccept(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{ar ? "قبول المسودة وتحويلها إلى فاتورة ضريبية" : "Accept draft & convert to tax invoice"}</DialogTitle>
          </DialogHeader>
          {pendingAccept && (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="rounded-lg border bg-secondary/40 p-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "العميل" : "Client"}</span><span className="font-medium">{pendingAccept.client_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الإصدار" : "Issued"}</span><span>{pendingAccept.issue_date}</span></div>
                <div className="flex justify-between border-t pt-1 font-semibold"><span>{ar ? "الإجمالي" : "Total"}</span><span className="font-mono">{fmtMoney(pendingAccept.total, pendingAccept.currency)}</span></div>
              </div>
              <div>
                <Label>{ar ? "تاريخ الاستحقاق (اختياري)" : "Due date (optional)"}</Label>
                <Input type="date" className="mt-1.5" value={acceptDueDate} onChange={(e) => setAcceptDueDate(e.target.value)} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>{ar ? "البنود" : "Line items"}</Label>
                  <span className="text-xs text-muted-foreground">{(pendingAccept.items ?? []).length}</span>
                </div>
                <div className="rounded-lg border divide-y">
                  {(pendingAccept.items ?? []).map((it: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1"><div className="truncate">{it.description || "—"}</div><div className="text-xs text-muted-foreground">{it.quantity} × {fmtMoney(Number(it.unit_price), pendingAccept.currency)}</div></div>
                      <div className="font-mono tabular-nums">{fmtMoney(Number(it.quantity) * Number(it.unit_price), pendingAccept.currency)}</div>
                    </div>
                  ))}
                </div>
              </div>
              {acceptEntryIds.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>{ar ? "سجلات الوقت المصدر" : "Source time entries"}</Label>
                    <Link
                      to="/app/time"
                      search={{ ids: acceptEntryIds.join(",") } as any}
                      onClick={() => setPendingAccept(null)}
                      className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
                    >
                      <ExternalLink className="size-3" /> {ar ? "عرض في تتبع الوقت" : "View in Time tracking"}
                    </Link>
                  </div>
                  <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                    {acceptEntries === null ? (
                      <div className="p-4 text-center text-xs text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin" /></div>
                    ) : acceptEntries.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">{ar ? "لم يعد بالإمكان الوصول للسجلات." : "Source entries no longer available."}</div>
                    ) : acceptEntries.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{e.description || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(e.started_at).toLocaleDateString()} · {e.cases?.title ?? "—"} · {e.clients?.name ?? "—"}
                          </div>
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground">{(e.duration_seconds / 3600).toFixed(2)} h</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingAccept(null)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="outline" onClick={() => pendingAccept && setPreview({ ...pendingAccept, number: pendingAccept.id.slice(0, 8).toUpperCase() })}>
              <Eye className="size-4" /> {ar ? "معاينة" : "Preview"}
            </Button>
            <Button variant="gold" onClick={accept} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin me-1.5" />}
              {ar ? "قبول وإصدار" : "Accept & issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payTarget} onOpenChange={(o) => { if (!o) setPayTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "تعليم الفاتورة كمدفوعة" : "Mark invoice as paid"}</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-secondary/40 p-3 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">#</span><span className="font-mono">{payTarget.number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{ar ? "الاستحقاق" : "Due"}</span><span>{payTarget.due_date || "—"}</span></div>
                <div className="flex justify-between border-t pt-1 font-semibold"><span>{ar ? "المتبقي" : "Remaining"}</span><span className="font-mono">{fmtMoney(Number(payTarget.total) - Number(payTarget.amount_paid || 0), payTarget.currency)}</span></div>
              </div>
              <div>
                <Label>{ar ? "تاريخ الدفع" : "Payment date"}</Label>
                <Input type="date" className="mt-1.5" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayTarget(null)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="gold" onClick={confirmMarkPaid} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin me-1.5" />}
              {ar ? "تأكيد الدفع" : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
