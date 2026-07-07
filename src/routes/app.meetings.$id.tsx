import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMeeting, saveMeetingTranscript } from "@/lib/meetings.functions";
import { useScribe } from "@elevenlabs/react";
import { CommitStrategy } from "@elevenlabs/client";
import {
  ArrowLeft,
  Copy,
  Mic,
  MicOff,
  Loader2,
  Save,
  PhoneOff,
  Sparkles,
  MonitorSpeaker,
} from "lucide-react";
import { JITSI_DOMAIN, JITSI_EXTERNAL_API_URL } from "@/lib/jitsi-config";

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

function pickRecorderMime(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return undefined;
}

function extForMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

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
  const [enhancing, setEnhancing] = useState(false);
  const [captureTab, setCaptureTab] = useState(false);
  const [diarizationSource, setDiarizationSource] = useState<"mixed" | "mic" | "tab">("mixed");
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const jitsiHolder = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  // Local audio recorders for high-accuracy batch re-transcription.
  // We keep mic, tab and mixed streams separate so the user can pick
  // whichever track diarizes best.
  type Track = "mic" | "tab" | "mixed";
  const recordersRef = useRef<Partial<Record<Track, MediaRecorder>>>({});
  const chunksRef = useRef<Record<Track, Blob[]>>({ mic: [], tab: [], mixed: [] });
  const recorderMimeRef = useRef<string>("audio/webm");
  const micStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);


  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
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
      s.src = JITSI_EXTERNAL_API_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Jitsi"));
      document.head.appendChild(s);
    });
    ensureScript().then(() => {
      if (cancelled || !jitsiHolder.current) return;
      const api = new (window as any).JitsiMeetExternalAPI(JITSI_DOMAIN, {
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocalRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function startLocalRecorder(): Promise<void> {
    // Get local mic at high quality with all cleanup enabled
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      } as MediaTrackConstraints,
    });
    micStreamRef.current = mic;

    // Optionally mix in tab audio (captures remote Jitsi participants)
    let combined: MediaStream = mic;
    if (captureTab) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        } as any);
        const hasAudio = display.getAudioTracks().length > 0;
        if (!hasAudio) {
          toast.warning(
            locale === "ar"
              ? "لم يتم مشاركة صوت التبويب. اختر «هذا التبويب» وفعّل «مشاركة صوت التبويب»."
              : "No tab audio shared. Pick “This tab” and enable “Share tab audio”.",
          );
          display.getTracks().forEach((t) => t.stop());
        } else {
          displayStreamRef.current = display;
          const ctx = new AudioContext();
          audioCtxRef.current = ctx;
          const dest = ctx.createMediaStreamDestination();
          ctx.createMediaStreamSource(mic).connect(dest);
          ctx.createMediaStreamSource(new MediaStream(display.getAudioTracks())).connect(dest);
          combined = dest.stream;
          // stop the video track we don't need
          display.getVideoTracks().forEach((t) => t.stop());
        }
      } catch (e) {
        toast.warning(
          locale === "ar"
            ? "تم تجاهل مشاركة الشاشة، سيتم تسجيل الميكروفون فقط."
            : "Screen share cancelled — recording microphone only.",
        );
      }
    }

    const mime = pickRecorderMime();
    recorderMimeRef.current = mime || "audio/webm";
    chunksRef.current = { mic: [], tab: [], mixed: [] };
    recordersRef.current = {};

    const makeRec = (track: Track, stream: MediaStream) => {
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128_000 })
        : new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current[track].push(e.data); };
      rec.start(1000);
      recordersRef.current[track] = rec;
    };

    // Always record mic on its own track.
    makeRec("mic", mic);
    // Always record the "mixed" track so live scribe input matches it (mic-only when no tab).
    makeRec("mixed", combined);
    // If tab audio is available, record it separately too.
    if (displayStreamRef.current) {
      const tabOnly = new MediaStream(displayStreamRef.current.getAudioTracks());
      makeRec("tab", tabOnly);
    }
  }

  function stopLocalRecorder(): Promise<Record<Track, Blob | null>> {
    return new Promise((resolve) => {
      const recs = recordersRef.current;
      const tracks: Track[] = ["mic", "tab", "mixed"];
      const active = tracks.filter((t) => recs[t]);
      if (active.length === 0) return resolve({ mic: null, tab: null, mixed: null });
      const out: Record<Track, Blob | null> = { mic: null, tab: null, mixed: null };
      let remaining = active.length;
      const finish = () => {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        displayStreamRef.current?.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        displayStreamRef.current = null;
        try { audioCtxRef.current?.close(); } catch {}
        audioCtxRef.current = null;
        recordersRef.current = {};
        resolve(out);
      };
      active.forEach((track) => {
        const rec = recs[track]!;
        rec.onstop = () => {
          try {
            const blob = new Blob(chunksRef.current[track], { type: recorderMimeRef.current });
            out[track] = blob.size > 0 ? blob : null;
          } catch { out[track] = null; }
          remaining -= 1;
          if (remaining === 0) finish();
        };
        try { rec.stop(); } catch {
          remaining -= 1;
          if (remaining === 0) finish();
        }
      });
    });
  }

  function pickBlob(blobs: Record<Track, Blob | null>): Blob | null {
    const preferred = blobs[diarizationSource];
    if (preferred && preferred.size > 4096) return preferred;
    // Fallback chain: mixed → mic → tab
    return blobs.mixed || blobs.mic || blobs.tab || preferred;
  }


  async function toggleRec() {
    if (recording) {
      try { await scribe.disconnect(); } catch {}
      await stopLocalRecorder();
      setRecording(false);
      return;
    }
    try {
      const res = await fetch("/api/elevenlabs/scribe-token", { method: "POST" });
      if (!res.ok) throw new Error("Token request failed");
      const { token } = await res.json();
      await scribe.connect({
        token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any,
      });
      await startLocalRecorder();
      setRecording(true);
    } catch (e) { toast.error((e as Error).message); }
  }

  async function enhanceWithBatch(blob: Blob): Promise<Turn[] | null> {
    setEnhancing(true);
    try {
      const fd = new FormData();
      const ext = extForMime(recorderMimeRef.current);
      fd.append("file", blob, `meeting.${ext}`);
      if (locale === "ar") fd.append("language", "ara");
      else if (locale === "en") fd.append("language", "eng");
      const res = await fetch("/api/elevenlabs/transcribe", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Batch STT failed (${res.status})`);
      }
      const data = await res.json();
      const words = (data?.words ?? []) as Array<{ text: string; speaker_id?: string; type?: string }>;
      const grouped: Turn[] = [];
      for (const w of words) {
        if (w.type && w.type !== "word") continue;
        const sp = w.speaker_id || "speaker_0";
        const last = grouped[grouped.length - 1];
        if (last && last.speaker === sp) last.text += (last.text ? " " : "") + w.text;
        else grouped.push({ speaker: sp, text: w.text, t: Date.now() });
      }
      if (!grouped.length && data?.text) grouped.push({ speaker: "speaker_0", text: data.text, t: Date.now() });
      return grouped;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setEnhancing(false);
    }
  }

  async function enhanceNow() {
    if (!recorderRef.current && recorderChunksRef.current.length === 0) {
      toast.error(
        locale === "ar"
          ? "لا يوجد تسجيل. ابدأ التفريغ أولاً."
          : "Nothing recorded yet. Start transcribing first.",
      );
      return;
    }
    const wasRecording = recording;
    if (wasRecording) {
      try { await scribe.disconnect(); } catch {}
      setRecording(false);
    }
    const blob = await stopLocalRecorder();
    if (!blob) {
      toast.error(locale === "ar" ? "التسجيل فارغ" : "Recording is empty");
      return;
    }
    const better = await enhanceWithBatch(blob);
    if (better && better.length) {
      setTurns(better);
      toast.success(locale === "ar" ? "تم تحسين التفريغ" : "Transcript enhanced");
    }
  }

  async function endMeeting() {
    let better: Turn[] | null = null;
    if (recording) { try { await scribe.disconnect(); } catch {} setRecording(false); }
    const blob = await stopLocalRecorder();
    if (blob && blob.size > 4096) {
      better = await enhanceWithBatch(blob);
      if (better && better.length) setTurns(better);
    }
    try { apiRef.current?.executeCommand("hangup"); } catch {}
    // Save immediately using the enhanced turns if we got them
    setSaving(true);
    try {
      const finalTurns = better && better.length ? better : turnsRef.current;
      const finalText = finalTurns.map((t) => `[${labelFor(t.speaker)}] ${t.text}`).join("\n");
      await save({ data: { id, transcript: finalText, turns: finalTurns, finalize: true } });
      toast.success(locale === "ar" ? "تم الحفظ وإنهاء الاجتماع" : "Saved & ended");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
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
          <Button
            variant={captureTab ? "gold" : "outline"}
            size="sm"
            onClick={() => setCaptureTab((v) => !v)}
            disabled={recording}
            title={locale === "ar" ? "التقاط صوت جميع المشاركين عبر مشاركة التبويب" : "Capture all participants by sharing tab audio"}
          >
            <MonitorSpeaker className="size-4" />
            {captureTab
              ? (locale === "ar" ? "صوت التبويب: مفعّل" : "Tab audio: on")
              : (locale === "ar" ? "صوت التبويب" : "Tab audio")}
          </Button>
          <Button variant={recording ? "destructive" : "outline"} size="sm" onClick={toggleRec}>
            {recording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {recording ? (locale === "ar" ? "إيقاف التفريغ" : "Stop transcribing") : (locale === "ar" ? "ابدأ التفريغ" : "Start transcribing")}
          </Button>
          <Button variant="outline" size="sm" onClick={enhanceNow} disabled={enhancing}>
            {enhancing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {locale === "ar" ? "تحسين الدقة" : "Enhance"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => snapshot(false)} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{locale === "ar" ? "حفظ" : "Save"}
          </Button>
          <Button variant="destructive" size="sm" onClick={endMeeting}>
            <PhoneOff className="size-4" />{locale === "ar" ? "إنهاء الاجتماع" : "End meeting"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {locale === "ar"
          ? "لأفضل دقة وتمييز للمتحدثين: فعّل «صوت التبويب» قبل بدء التفريغ، ثم اختر «هذا التبويب» مع تفعيل «مشاركة صوت التبويب». عند «إنهاء الاجتماع» يتم تشغيل تفريغ عالي الدقة تلقائيًا."
          : "For best accuracy and speaker separation: enable “Tab audio” before you start, then pick “This tab” with “Share tab audio” checked. On “End meeting” we automatically run a high-accuracy diarized pass."}
      </p>

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
