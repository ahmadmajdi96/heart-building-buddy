import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScribe } from "@elevenlabs/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mic, Square, Loader2, Trash2, Languages, Search, FileText } from "lucide-react";
import {
  listLiveSessions,
  createLiveSession,
  saveLiveSession,
  deleteLiveSession,
} from "@/lib/live-sessions.functions";
import { listClients } from "@/lib/clients.functions";
import { listCases } from "@/lib/cases.functions";
import { useI18n } from "@/lib/i18n";

type Turn = { speaker: string; text: string; start?: number; end?: number };

export const Route = createFileRoute("/app/live-sessions/")({
  component: LiveSessionsPage,
});

function LiveSessionsPage() {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const sessions = useQuery({ queryKey: ["live-sessions"], queryFn: () => listLiveSessions() });
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const cases = useQuery({ queryKey: ["cases"], queryFn: () => listCases() });

  const createFn = useServerFn(createLiveSession);
  const saveFn = useServerFn(saveLiveSession);
  const deleteFn = useServerFn(deleteLiveSession);

  // Session metadata
  const [title, setTitle] = useState("");
  const [caseId, setCaseId] = useState<string>("none");
  const [clientId, setClientId] = useState<string>("none");
  const [language, setLanguage] = useState<"ara" | "eng">("ara");

  // Live state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad" as never,
    includeTimestamps: true,
    languageCode: language,
    onPartialTranscript: (data) => setPartial(data.text ?? ""),
    onCommittedTranscriptWithTimestamps: (data) => {
      const words = data.words ?? [];
      const speaker = words[0]?.speaker_id ?? "Speaker 1";
      setTurns((prev) => [
        ...prev,
        {
          speaker,
          text: data.text ?? "",
          start: words[0]?.start,
          end: words[words.length - 1]?.end,
        },
      ]);
      setPartial("");
    },
    onCommittedTranscript: (data) => {
      // Fallback when timestamps aren't enabled
      if (!data.text) return;
      setTurns((prev) => {
        if (prev.length && prev[prev.length - 1].text === data.text) return prev;
        return [...prev, { speaker: "Speaker 1", text: data.text! }];
      });
      setPartial("");
    },
  });

  const fullTranscript = useMemo(
    () => turns.map((t) => `${t.speaker}: ${t.text}`).join("\n"),
    [turns],
  );

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const created = await createFn({
        data: {
          title: title.trim() || (isAr ? "جلسة مباشرة" : "Live session"),
          case_id: caseId !== "none" ? caseId : null,
          client_id: clientId !== "none" ? clientId : null,
          language,
        },
      });
      setSessionId(created.id);
      setTurns([]);
      setPartial("");
      startedAtRef.current = Date.now();

      const tokenRes = await fetch("/api/public/elevenlabs/scribe-token", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Failed to mint token");
      const { token, error } = await tokenRes.json();
      if (!token) throw new Error(error || "No token");

      await scribe.connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      toast.success(isAr ? "بدأ التسجيل" : "Recording started");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsStarting(false);
    }
  }, [createFn, title, caseId, clientId, language, scribe, isAr]);

  const handleStop = useCallback(async () => {
    if (!sessionId) return;
    setIsSaving(true);
    try {
      await scribe.disconnect();
      const duration = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : undefined;
      await saveFn({
        data: {
          id: sessionId,
          transcript: fullTranscript,
          turns,
          finalize: true,
          duration_seconds: duration,
        },
      });
      toast.success(isAr ? "تم حفظ الجلسة" : "Session saved");
      setSessionId(null);
      startedAtRef.current = null;
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, scribe, saveFn, fullTranscript, turns, qc, isAr]);

  // Auto-save snapshot every 15s while recording
  useEffect(() => {
    if (!sessionId || !scribe.isConnected) return;
    const interval = setInterval(() => {
      saveFn({
        data: { id: sessionId, transcript: fullTranscript, turns, finalize: false },
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [sessionId, scribe.isConnected, saveFn, fullTranscript, turns]);

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? "حذف الجلسة؟" : "Delete this session?")) return;
    await deleteFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["live-sessions"] });
  };

  const speakerColors: Record<string, string> = {};
  const palette = ["bg-gold/20 text-onyx ring-gold/30", "bg-champagne/30 text-onyx ring-champagne/40", "bg-primary/15 text-primary ring-primary/30", "bg-secondary text-onyx ring-border"];
  const colorFor = (sp: string) => {
    if (!speakerColors[sp]) speakerColors[sp] = palette[Object.keys(speakerColors).length % palette.length];
    return speakerColors[sp];
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
          {isAr ? "تسجيل مباشر" : "Live recording"}
        </p>
        <h1 className="font-serif text-4xl text-onyx">
          {isAr ? "الجلسات المباشرة" : "Live Sessions"}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {isAr
            ? "سجّل الجلسة، حدّد المتحدثين تلقائياً، واحفظ النص الكامل مرتبطاً بالقضية أو الموكّل. مُحسَّن للهجة الأردنية."
            : "Record a session, auto-identify speakers, and save the full transcript linked to a case or client. Tuned for Jordanian Arabic."}
        </p>
        <div className="h-px w-24 bg-gold/60" />
      </header>

      {/* Recorder card */}
      <Card className="p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isAr ? "عنوان الجلسة" : "Title"}
            </label>
            <Input
              placeholder={isAr ? "مثلاً: اجتماع الموكل" : "e.g. Client intake"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!!sessionId}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isAr ? "القضية" : "Case"}
            </label>
            <Select value={caseId} onValueChange={setCaseId} disabled={!!sessionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isAr ? "بدون" : "None"}</SelectItem>
                {(cases.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isAr ? "الموكّل" : "Client"}
            </label>
            <Select value={clientId} onValueChange={setClientId} disabled={!!sessionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isAr ? "بدون" : "None"}</SelectItem>
                {(clients.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Languages className="size-3.5" />{isAr ? "اللغة" : "Language"}
            </label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "ara" | "eng")} disabled={!!sessionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ara">العربية (الأردنية)</SelectItem>
                <SelectItem value="eng">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!sessionId ? (
            <Button onClick={handleStart} disabled={isStarting} size="lg" className="gap-2">
              {isStarting ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
              {isAr ? "ابدأ التسجيل" : "Start recording"}
            </Button>
          ) : (
            <Button onClick={handleStop} disabled={isSaving} size="lg" variant="destructive" className="gap-2">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
              {isAr ? "إيقاف وحفظ" : "Stop & save"}
            </Button>
          )}
          {scribe.isConnected && (
            <Badge variant="outline" className="border-gold/40 text-gold gap-1.5">
              <span className="inline-block size-2 animate-pulse rounded-full bg-gold" />
              {isAr ? "مباشر" : "LIVE"}
            </Badge>
          )}
          {turns.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {turns.length} {isAr ? "تدخّل" : "turns"}
            </span>
          )}
        </div>

        {/* Live transcript */}
        {(sessionId || turns.length > 0) && (
          <div className="rounded-lg border border-border bg-pearl/40 p-5 max-h-[500px] overflow-y-auto space-y-3" dir={language === "ara" ? "rtl" : "ltr"}>
            {turns.length === 0 && !partial && (
              <p className="text-sm text-muted-foreground italic">
                {isAr ? "بانتظار الكلام…" : "Waiting for speech…"}
              </p>
            )}
            {turns.map((turn, i) => (
              <div key={i} className="space-y-1">
                <Badge variant="outline" className={`ring-1 ${colorFor(turn.speaker)}`}>
                  {turn.speaker}
                </Badge>
                <p className="text-onyx leading-relaxed">{turn.text}</p>
              </div>
            ))}
            {partial && (
              <p className="text-muted-foreground italic leading-relaxed">{partial}</p>
            )}
          </div>
        )}
      </Card>

      {/* Past sessions */}
      <PastSessions sessions={sessions.data ?? []} loading={sessions.isLoading} isAr={isAr} onDelete={handleDelete} />
    </div>
  );
}

