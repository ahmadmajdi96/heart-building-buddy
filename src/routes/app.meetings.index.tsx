import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMeeting, listMeetings, deleteMeeting } from "@/lib/meetings.functions";
import { listCases } from "@/lib/cases.functions";
import { listClients } from "@/lib/clients.functions";
import { Video, Plus, Trash2, Copy, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/meetings/")({ component: MeetingsPage });

type Meeting = {
  id: string; title: string; room_name: string;
  started_at: string; ended_at: string | null;
  case_id: string | null; client_id: string | null;
};

function MeetingsPage() {
  const { locale } = useI18n();
  const navigate = useNavigate({ from: "/app/meetings" });
  const list = useServerFn(listMeetings);
  const create = useServerFn(createMeeting);
  const del = useServerFn(deleteMeeting);
  const listC = useServerFn(listCases);
  const listCl = useServerFn(listClients);

  const [items, setItems] = useState<Meeting[]>([]);
  const [cases, setCases] = useState<{ id: string; title: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState("none");
  const [clientId, setClientId] = useState("none");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [m, c, cl] = await Promise.all([list(), listC(), listCl()]);
      setItems(m as Meeting[]);
      setCases((c as any[]).map((x) => ({ id: x.id, title: x.title })));
      setClients((cl as any[]).map((x) => ({ id: x.id, name: x.name })));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function startMeeting() {
    setCreating(true);
    try {
      const row: any = await create({ data: {
        title: title || (locale === "ar" ? "اجتماع" : "Meeting"),
        case_id: caseId === "none" ? null : caseId,
        client_id: clientId === "none" ? null : clientId,
      }});
      setTitle(""); setCaseId("none"); setClientId("none");
      navigate({ to: "/app/meetings/$id", params: { id: row.id } });
    } catch (e) { toast.error((e as Error).message); }
    finally { setCreating(false); }
  }

  async function remove(id: string) {
    if (!confirm(locale === "ar" ? "حذف الاجتماع؟" : "Delete meeting?")) return;
    try { await del({ data: { id } }); refresh(); } catch (e) { toast.error((e as Error).message); }
  }

  function copyLink(roomName: string) {
    const url = `${window.location.origin}/app/meetings/join/${roomName}`;
    navigator.clipboard.writeText(url);
    toast.success(locale === "ar" ? "تم النسخ" : "Link copied");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "الاجتماعات الحية" : "Live Meetings"}
        subtitle={locale === "ar"
          ? "ابدأ اجتماع فيديو فوري داخل المنصة مع تفريغ مباشر للمحادثة وحفظ تلقائي للقضية."
          : "Start an in-app video meeting with live Arabic transcription, automatically saved to a case."}
      />

      <div className="card-elev rounded-xl border bg-card p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
          <Input
            placeholder={locale === "ar" ? "عنوان الاجتماع" : "Meeting title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10"
          />
          <Select value={caseId} onValueChange={setCaseId}>
            <SelectTrigger className="h-10"><SelectValue placeholder={locale === "ar" ? "قضية (اختياري)" : "Case (optional)"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{locale === "ar" ? "بدون قضية" : "No case"}</SelectItem>
              {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="h-10"><SelectValue placeholder={locale === "ar" ? "موكل (اختياري)" : "Client (optional)"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{locale === "ar" ? "بدون موكل" : "No client"}</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="gold" onClick={startMeeting} disabled={creating}>
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {locale === "ar" ? "ابدأ الاجتماع" : "Start meeting"}
          </Button>
        </div>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        <div className="border-b px-5 py-3 text-sm font-semibold">
          {locale === "ar" ? "اجتماعاتي" : "My meetings"}
        </div>
        {loading ? (
          <div className="grid place-items-center py-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center py-12 text-sm text-muted-foreground">
            <Video className="mb-2 size-8 text-gold/40" />
            {locale === "ar" ? "لا توجد اجتماعات بعد." : "No meetings yet."}
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                <Video className="size-4 text-gold" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.started_at).toLocaleString()}
                    {m.ended_at ? ` · ${locale === "ar" ? "منتهٍ" : "Ended"}` : ` · ${locale === "ar" ? "نشط" : "Live"}`}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copyLink(m.room_name)} title={locale === "ar" ? "نسخ الرابط" : "Copy invite link"}>
                  <Copy className="size-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/app/meetings/$id", params: { id: m.id } })}>
                  {locale === "ar" ? "فتح" : "Open"} <ArrowRight className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
