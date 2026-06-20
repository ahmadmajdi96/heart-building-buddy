import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listCases, saveCase, deleteCase, getCase, addCaseEvent, deleteCaseEvent } from "@/lib/cases.functions";
import { listClients } from "@/lib/clients.functions";
import { listDocuments, createDocument, getSignedDownloadUrl, deleteDocument } from "@/lib/documents.functions";
import { saveAppointment } from "@/lib/appointments.functions";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Pencil, Trash2, Search, Calendar, FileText, Upload, Download, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/cases")({ component: CasesPage });

type CaseRow = { id: string; title: string; case_number: string | null; court: string | null; jurisdiction: string | null; status: string; priority: string | null; opened_at: string; client_id: string | null; description: string | null; clients?: { id: string; name: string } | null };
type ClientRow = { id: string; name: string };

function CasesPage() {
  const { locale } = useI18n();
  const list = useServerFn(listCases);
  const save = useServerFn(saveCase);
  const del = useServerFn(deleteCase);
  const listC = useServerFn(listClients);

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CaseRow> | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [cs, cls] = await Promise.all([list(), listC()]);
      setCases(cs as CaseRow[]);
      setClients((cls as any[]).map((c) => ({ id: c.id, name: c.name })));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => cases.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return c.title.toLowerCase().includes(s) || (c.case_number ?? "").toLowerCase().includes(s);
  }), [cases, q, status]);

  async function submit() {
    if (!editing?.title) { toast.error(locale === "ar" ? "العنوان مطلوب" : "Title required"); return; }
    try {
      await save({ data: {
        id: editing.id, title: editing.title!, case_number: editing.case_number ?? undefined,
        court: editing.court ?? undefined, jurisdiction: editing.jurisdiction ?? undefined,
        status: (editing.status ?? "open") as any, priority: (editing.priority ?? "medium") as any,
        description: editing.description ?? undefined, client_id: editing.client_id ?? null,
      }});
      setEditOpen(false); setEditing(null); refresh();
      toast.success(locale === "ar" ? "تم الحفظ" : "Saved");
    } catch (e) { toast.error((e as Error).message); }
  }
  async function remove(id: string) {
    if (!confirm(locale === "ar" ? "حذف هذه القضية؟" : "Delete this case?")) return;
    try { await del({ data: { id } }); refresh(); } catch (e) { toast.error((e as Error).message); }
  }

  const statuses = ["all", "open", "pending", "closed", "won", "lost"];

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "إدارة القضايا" : "Case Management"}
        subtitle={locale === "ar" ? `${cases.length} قضية` : `${cases.length} matters`}
        actions={<Button variant="gold" size="sm" className="gap-1.5" onClick={() => { setEditing({}); setEditOpen(true); }}><Plus className="size-4" />{locale === "ar" ? "قضية جديدة" : "New matter"}</Button>}
      />

      <div className="card-elev rounded-xl border bg-card">
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={locale === "ar" ? "ابحث…" : "Search…"} className="h-9 ps-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "ghost"} onClick={() => setStatus(s)} className="capitalize">{s}</Button>
            ))}
          </div>
        </div>

        {loading ? <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        : filtered.length === 0 ? <div className="p-12 text-center text-muted-foreground text-sm">{locale === "ar" ? "لا توجد قضايا بعد." : "No cases yet — add your first matter."}</div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الرقم" : "Ref"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "العنوان" : "Title"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الموكل" : "Client"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "المحكمة" : "Court"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الحالة" : "Status"}</th>
              <th className="px-5 py-3 text-end"></th>
            </tr></thead>
            <tbody className="divide-y">{filtered.map((c) => (
              <tr key={c.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => setDetailId(c.id)}>
                <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{c.case_number || "—"}</td>
                <td className="px-5 py-4 font-medium">{c.title}</td>
                <td className="px-5 py-4 text-muted-foreground">{c.clients?.name ?? "—"}</td>
                <td className="px-5 py-4 text-muted-foreground">{c.court ?? "—"}</td>
                <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                <td className="px-5 py-4 text-end" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setEditOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? (locale === "ar" ? "تعديل القضية" : "Edit case") : (locale === "ar" ? "قضية جديدة" : "New case")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{locale === "ar" ? "العنوان *" : "Title *"}</Label><Input value={editing?.title ?? ""} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{locale === "ar" ? "رقم القضية" : "Case number"}</Label><Input value={editing?.case_number ?? ""} onChange={(e) => setEditing({ ...editing!, case_number: e.target.value })} /></div>
              <div><Label>{locale === "ar" ? "الاختصاص" : "Jurisdiction"}</Label><Input value={editing?.jurisdiction ?? ""} onChange={(e) => setEditing({ ...editing!, jurisdiction: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{locale === "ar" ? "المحكمة" : "Court"}</Label><Input value={editing?.court ?? ""} onChange={(e) => setEditing({ ...editing!, court: e.target.value })} /></div>
              <div><Label>{locale === "ar" ? "الموكل" : "Client"}</Label>
                <Select value={editing?.client_id ?? "none"} onValueChange={(v) => setEditing({ ...editing!, client_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{locale === "ar" ? "بدون" : "None"}</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{locale === "ar" ? "الحالة" : "Status"}</Label>
                <Select value={editing?.status ?? "open"} onValueChange={(v) => setEditing({ ...editing!, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["open","pending","closed","won","lost"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{locale === "ar" ? "الأولوية" : "Priority"}</Label>
                <Select value={editing?.priority ?? "medium"} onValueChange={(v) => setEditing({ ...editing!, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","urgent"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{locale === "ar" ? "الوصف" : "Description"}</Label><Textarea rows={3} value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button><Button variant="gold" onClick={submit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <CaseDetailSheet id={detailId} clients={clients} onClose={() => { setDetailId(null); refresh(); }} />
    </div>
  );
}

function CaseDetailSheet({ id, clients, onClose }: { id: string | null; clients: ClientRow[]; onClose: () => void }) {
  const { locale } = useI18n();
  const get = useServerFn(getCase);
  const addEv = useServerFn(addCaseEvent);
  const delEv = useServerFn(deleteCaseEvent);
  const createDoc = useServerFn(createDocument);
  const signedUrl = useServerFn(getSignedDownloadUrl);
  const delDoc = useServerFn(deleteDocument);
  const saveAppt = useServerFn(saveAppointment);

  const [data, setData] = useState<Awaited<ReturnType<typeof getCase>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [newEv, setNewEv] = useState<{ kind: "update" | "feedback" | "court_session" | "appointment" | "milestone"; title: string; body: string; scheduled_at: string }>({ kind: "update", title: "", body: "", scheduled_at: "" });
  const [appt, setAppt] = useState<{ title: string; starts_at: string; ends_at: string; location: string }>({ title: "", starts_at: "", ends_at: "", location: "" });
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    try { setData(await get({ data: { id } })); } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => { if (id) refresh(); else setData(null); }, [id]);

  async function logEvent() {
    if (!id || !newEv.title) return;
    try {
      await addEv({ data: { case_id: id, kind: newEv.kind, title: newEv.title, body: newEv.body || undefined, scheduled_at: newEv.scheduled_at || null } });
      setNewEv({ kind: "update", title: "", body: "", scheduled_at: "" });
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function scheduleAppt() {
    if (!id || !appt.title || !appt.starts_at) return;
    const ends = appt.ends_at || new Date(new Date(appt.starts_at).getTime() + 3600_000).toISOString().slice(0, 16);
    try {
      await saveAppt({ data: { title: appt.title, starts_at: new Date(appt.starts_at).toISOString(), ends_at: new Date(ends).toISOString(), all_day: false, location: appt.location || undefined, kind: "court", case_id: id } });
      setAppt({ title: "", starts_at: "", ends_at: "", location: "" });
      toast.success(locale === "ar" ? "تم جدولة الموعد" : "Appointment scheduled");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function upload(file: File) {
    if (!id) return;
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/${id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) throw error;
      let extracted: string | undefined;
      if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) {
        extracted = (await file.text()).slice(0, 60000);
      }
      await createDoc({ data: { name: file.name, mime_type: file.type, size: file.size, storage_path: path, extracted_text: extracted, case_id: id } });
      toast.success(locale === "ar" ? "تم الرفع" : "Uploaded");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  }

  async function download(docId: string) {
    try { const { url, name } = await signedUrl({ data: { id: docId } }); const a = document.createElement("a"); a.href = url; a.download = name; a.target = "_blank"; a.click(); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function removeDoc(docId: string) {
    if (!confirm(locale === "ar" ? "حذف المستند؟" : "Delete document?")) return;
    try { await delDoc({ data: { id: docId } }); refresh(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{data?.case?.title ?? "—"}</SheetTitle></SheetHeader>
        {loading || !data?.case ? <div className="grid place-items-center p-8"><Loader2 className="size-5 animate-spin text-gold" /></div> :
        <div className="mt-4 space-y-6">
          <div className="text-sm text-muted-foreground">
            {data.case.case_number && <div>#{data.case.case_number}</div>}
            {data.case.court && <div>{data.case.court} · {data.case.jurisdiction}</div>}
            {data.case.clients && <div>{locale === "ar" ? "الموكل" : "Client"}: {data.case.clients.name}</div>}
            {data.case.description && <p className="mt-2 whitespace-pre-wrap">{data.case.description}</p>}
          </div>

          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Calendar className="size-4" />{locale === "ar" ? "جدولة موعد/جلسة" : "Schedule court / appointment"}</h3>
            <div className="rounded-md border p-3 space-y-2">
              <Input placeholder={locale === "ar" ? "العنوان" : "Title"} value={appt.title} onChange={(e) => setAppt({ ...appt, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="datetime-local" value={appt.starts_at} onChange={(e) => setAppt({ ...appt, starts_at: e.target.value })} />
                <Input type="datetime-local" value={appt.ends_at} onChange={(e) => setAppt({ ...appt, ends_at: e.target.value })} />
              </div>
              <Input placeholder={locale === "ar" ? "الموقع/المحكمة" : "Location / court"} value={appt.location} onChange={(e) => setAppt({ ...appt, location: e.target.value })} />
              <Button size="sm" variant="gold" onClick={scheduleAppt}>{locale === "ar" ? "جدولة" : "Schedule"}</Button>
            </div>
            {data.appointments.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {data.appointments.map((a) => (
                  <li key={a.id} className="rounded border p-2 text-xs flex justify-between">
                    <span><span className="font-medium">{a.title}</span> — {new Date(a.starts_at).toLocaleString()}{a.location ? ` @ ${a.location}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="size-4" />{locale === "ar" ? "المستندات" : "Documents"}</h3>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-secondary/40">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              <span>{locale === "ar" ? "رفع مستند" : "Upload document"}</span>
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            </label>
            <ul className="mt-2 space-y-1.5">
              {data.documents.map((d) => (
                <li key={d.id} className="rounded border p-2 text-xs flex justify-between items-center">
                  <span className="truncate">{d.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => download(d.id)}><Download className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeDoc(d.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><MessageSquare className="size-4" />{locale === "ar" ? "التحديثات والملاحظات" : "Updates & feedback"}</h3>
            <div className="rounded-md border p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Select value={newEv.kind} onValueChange={(v) => setNewEv({ ...newEv, kind: v as any })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">{locale === "ar" ? "تحديث" : "Update"}</SelectItem>
                    <SelectItem value="feedback">{locale === "ar" ? "ملاحظة" : "Feedback"}</SelectItem>
                    <SelectItem value="milestone">{locale === "ar" ? "إنجاز" : "Milestone"}</SelectItem>
                    <SelectItem value="court_session">{locale === "ar" ? "جلسة" : "Court session"}</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="col-span-2 h-9" placeholder={locale === "ar" ? "العنوان" : "Title"} value={newEv.title} onChange={(e) => setNewEv({ ...newEv, title: e.target.value })} />
              </div>
              <Textarea rows={2} placeholder={locale === "ar" ? "تفاصيل…" : "Details…"} value={newEv.body} onChange={(e) => setNewEv({ ...newEv, body: e.target.value })} />
              <Button size="sm" variant="gold" onClick={logEvent}>{locale === "ar" ? "إضافة" : "Add"}</Button>
            </div>
            <ul className="mt-3 space-y-2">
              {data.events.map((e) => (
                <li key={e.id} className="rounded border p-3 text-sm flex justify-between items-start">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gold">{e.kind.replace("_", " ")}</div>
                    <div className="font-medium">{e.title}</div>
                    {e.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.body}</p>}
                    <div className="text-[11px] text-muted-foreground mt-1">{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={async () => { await delEv({ data: { id: e.id } }); refresh(); }}><Trash2 className="size-3.5 text-destructive" /></Button>
                </li>
              ))}
            </ul>
          </section>
        </div>}
      </SheetContent>
    </Sheet>
  );
}

// Re-export to satisfy `listDocuments` import that vite tree-shakes
export const _unused = listDocuments;
