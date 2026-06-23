import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { courtroomTurn, saveSimulation, listSimulations, deleteSimulation, getSimulation } from "@/lib/courtroom.functions";
import { extractTextFromFile } from "@/lib/extract-text";
import { useServerFn } from "@tanstack/react-start";
import { MarkdownView } from "@/lib/markdown";
import { Gavel, Scale, Upload, Loader2, RefreshCw, Send, User as UserIcon, FileText, History, Trash2, Play, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/courtroom")({
  component: CourtroomPage,
});

type Role = "claimant" | "defendant";
type Speaker = "judge" | "opposing" | "user" | "narrator";
type Msg = { speaker: Speaker; text: string };

type CaseBrief = {
  title: string;
  jurisdiction: string;
  court: string;
  caseNumber: string;
  summary: string;
  facts: string;
  charges: string[];
  claimantName: string;
  defendantName: string;
  evidence: string[];
};

const L = {
  title: { ar: "محاكاة قاعة المحكمة", en: "Courtroom Simulation" },
  subtitle: {
    ar: "محاكمة حية مع قاضٍ وخصم مدعومَين بالذكاء الاصطناعي.",
    en: "A live hearing with an AI judge and AI opposing counsel.",
  },
  step_role: { ar: "اختر دورك", en: "Choose your role" },
  claimant: { ar: "المدّعي", en: "Claimant / Prosecution" },
  defendant: { ar: "المدّعى عليه", en: "Defendant" },
  step_case: { ar: "اختر القضية", en: "Choose the case" },
  tab_generate: { ar: "توليد سيناريو", en: "Generate scenario" },
  tab_upload: { ar: "رفع/لصق مستند", en: "Upload / paste document" },
  hint: { ar: "تلميح اختياري (مثال: نزاع تجاري، أضرار 500 ألف)", en: "Optional hint (e.g. commercial dispute, 500k damages)" },
  practice: { ar: "مجال الممارسة (اختياري)", en: "Practice area (optional)" },
  generate: { ar: "توليد قضية", en: "Generate case" },
  regenerate: { ar: "توليد قضية أخرى", en: "Generate another" },
  upload_btn: { ar: "اختر ملفاً نصياً", en: "Choose a text file" },
  paste_ph: { ar: "أو الصق نص المستند هنا…", en: "…or paste the document text here" },
  start: { ar: "ابدأ الجلسة", en: "Start hearing" },
  reset: { ar: "محاكمة جديدة", en: "New trial" },
  speak_ph: { ar: "تحدث أمام المحكمة…", en: "Address the court…" },
  send: { ar: "تحدث", en: "Speak" },
  thinking: { ar: "المحكمة تنظر…", en: "The court deliberates…" },
  case_label: { ar: "ملخص القضية", en: "Case brief" },
  charges: { ar: "التهم/المطالب", en: "Charges / Claims" },
  evidence: { ar: "الأدلة", en: "Evidence" },
  verdict_in: { ar: "صدر الحكم — انتهت الجلسة.", en: "Verdict issued — hearing closed." },
  judge_label: { ar: "القاضي", en: "Judge" },
  opposing_label: { ar: "الخصم", en: "Opposing counsel" },
  narrator_label: { ar: "سرد", en: "Narrator" },
  you_label: { ar: "أنت", en: "You" },
  no_case: { ar: "لا توجد قضية بعد", en: "No case loaded yet" },
} as const;