function PastSessions({ sessions, loading, isAr, onDelete }: {
  sessions: any[]; loading: boolean; isAr: boolean; onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const statuses = useMemo(() => {
    const set = new Set<string>(); sessions.forEach((s) => s.status && set.add(s.status));
    return ["all", ...Array.from(set)];
  }, [sessions]);
  const filtered = useMemo(() => sessions.filter((s) => {
    if (status !== "all" && s.status !== status) return false;
    if (!q.trim()) return true;
    return (s.title ?? "").toLowerCase().includes(q.toLowerCase());
  }), [sessions, q, status]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-onyx">{isAr ? "الجلسات السابقة" : "Past sessions"}</h2>
          <div className="h-px w-16 bg-gold/40 mt-1" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAr ? "ابحث…" : "Search…"} className="h-9 ps-9" />
          </div>
          <div className="flex gap-1.5">
            {statuses.map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "ghost"} onClick={() => setStatus(s)} className="capitalize">
                {s === "all" ? (isAr ? "الكل" : "All") : s}
              </Button>
            ))}
          </div>
        </div>
      </div>
      {loading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {sessions.length === 0
            ? (isAr ? "لا توجد جلسات بعد." : "No sessions yet.")
            : (isAr ? "لا نتائج تطابق البحث." : "No matches.")}
        </p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-onyx truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(s.started_at).toLocaleString(isAr ? "ar-JO" : "en-US")}
                  {s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)}m` : ""}
                  {" · "}
                  <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link to="/app/live-sessions/transcript/$id" params={{ id: s.id }}>
                  <Button variant="ghost" size="icon" aria-label="Edit transcript" title={isAr ? "تحرير النص" : "Edit transcript"}>
                    <FileText className="size-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)} aria-label="Delete">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
