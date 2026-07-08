import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listExpenses, saveExpense, deleteExpense, setExpenseStatus } from "@/lib/expenses.functions";
import { createPrebill, listPrebills, getPrebill, updatePrebillLine, updatePrebill, createInvoiceFromPrebill, deletePrebill } from "@/lib/prebills.functions";
import { Loader2, Plus, Trash2, Receipt, FileCheck2, Check } from "lucide-react";
import { toast } from "sonner";

const KINDS = ["court_fee", "expert", "translation", "filing", "travel", "other"] as const;

export function ExpensesTab({ caseId, clientId, locale, onChange }: { caseId: string; clientId?: string | null; locale: string; onChange?: () => void }) {
  const ar = locale === "ar";
  const list = useServerFn(listExpenses);
  const save = useServerFn(saveExpense);
  const del = useServerFn(deleteExpense);
  const setStatus = useServerFn(setExpenseStatus);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ kind: "other", amount: 0, description: "", incurred_on: new Date().toISOString().slice(0, 10), billable: true });

  async function refresh() {
    setLoading(true);
    try { setRows(await list({ data: { case_id: caseId } })); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [caseId]);

  async function submit() {
    if (!(form.amount > 0)) { toast.error(ar ? "المبلغ يجب أن يكون أكبر من صفر" : "Amount must be positive"); return; }
    try {
      await save({ data: { ...form, case_id: caseId, client_id: clientId ?? null } });
      toast.success(ar ? "تم الحفظ" : "Saved");
      setOpen(false);
      setForm({ kind: "other", amount: 0, description: "", incurred_on: new Date().toISOString().slice(0, 10), billable: true });
      await refresh(); onChange?.();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{ar ? "المصاريف والنفقات" : "Expenses & disbursements"}</div>
        <Button variant="gold" size="sm" onClick={() => setOpen(true)} className="gap-1.5"><Plus className="size-4" />{ar ? "مصروف" : "Add expense"}</Button>
      </div>
      {loading ? <div className="grid place-items-center p-6"><Loader2 className="size-5 animate-spin text-gold" /></div> : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{ar ? "لا توجد مصاريف بعد" : "No expenses yet"}</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2 text-start">{ar ? "التاريخ" : "Date"}</th><th className="p-2 text-start">{ar ? "النوع" : "Kind"}</th><th className="p-2 text-start">{ar ? "الوصف" : "Description"}</th><th className="p-2 text-end">{ar ? "المبلغ" : "Amount"}</th><th className="p-2">{ar ? "الحالة" : "Status"}</th><th className="p-2" /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.incurred_on}</td>
                  <td className="p-2 capitalize">{r.kind.replace("_", " ")}</td>
                  <td className="p-2">{r.description}</td>
                  <td className="p-2 text-end tabular-nums">{Number(r.amount).toFixed(2)} {r.currency}</td>
                  <td className="p-2 text-center">
                    <Select value={r.status} onValueChange={async (v) => { await setStatus({ data: { id: r.id, status: v as any } }); await refresh(); }}>
                      <SelectTrigger className="h-7 text-xs w-32 mx-auto"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wip">WIP</SelectItem>
                        <SelectItem value="billed">{ar ? "مفوتر" : "Billed"}</SelectItem>
                        <SelectItem value="written_off">{ar ? "شطب" : "Written off"}</SelectItem>
                        <SelectItem value="non_billable">{ar ? "غير قابل" : "Non-billable"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-end">
                    <Button variant="ghost" size="sm" onClick={async () => { if (confirm(ar ? "حذف؟" : "Delete?")) { await del({ data: { id: r.id } }); await refresh(); onChange?.(); } }}><Trash2 className="size-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "مصروف جديد" : "New expense"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{ar ? "النوع" : "Kind"}</Label>
                <Select value={form.kind} onValueChange={(v) => setForm((f: any) => ({ ...f, kind: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{ar ? "التاريخ" : "Date"}</Label><Input type="date" value={form.incurred_on} onChange={(e) => setForm((f: any) => ({ ...f, incurred_on: e.target.value }))} /></div>
            </div>
            <div><Label>{ar ? "المبلغ" : "Amount"}</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f: any) => ({ ...f, amount: Number(e.target.value) }))} /></div>
            <div><Label>{ar ? "الوصف" : "Description"}</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button><Button variant="gold" onClick={submit}>{ar ? "حفظ" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PrebillsTab({ caseId, locale }: { caseId: string; locale: string }) {
  const ar = locale === "ar";
  const listFn = useServerFn(listPrebills);
  const createFn = useServerFn(createPrebill);
  const getFn = useServerFn(getPrebill);
  const updateLineFn = useServerFn(updatePrebillLine);
  const updateFn = useServerFn(updatePrebill);
  const approveFn = useServerFn(createInvoiceFromPrebill);
  const deleteFn = useServerFn(deletePrebill);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10), narrative: "" });
  const [detail, setDetail] = useState<{ prebill: any; lines: any[] } | null>(null);

  async function refresh() { setLoading(true); try { setRows(await listFn({ data: { case_id: caseId } })); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, [caseId]);

  async function generate() {
    try {
      const r = await createFn({ data: { case_id: caseId, period_start: period.start, period_end: period.end, narrative: period.narrative } });
      toast.success(ar ? "تم إنشاء المسودة" : "Draft created");
      setOpen(false);
      await refresh();
      openDetail(r.id);
    } catch (e) { toast.error((e as Error).message); }
  }

  async function openDetail(id: string) {
    try { setDetail(await getFn({ data: { id } })); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{ar ? "مسودات فواتير قبل الإصدار" : "Pre-bill review queue"}</div>
        <Button variant="gold" size="sm" onClick={() => setOpen(true)} className="gap-1.5"><FileCheck2 className="size-4" />{ar ? "مسودة جديدة" : "New pre-bill"}</Button>
      </div>

      {loading ? <div className="grid place-items-center p-6"><Loader2 className="size-5 animate-spin text-gold" /></div> : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{ar ? "لا توجد مسودات" : "No pre-bills yet"}</div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2 text-start">{ar ? "الفترة" : "Period"}</th><th className="p-2 text-end">{ar ? "الوقت" : "Time"}</th><th className="p-2 text-end">{ar ? "المصاريف" : "Expenses"}</th><th className="p-2 text-end">{ar ? "الإجمالي" : "Total"}</th><th className="p-2">{ar ? "الحالة" : "Status"}</th><th className="p-2" /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => openDetail(r.id)}>
                  <td className="p-2">{r.period_start} → {r.period_end}</td>
                  <td className="p-2 text-end tabular-nums">{Number(r.subtotal_time).toFixed(2)}</td>
                  <td className="p-2 text-end tabular-nums">{Number(r.subtotal_expenses).toFixed(2)}</td>
                  <td className="p-2 text-end tabular-nums">{Number(r.total).toFixed(2)} {r.currency}</td>
                  <td className="p-2 text-center capitalize">{r.status}</td>
                  <td className="p-2 text-end" onClick={(e) => e.stopPropagation()}>
                    {r.status !== "billed" && (
                      <Button variant="ghost" size="sm" onClick={async () => { if (confirm(ar ? "حذف؟" : "Delete?")) { await deleteFn({ data: { id: r.id } }); await refresh(); } }}><Trash2 className="size-4" /></Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ar ? "مسودة فاتورة" : "Create pre-bill"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{ar ? "من" : "From"}</Label><Input type="date" value={period.start} onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))} /></div>
              <div><Label>{ar ? "إلى" : "To"}</Label><Input type="date" value={period.end} onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))} /></div>
            </div>
            <div><Label>{ar ? "ملاحظات للعميل" : "Client narrative"}</Label><Textarea rows={3} value={period.narrative} onChange={(e) => setPeriod((p) => ({ ...p, narrative: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{ar ? "إلغاء" : "Cancel"}</Button><Button variant="gold" onClick={generate}>{ar ? "إنشاء" : "Generate"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Receipt className="size-4" />{ar ? "مراجعة المسودة" : "Pre-bill review"} · {detail.prebill.period_start} → {detail.prebill.period_end}</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0">
                    <tr><th className="p-2 text-start">{ar ? "النوع" : "Kind"}</th><th className="p-2 text-start">{ar ? "الوصف" : "Description"}</th><th className="p-2 text-end">{ar ? "الكمية" : "Qty"}</th><th className="p-2 text-end">{ar ? "السعر" : "Price"}</th><th className="p-2 text-end">{ar ? "الإجمالي" : "Amount"}</th><th className="p-2">{ar ? "مضمن" : "Incl."}</th></tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((l) => (
                      <tr key={l.id} className={`border-t ${!l.included ? "opacity-40" : ""}`}>
                        <td className="p-2 text-xs uppercase text-muted-foreground">{l.kind}</td>
                        <td className="p-2"><Input className="h-7 text-sm" defaultValue={l.description || ""} onBlur={async (e) => { if (e.target.value !== l.description) { await updateLineFn({ data: { id: l.id, description: e.target.value } }); openDetail(detail.prebill.id); } }} /></td>
                        <td className="p-2 text-end"><Input className="h-7 text-sm w-20 text-end tabular-nums" type="number" step="0.01" defaultValue={l.quantity} onBlur={async (e) => { const q = Number(e.target.value); if (q !== Number(l.quantity)) { await updateLineFn({ data: { id: l.id, quantity: q, unit_price: Number(l.unit_price) } }); openDetail(detail.prebill.id); } }} /></td>
                        <td className="p-2 text-end"><Input className="h-7 text-sm w-24 text-end tabular-nums" type="number" step="0.01" defaultValue={l.unit_price} onBlur={async (e) => { const p = Number(e.target.value); if (p !== Number(l.unit_price)) { await updateLineFn({ data: { id: l.id, quantity: Number(l.quantity), unit_price: p } }); openDetail(detail.prebill.id); } }} /></td>
                        <td className="p-2 text-end tabular-nums">{Number(l.amount).toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <input type="checkbox" checked={l.included} onChange={async () => { await updateLineFn({ data: { id: l.id, included: !l.included } }); openDetail(detail.prebill.id); }} />
                        </td>
                      </tr>
                    ))}
                    {detail.lines.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">{ar ? "لا توجد بنود" : "No lines"}</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-2">
                <Label>{ar ? "ملاحظات" : "Narrative"}</Label>
                <Textarea rows={2} defaultValue={detail.prebill.narrative || ""} onBlur={async (e) => { if (e.target.value !== (detail.prebill.narrative || "")) { await updateFn({ data: { id: detail.prebill.id, narrative: e.target.value } }); } }} />
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><Label>{ar ? "الوقت" : "Time"}</Label><div className="tabular-nums">{Number(detail.prebill.subtotal_time).toFixed(2)}</div></div>
                  <div><Label>{ar ? "المصاريف" : "Expenses"}</Label><div className="tabular-nums">{Number(detail.prebill.subtotal_expenses).toFixed(2)}</div></div>
                  <div><Label>{ar ? "الخصم" : "Discount"}</Label><Input className="h-7 text-sm" type="number" step="0.01" defaultValue={detail.prebill.discount} onBlur={async (e) => { const d = Number(e.target.value); if (d !== Number(detail.prebill.discount)) { await updateFn({ data: { id: detail.prebill.id, discount: d } }); openDetail(detail.prebill.id); } }} /></div>
                </div>
                <div className="text-end font-serif text-xl text-gold tabular-nums">{Number(detail.prebill.total).toFixed(2)} {detail.prebill.currency}</div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDetail(null)}>{ar ? "إغلاق" : "Close"}</Button>
                {detail.prebill.status !== "billed" && (
                  <Button variant="gold" className="gap-1.5" onClick={async () => {
                    try {
                      const inv = await approveFn({ data: { id: detail.prebill.id } });
                      toast.success(ar ? `تم إنشاء الفاتورة ${(inv as any).number}` : `Invoice ${(inv as any).number} created`);
                      setDetail(null); await refresh();
                    } catch (e) { toast.error((e as Error).message); }
                  }}><Check className="size-4" />{ar ? "اعتماد وإصدار فاتورة" : "Approve → Invoice"}</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