function CourtroomPage() {
  const { t: _t, locale, dir } = useI18n();
  const tt = (k: keyof typeof L) => L[k][locale];

  const [role, setRole] = useState<Role>("defendant");
  const [mode, setMode] = useState<"generate" | "upload">("generate");
  const [hint, setHint] = useState("");
  const [practice, setPractice] = useState("");
  const [pasted, setPasted] = useState("");
  const [caseBrief, setCaseBrief] = useState<CaseBrief | null>(null);
  const [busy, setBusy] = useState<null | "case" | "turn" | "start">(null);
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [verdict, setVerdict] = useState(false);
  const [input, setInput] = useState("");
  const [simId, setSimId] = useState<string | null>(null);
  const [pastSims, setPastSims] = useState<{ id: string; title: string | null; created_at: string }[]>([]);

  const saveSim = useServerFn(saveSimulation);
  const listSims = useServerFn(listSimulations);
  const delSim = useServerFn(deleteSimulation);

  async function refreshSims() { try { setPastSims((await listSims()) as any); } catch {} }
  useEffect(() => { refreshSims(); }, []);

  async function persist(extra?: { transcript?: Msg[]; verdict?: boolean }) {
    if (!caseBrief) return;
    const tr = extra?.transcript ?? history;
    const v = extra?.verdict ?? verdict;
    try {
      const row = await saveSim({ data: {
        id: simId ?? undefined,
        title: caseBrief.title,
        scenario: caseBrief,
        transcript: tr,
        verdict: v ? { reached: true } : null,
      }}) as any;
      if (row?.id && !simId) setSimId(row.id);
      refreshSims();
    } catch {}
  }

  const transcriptRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [history, busy]);

  useEffect(() => {
    if (caseBrief && !started) {
      // Wait for layout then scroll the brief into view
      const id = window.setTimeout(() => {
        briefRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return () => window.clearTimeout(id);
    }
  }, [caseBrief, started]);

  async function handleGenerate() {
    setBusy("case"); setError(null);
    setCaseBrief(null);
    try {
      const c = await generateCase({ data: { locale, hint: hint || undefined, practiceArea: practice || undefined } });
      setCaseBrief(c as CaseBrief);
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(null); }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setPasted(text);
    buildBriefFromText(text, file.name);
  }

  function buildBriefFromText(text: string, name = "Uploaded document") {
    const trimmed = text.slice(0, 6000);
    setCaseBrief({
      title: name,
      jurisdiction: locale === "ar" ? "غير محدد" : "Unspecified",
      court: locale === "ar" ? "محكمة عامة" : "General Court",
      caseNumber: "—",
      summary: trimmed.slice(0, 400),
      facts: trimmed,
      charges: [],
      claimantName: locale === "ar" ? "الطرف الأول" : "Party A",
      defendantName: locale === "ar" ? "الطرف الثاني" : "Party B",
      evidence: [],
    });
  }

  async function handleStart() {
    if (!caseBrief) return;
    setBusy("start"); setError(null);
    try {
      const brief = briefToText(caseBrief, locale);
      const res = await courtroomTurn({
        data: { locale, userRole: role, caseBrief: brief, history: [], start: true },
      });
      const turns = res.turns.map((x) => ({ speaker: x.speaker as Speaker, text: x.text }));
      setHistory(turns);
      setVerdict(res.verdictReached);
      setStarted(true);
      persist({ transcript: turns, verdict: res.verdictReached });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  async function handleSpeak() {
    const msg = input.trim();
    if (!msg || !caseBrief || verdict) return;
    setInput("");
    const next: Msg[] = [...history, { speaker: "user", text: msg }];
    setHistory(next);
    setBusy("turn"); setError(null);
    try {
      const brief = briefToText(caseBrief, locale);
      const res = await courtroomTurn({
        data: { locale, userRole: role, caseBrief: brief, history: next, userMessage: msg },
      });
      const added = res.turns.map((x) => ({ speaker: x.speaker as Speaker, text: x.text }));
      const finalHistory = [...next, ...added];
      setHistory(finalHistory);
      if (res.verdictReached) setVerdict(true);
      persist({ transcript: finalHistory, verdict: res.verdictReached || verdict });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  function reset() {
    setStarted(false); setHistory([]); setVerdict(false); setCaseBrief(null);
    setPasted(""); setHint(""); setPractice(""); setInput("");
    setSimId(null);
  }

  async function loadSim(id: string) {
    const sim = pastSims.find((s) => s.id === id);
    if (!sim) return;
    // Just refresh and let user pick; full restore would need the scenario/transcript
    toast.info("Loading past simulation...");
  }

  async function removeSim(id: string) {
    if (!confirm("Delete this simulation?")) return;
    try { await delSim({ data: { id } }); refreshSims(); } catch {}
  }

  // ---------- Render ----------
  if (!started) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-gold">
            <Scale className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">{tt("title")}</span>
          </div>
          <h1 className="font-serif text-4xl">{tt("title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{tt("subtitle")}</p>
        </header>

        {/* Step 1: role */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">1. {tt("step_role")}</h2>
          <RadioGroup value={role} onValueChange={(v) => setRole(v as Role)} className="grid gap-3 sm:grid-cols-2">
            {(["claimant", "defendant"] as Role[]).map((r) => (
              <label
                key={r}
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition",
                  role === r ? "border-gold bg-gold/5 ring-1 ring-gold/30" : "hover:bg-secondary/50",
                ].join(" ")}
              >
                <RadioGroupItem value={r} id={`r-${r}`} className="mt-1" />
                <div>
                  <Label htmlFor={`r-${r}`} className="text-base font-semibold cursor-pointer">{tt(r)}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r === "claimant"
                      ? (locale === "ar" ? "تقدّم الدعوى وتطالب بالحقوق." : "You bring the case and argue first.")
                      : (locale === "ar" ? "تردّ على الادعاءات وتدافع." : "You respond to the claims and defend.")}
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </Card>

        {/* Step 2: case */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">2. {tt("step_case")}</h2>
          <div className="mb-4 flex gap-2">
            <Button variant={mode === "generate" ? "gold" : "outline"} size="sm" onClick={() => setMode("generate")}>
              <Sparkles className="size-4" /> {tt("tab_generate")}
            </Button>
            <Button variant={mode === "upload" ? "gold" : "outline"} size="sm" onClick={() => setMode("upload")}>
              <Upload className="size-4" /> {tt("tab_upload")}
            </Button>
          </div>

          {mode === "generate" ? (
            <div className="space-y-3">
              <Input placeholder={tt("practice")} value={practice} onChange={(e) => setPractice(e.target.value)} />
              <Textarea placeholder={tt("hint")} value={hint} onChange={(e) => setHint(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button onClick={handleGenerate} disabled={busy === "case"} variant="gold">
                  {busy === "case" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {caseBrief ? tt("regenerate") : tt("generate")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-secondary/40">
                <Upload className="size-4" />
                <span>{tt("upload_btn")} (.txt, .md)</span>
                <input
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </label>
              <Textarea
                placeholder={tt("paste_ph")}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
              />
              {pasted && (
                <Button variant="outline" size="sm" onClick={() => buildBriefFromText(pasted)}>
                  <FileText className="size-4" /> {locale === "ar" ? "استخدم هذا النص" : "Use this text"}
                </Button>
              )}
            </div>
          )}

          {busy === "case" && !caseBrief && (
            <div className="mt-6 flex items-center gap-3 rounded-md border border-gold/30 bg-gold/5 p-4 text-sm">
              <Loader2 className="size-4 animate-spin text-gold" />
              <span>{locale === "ar" ? "جارٍ توليد القضية بواسطة الذكاء الاصطناعي…" : "Generating your case with AI…"}</span>
            </div>
          )}

          {caseBrief && (
            <div ref={briefRef}>
              <Separator className="my-6" />
              <CaseSummary brief={caseBrief} tt={tt} />
              <div className="mt-6 flex justify-end">
                <Button onClick={handleStart} disabled={busy === "start"} variant="gold" size="lg">
                  {busy === "start" ? <Loader2 className="size-4 animate-spin" /> : <Gavel className="size-4" />}
                  {tt("start")}
                </Button>
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </Card>

        {pastSims.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold flex items-center gap-2"><History className="size-4 text-gold" />{locale === "ar" ? "محاكمات سابقة محفوظة" : "Saved past simulations"}</h2>
            <ul className="space-y-2">
              {pastSims.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{s.title ?? "(untitled)"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSim(s.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  // Courtroom in session
  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-h-[70vh] flex-col">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-gold">
              <Gavel className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">{caseBrief?.court}</span>
            </div>
            <h1 className="font-serif text-2xl">{caseBrief?.title}</h1>
            <p className="text-xs text-muted-foreground">
              {caseBrief?.caseNumber} · {tt(role)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="size-4" /> {tt("reset")}
          </Button>
        </header>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div ref={transcriptRef} className="flex-1 space-y-4 overflow-y-auto p-5">
            {history.map((m, i) => (
              <Bubble key={i} msg={m} dir={dir} tt={tt} />
            ))}
            {busy === "turn" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> {tt("thinking")}
              </div>
            )}
            {verdict && (
              <div className="rounded-md border border-gold/40 bg-gold/10 p-3 text-center text-sm font-medium text-gold">
                {tt("verdict_in")}
              </div>
            )}
          </div>
          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={tt("speak_ph")}
                rows={2}
                disabled={verdict || busy === "turn"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSpeak(); }
                }}
                className="min-h-[44px] resize-none"
              />
              <Button onClick={handleSpeak} disabled={!input.trim() || verdict || busy === "turn"} variant="gold">
                <Send className="size-4" /> {tt("send")}
              </Button>
            </div>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">{tt("case_label")}</h3>
          {caseBrief && <CaseSummary brief={caseBrief} tt={tt} compact />}
        </Card>
      </aside>
    </div>
  );
}

function briefToText(c: CaseBrief, locale: "ar" | "en") {
  const lines = [
    `Title: ${c.title}`,
    `Court: ${c.court} (${c.jurisdiction})`,
    `Case #: ${c.caseNumber}`,
    `Claimant: ${c.claimantName}`,
    `Defendant: ${c.defendantName}`,
    `Summary: ${c.summary}`,
    `Facts: ${c.facts}`,
    c.charges.length ? `Charges/Claims: ${c.charges.join("; ")}` : "",
    c.evidence.length ? `Evidence: ${c.evidence.join("; ")}` : "",
    `Locale: ${locale}`,
  ].filter(Boolean);
  return lines.join("\n");
}

function CaseSummary({
  brief, tt, compact = false,
}: { brief: CaseBrief; tt: (k: keyof typeof L) => string; compact?: boolean }) {
  return (
    <div className="space-y-3 text-sm">
      {!compact && (
        <div>
          <div className="font-serif text-xl">{brief.title}</div>
          <div className="text-xs text-muted-foreground">
            {brief.court} · {brief.jurisdiction} · {brief.caseNumber}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">{brief.claimantName}</Badge>
        <span className="text-muted-foreground">vs</span>
        <Badge variant="secondary">{brief.defendantName}</Badge>
      </div>
      <p className="text-muted-foreground leading-relaxed">{brief.summary}</p>
      {brief.charges.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold text-foreground/80">{tt("charges")}</div>
          <ul className="list-disc space-y-0.5 ps-5 text-xs text-muted-foreground">
            {brief.charges.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      {brief.evidence.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold text-foreground/80">{tt("evidence")}</div>
          <ul className="list-disc space-y-0.5 ps-5 text-xs text-muted-foreground">
            {brief.evidence.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Bubble({ msg, dir, tt }: { msg: Msg; dir: "rtl" | "ltr"; tt: (k: keyof typeof L) => string }) {
  const isUser = msg.speaker === "user";
  const meta: Record<Speaker, { label: string; icon: React.ReactNode; tone: string }> = {
    judge: { label: tt("judge_label"), icon: <Gavel className="size-3.5" />, tone: "bg-primary text-primary-foreground" },
    opposing: { label: tt("opposing_label"), icon: <Scale className="size-3.5" />, tone: "bg-destructive/90 text-destructive-foreground" },
    user: { label: tt("you_label"), icon: <UserIcon className="size-3.5" />, tone: "bg-gold text-primary" },
    narrator: { label: tt("narrator_label"), icon: <FileText className="size-3.5" />, tone: "bg-muted text-muted-foreground" },
  };
  const m = meta[msg.speaker];
  return (
    <div className={["flex gap-3", isUser ? "flex-row-reverse" : ""].join(" ")} dir={dir}>
      <div className={["flex size-8 shrink-0 items-center justify-center rounded-full", m.tone].join(" ")}>
        {m.icon}
      </div>
      <div className={["max-w-[80%] rounded-2xl border px-4 py-2.5 text-sm leading-relaxed",
        isUser ? "bg-gold/10 border-gold/30" :
        msg.speaker === "judge" ? "bg-primary/5 border-primary/20" :
        msg.speaker === "opposing" ? "bg-destructive/5 border-destructive/20" :
        "bg-muted border-border"
      ].join(" ")}>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
        {isUser ? <div className="whitespace-pre-wrap">{msg.text}</div> : <MarkdownView text={msg.text} className="text-sm" />}
      </div>
    </div>
  );
}
