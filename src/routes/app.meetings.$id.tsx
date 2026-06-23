import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMeeting, saveMeetingTranscript } from "@/lib/meetings.functions";
import { useScribe } from "@elevenlabs/react";
import { CommitStrategy } from "@elevenlabs/client";
import { ArrowLeft, Copy, Mic, MicOff, Loader2, Save, PhoneOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/meetings/$id")({ component: MeetingRoom });

type Turn = { speaker: string; text: string; t?: number };

const SPEAKER_COLORS = [
  "bg-gold/15 text-gold border-gold/30",
  "bg-blue-500/15 text-blue-600 border-blue-500/30",
  "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  "bg-violet-500/15 text-violet-600 border-violet-500/30",
  "bg-rose-500/15 text-rose-600 border-rose-500/30",
];

function MeetingRoom() {
  const { locale } = useI18n();
  const { id } = useParams({ from: "/app/meetings/$id" });
  const get = useServerFn(getMeeting);
  const save = useServerFn(saveMeetingTranscript);

  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const jitsiHolder = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onPartialTranscript: (d: any) => setPartial(d?.text ?? ""),
    onCommittedTranscriptWithTimestamps: (d: any) => {
      const words = (d?.words ?? []) as { text: string; speaker?: string }[];
      const grouped: Turn[] = [];
      for (const w of words) {
        const sp = w.speaker || "speaker_0";
        const last = grouped[grouped.length - 1];
        if (last && last.speaker === sp) last.text += (last.text ? " " : "") + w.text;
        else grouped.push({ speaker: sp, text: w.text, t: Date.now() });
      }
      if (!grouped.length && d?.text) grouped.push({ speaker: "speaker_0", text: d.text, t: Date.now() });
      setTurns((prev) => [...prev, ...grouped]);
      setPartial("");
    },
  });

  // Load meeting + user name
  useEffect(() => {
    (async () => {
      try {
        const row: any = await get({ data: { id } });
        setMeeting(row);
        setTurns((row.turns as Turn[]) || []);
        const { data: u } = await supabase.auth.getUser();
        setDisplayName(u.user?.user_metadata?.full_name || u.user?.email || "Lawyer");
      } catch (e) { toast.error((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  // Load Jitsi external_api.js
  useEffect(() => {
    if (!meeting || !jitsiHolder.current) return;
    let cancelled = false;
    const ensureScript = () => new Promise<void>((resolve, reject) => {
      if ((window as any).JitsiMeetExternalAPI) return resolve();
      const s = document.createElement("script");
      s.src = "https://meet.jit.si/external_api.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Jitsi"));
      document.head.appendChild(s);
    });
    ensureScript().then(() => {
      if (cancelled || !jitsiHolder.current) return;
      const api = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
        roomName: meeting.room_name,
        parentNode: jitsiHolder.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
        },
      });
      apiRef.current = api;
    }).catch((e) => toast.error(e.message));
    return () => { cancelled = true; try { apiRef.current?.dispose(); } catch {} };
  }, [meeting, displayName]);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns.length, partial]);

  // Auto-save every 20s while recording
  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => snapshot(false), 20_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const transcriptText = useMemo(
    () => turns.map((t) => `[${labelFor(t.speaker)}] ${t.text}`).join("\n"),
    [turns],
  );

  async function snapshot(finalize: boolean) {
    setSaving(true);
    try {
      await save({ data: { id, transcript: transcriptText, turns: turnsRef.current, finalize } });
      if (finalize) toast.success(locale === "ar" ? "تم الحفظ وإنهاء الاجتماع" : "Saved & ended");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  async function toggleRec() {
    if (recording) {
      try { await scribe.disconnect(); } catch {}
      setRecording(false);
      return;
    }
    try {
      const res = await fetch("/api/elevenlabs/scribe-token", { method: "POST" });
      if (!res.ok) throw new Error("Token request failed");
      const { token } = await res.json();
      await scribe.connect({ token, microphone: { echoCancellation: true, noiseSuppression: true } });
      setRecording(true);
    } catch (e) { toast.error((e as Error).message); }
  }

  async function endMeeting() {
    if (recording) { try { await scribe.disconnect(); } catch {} setRecording(false); }
    try { apiRef.current?.executeCommand("hangup"); } catch {}
    await snapshot(true);
    setTimeout(() => window.location.assign("/app/meetings"), 600);
  }

  function copyInvite() {
    if (!meeting) return;
    const url = `${window.location.origin}/app/meetings/join/${meeting.room_name}`;
    navigator.clipboard.writeText(url);
    toast.success(locale === "ar" ? "تم النسخ" : "Link copied");
  }

  if (loading) {
    return <div className="grid h-[60vh] place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  }
  if (!meeting) return <p className="p-6 text-sm">{locale === "ar" ? "غير موجود" : "Not found"}</p>;

  const speakers = Array.from(new Set(turns.map((t) => t.speaker)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/app/meetings"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" />{locale === "ar" ? "رجوع" : "Back"}</Button></Link>
          <h1 className="font-serif text-2xl">{meeting.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyInvite}><Copy className="size-4" />{locale === "ar" ? "نسخ الدعوة" : "Copy invite"}</Button>
          <Button variant={recording ? "destructive" : "outline"} size="sm" onClick={toggleRec}>
            {recording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {recording ? (locale === "ar" ? "إيقاف التفريغ" : "Stop transcribing") : (locale === "ar" ? "ابدأ التفريغ" : "Start transcribing")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => snapshot(false)} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{locale === "ar" ? "حفظ" : "Save"}
          </Button>
          <Button variant="destructive" size="sm" onClick={endMeeting}>
            <PhoneOff className="size-4" />{locale === "ar" ? "إنهاء الاجتماع" : "End meeting"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="card-elev overflow-hidden rounded-xl border bg-onyx aspect-video lg:aspect-auto lg:h-[640px]">
          <div ref={jitsiHolder} className="h-full w-full" />
        </div>

        <div className="card-elev rounded-xl border bg-card flex flex-col h-[640px]">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold">{locale === "ar" ? "التفريغ المباشر" : "Live transcript"}</div>
            <div className="flex items-center gap-1">
              {speakers.map((sp, i) => (
                <span key={sp} className={`rounded-full border px-1.5 py-0.5 text-[10px] ${SPEAKER_COLORS[i % SPEAKER_COLORS.length]}`}>{labelFor(sp)}</span>
              ))}
            </div>
          </div>
          <div ref={scrollRef} dir={locale === "ar" ? "rtl" : "ltr"} className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
            {turns.length === 0 && !partial && (
              <p className="text-xs text-muted-foreground">
                {locale === "ar"
                  ? "اضغط « ابدأ التفريغ » لتسجيل المحادثة وتمييز المتحدثين."
                  : "Press \"Start transcribing\" to record and label speakers."}
              </p>
            )}
            {turns.map((t, i) => {
              const idx = speakers.indexOf(t.speaker);
              const cls = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
              return (
                <div key={i} className="space-y-1">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>{labelFor(t.speaker)}</span>
                  <p className="leading-relaxed">{t.text}</p>
                </div>
              );
            })}
            {partial && (
              <p className="italic text-muted-foreground">{partial}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function labelFor(speaker: string) {
  const m = speaker.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) + 1 : 1;
  return `Speaker ${n}`;
}
