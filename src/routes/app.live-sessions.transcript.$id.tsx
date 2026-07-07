import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getLiveSession, saveLiveSession } from "@/lib/live-sessions.functions";
import { ArrowLeft, Download, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/live-sessions/transcript/$id")({
  component: LiveTranscriptEditor,
});

type Turn = { speaker: string; text: string; start?: number; end?: number };

const SPEAKER_COLORS = [
  "bg-gold/15 text-gold border-gold/30",
  "bg-blue-500/15 text-blue-600 border-blue-500/30",
  "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  "bg-violet-500/15 text-violet-600 border-violet-500/30",
  "bg-rose-500/15 text-rose-600 border-rose-500/30",
];

function defaultLabel(speaker: string) {
  const m = speaker.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) + 1 : 1;
  return `Speaker ${n}`;
}

function LiveTranscriptEditor() {
  const { locale } = useI18n();
  const { id } = useParams({ from: "/app/live-sessions/transcript/$id" });
  const get = useServerFn(getLiveSession);
  const save = useServerFn(saveLiveSession);

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const row: any = await get({ data: { id } });
        setSession(row);
        let t = ((row?.turns as Turn[]) || []).map((x) => ({ ...x }));
        // If turns weren't saved but transcript text exists, seed from lines
        // so the editor shows the same UI as the meetings transcript editor.
        if (t.length === 0 && typeof row?.transcript === "string" && row.transcript.trim()) {
          t = row.transcript.split(/\r?\n/).filter((l: string) => l.trim()).map((line: string) => {
            const m = line.match(/^\s*([^:\[]+?)\s*[:\-]\s*(.*)$/) || line.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
            if (m) return { speaker: m[1].trim(), text: m[2].trim() };
            return { speaker: "speaker_0", text: line.trim() };
          });
        }
        setTurns(t);
        const unique = Array.from(new Set(t.map((x) => x.speaker)));
        const init: Record<string, string> = {};
        unique.forEach((s) => { init[s] = /^speaker_\d+$/i.test(s) ? defaultLabel(s) : s; });
        setLabels(init);
      } catch (e) { toast.error((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const speakers = useMemo(
    () => Array.from(new Set(turns.map((t) => t.speaker))).concat(
      Object.keys(labels).filter((k) => !turns.some((t) => t.speaker === k)),
    ),
    [turns, labels],
  );

  const transcriptText = useMemo(
    () => turns.map((t) => `${labels[t.speaker] || defaultLabel(t.speaker)}: ${t.text}`).join("\n"),
    [turns, labels],
  );

  function updateTurnText(i: number, text: string) {
    setTurns((prev) => prev.map((t, idx) => (idx === i ? { ...t, text } : t)));
  }
  function updateTurnSpeaker(i: number, speaker: string) {
    setTurns((prev) => prev.map((t, idx) => (idx === i ? { ...t, speaker } : t)));
    if (!labels[speaker]) setLabels((prev) => ({ ...prev, [speaker]: defaultLabel(speaker) }));
  }
  function removeTurn(i: number) {
    setTurns((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addTurn(afterIdx: number) {
    const sp = turns[afterIdx]?.speaker || speakers[0] || "speaker_0";
    const next = [...turns];
    next.splice(afterIdx + 1, 0, { speaker: sp, text: "" });
    setTurns(next);
  }
  function renameSpeaker(sp: string, name: string) {
    setLabels((prev) => ({ ...prev, [sp]: name }));
  }
  function addSpeaker() {
    let n = speakers.length;
    let key = `custom_${n}`;
    while (labels[key] || speakers.includes(key)) { n += 1; key = `custom_${n}`; }
    setLabels((prev) => ({ ...prev, [key]: `Speaker ${n + 1}` }));
    setTurns((prev) => [...prev, { speaker: key, text: "" }]);
  }
  function deleteSpeaker(sp: string) {
    const remaining = speakers.filter((s) => s !== sp);
    if (remaining.length === 0) {
      if (!confirm(locale === "ar" ? "سيؤدي هذا إلى حذف جميع الأسطر. متابعة؟" : "This will delete all turns. Continue?")) return;
      setTurns([]);
    } else {
      const fallback = remaining[0];
      const msg = locale === "ar"
        ? `نقل أسطر هذا المتحدث إلى "${labels[fallback] || defaultLabel(fallback)}"؟ (إلغاء = حذف الأسطر)`
        : `Reassign this speaker's turns to "${labels[fallback] || defaultLabel(fallback)}"? (Cancel = delete turns)`;
      const reassign = confirm(msg);
      setTurns((prev) => reassign
        ? prev.map((t) => (t.speaker === sp ? { ...t, speaker: fallback } : t))
        : prev.filter((t) => t.speaker !== sp));
    }
    setLabels((prev) => { const c = { ...prev }; delete c[sp]; return c; });
  }

  async function persist() {
    setSaving(true);
    try {
      const finalTurns: Turn[] = turns.map((t) => ({
        ...t,
        speaker: labels[t.speaker] || defaultLabel(t.speaker),
      }));
      const finalText = finalTurns.map((t) => `${t.speaker}: ${t.text}`).join("\n");
      await save({ data: { id, transcript: finalText, turns: finalTurns, finalize: false } });
      toast.success(locale === "ar" ? "تم الحفظ" : "Saved");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  function download() {
    const blob = new Blob([transcriptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (session?.title || "live-session").replace(/[^\w\-]+/g, "_");
    a.href = url;
    a.download = `${safe}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="grid h-[60vh] place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  }
  if (!session) return <p className="p-6 text-sm">{locale === "ar" ? "غير موجود" : "Not found"}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/app/live-sessions"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" />{locale === "ar" ? "رجوع" : "Back"}</Button></Link>
          <div>
            <h1 className="font-serif text-2xl">{session.title}</h1>
            <p className="text-xs text-muted-foreground">
              {locale === "ar" ? "محرر النص المفرَّغ" : "Transcript editor"} · {session.started_at ? new Date(session.started_at).toLocaleString() : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="size-4" />{locale === "ar" ? "تنزيل .txt" : "Download .txt"}
          </Button>
          <Button variant="gold" size="sm" onClick={persist} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {locale === "ar" ? "حفظ" : "Save"}
          </Button>
        </div>
      </div>

      <div className="card-elev rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">{locale === "ar" ? "أسماء المتحدثين" : "Speaker names"}</div>
          <Button size="sm" variant="outline" onClick={addSpeaker}>
            <Plus className="size-4" />{locale === "ar" ? "إضافة متحدث" : "Add speaker"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {locale === "ar"
            ? "أعِد تسمية المتحدثين هنا وسيتم تحديث جميع الأسطر تلقائيًا."
            : "Rename speakers here; every turn updates automatically."}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {speakers.map((sp, i) => (
            <div key={sp} className="flex items-center gap-2">
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${SPEAKER_COLORS[i % SPEAKER_COLORS.length]}`}>
                {defaultLabel(sp)}
              </span>
              <Input
                value={labels[sp] ?? ""}
                onChange={(e) => renameSpeaker(sp, e.target.value)}
                placeholder={defaultLabel(sp)}
                className="h-9"
              />
              <Button size="icon" variant="ghost" onClick={() => deleteSpeaker(sp)} title={locale === "ar" ? "حذف" : "Delete"}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="card-elev rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">
            {locale === "ar" ? "الأسطر" : "Turns"}
            <span className="ms-2 text-xs font-normal text-muted-foreground">({turns.length})</span>
          </div>
        </div>
        {turns.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {locale === "ar" ? "لا يوجد نص محفوظ لهذه الجلسة." : "No transcript saved for this session."}
          </p>
        ) : (
          <ul className="divide-y">
            {turns.map((t, i) => {
              const idx = speakers.indexOf(t.speaker);
              const cls = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
              return (
                <li key={i} className="grid gap-2 px-4 py-3 md:grid-cols-[180px_1fr_auto]">
                  <div className="space-y-1">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>
                      {labels[t.speaker] || defaultLabel(t.speaker)}
                    </span>
                    <select
                      value={t.speaker}
                      onChange={(e) => updateTurnSpeaker(i, e.target.value)}
                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                    >
                      {speakers.map((sp) => (
                        <option key={sp} value={sp}>{labels[sp] || defaultLabel(sp)}</option>
                      ))}
                    </select>
                  </div>
                  <Textarea
                    dir={locale === "ar" ? "rtl" : "ltr"}
                    value={t.text}
                    onChange={(e) => updateTurnText(i, e.target.value)}
                    rows={2}
                    className="min-h-[60px] resize-y text-sm"
                  />
                  <div className="flex md:flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => addTurn(i)} title={locale === "ar" ? "إضافة سطر" : "Add turn"}>
                      <Plus className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeTurn(i)} title={locale === "ar" ? "حذف" : "Delete"}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
