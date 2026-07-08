import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createAiGatewayProvider, getAiGatewayApiKey, sanitizeLanguageText, strictLanguageDirective } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct";

function getGateway() {
  return createAiGatewayProvider(getAiGatewayApiKey());
}

// Query the private RAG service for Jordanian-law context relevant to this turn.
async function ragContext(userId: string, question: string): Promise<string> {
  try {
    const { ragFetch } = await import("./rag.server");
    const res = await ragFetch(`/v1/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: `user:${userId}`,
        question,
        top_k: 12,
        rerank_top_n: 5,
        temperature: 0.1,
        max_tokens: 600,
      }),
    });
    if (!res.ok) return "";
    const json = (await res.json()) as {
      answer?: string;
      sources?: Array<{ filename?: string; page?: number; excerpt?: string }>;
    };
    const parts: string[] = [];
    if (json.answer) parts.push(json.answer.trim());
    if (json.sources?.length) {
      const src = json.sources
        .slice(0, 5)
        .map((s, i) => `[${i + 1}] ${s.filename ?? "source"}${s.page ? ` p.${s.page}` : ""}: ${(s.excerpt ?? "").slice(0, 400)}`)
        .join("\n");
      parts.push(`SOURCES:\n${src}`);
    }
    return parts.join("\n\n").slice(0, 4000);
  } catch {
    return "";
  }
}

function extractJson(text: string): unknown {
  let s = text.trim();
  // strip code fences
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // find first { ... last }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

// ---------- Generate a fictional case ----------
const GenerateCaseInput = z.object({
  locale: z.enum(["ar", "en"]).default("en"),
  hint: z.string().optional(),
  practiceArea: z.string().optional(),
});

const CaseSchema = z.object({
  title: z.string(),
  jurisdiction: z.string(),
  court: z.string(),
  caseNumber: z.string(),
  summary: z.string(),
  facts: z.string(),
  charges: z.array(z.string()),
  claimantName: z.string(),
  defendantName: z.string(),
  evidence: z.array(z.string()),
});

export const generateCase = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GenerateCaseInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const { text } = await generateText({
      model: gateway(MODEL),
      system: `${strictLanguageDirective(data.locale)}

You are a legal case generator specialized in Jordanian law. Always reply with a single valid JSON object and no other text. Every string value in the JSON MUST follow the LANGUAGE LOCK above.`,
      prompt: `Generate a realistic but fictional legal case scenario for a courtroom simulation in the Hashemite Kingdom of Jordan. The case must be grounded in Jordanian law (Civil Code, Penal Code, Labour Law, Commercial Code, Personal Status Law, etc.).
Write all string values in ${lang}. Set "jurisdiction" to "Jordan" / "الأردن" and pick a real Jordanian court (e.g. Amman First Instance Court, Court of Cassation, Administrative Court).
Practice area hint: ${data.practiceArea ?? "any"}.
Extra hint: ${data.hint ?? "none"}.

Return ONLY a JSON object with this exact shape (no markdown, no commentary):
{
  "title": string,
  "jurisdiction": string,
  "court": string,
  "caseNumber": string,
  "summary": string (1-2 sentences),
  "facts": string (3-5 sentences of detailed facts),
  "charges": string[] (2-4 items, cite Jordanian articles when relevant),
  "claimantName": string,
  "defendantName": string,
  "evidence": string[] (3-5 items)
}`,
    });
    const parsed = CaseSchema.parse(extractJson(text));
    return {
      ...parsed,
      title: sanitizeLanguageText(parsed.title, data.locale),
      jurisdiction: sanitizeLanguageText(parsed.jurisdiction, data.locale),
      court: sanitizeLanguageText(parsed.court, data.locale),
      summary: sanitizeLanguageText(parsed.summary, data.locale),
      facts: sanitizeLanguageText(parsed.facts, data.locale),
      charges: parsed.charges.map((charge) => sanitizeLanguageText(charge, data.locale)),
      claimantName: sanitizeLanguageText(parsed.claimantName, data.locale),
      defendantName: sanitizeLanguageText(parsed.defendantName, data.locale),
      evidence: parsed.evidence.map((item) => sanitizeLanguageText(item, data.locale)),
    };
  });

// ---------- Courtroom turn ----------
const MsgSchema = z.object({
  speaker: z.enum(["judge", "opposing", "user", "narrator"]),
  text: z.string(),
});

const TurnInput = z.object({
  locale: z.enum(["ar", "en"]).default("en"),
  userRole: z.enum(["claimant", "defendant"]),
  caseBrief: z.string(),
  history: z.array(MsgSchema),
  userMessage: z.string().optional(),
  start: z.boolean().optional(),
});

const TurnOutput = z.object({
  turns: z.array(z.object({
    speaker: z.enum(["judge", "opposing", "narrator"]),
    text: z.string(),
  })).min(1),
  verdictReached: z.boolean().optional().default(false),
});

export const courtroomTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TurnInput.parse(d))
  .handler(async ({ data, context }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const opposingRole = data.userRole === "claimant" ? "defendant" : "claimant";

    // Build a question for the RAG index from the case + latest exchange,
    // so the AI hearing is grounded in the user's Jordanian-law RAG corpus.
    const recent = data.history.slice(-4).map((m) => `[${m.speaker}] ${m.text}`).join("\n");
    const ragQuestion = [
      data.caseBrief.slice(0, 1500),
      data.userMessage ? `Latest counsel statement: ${data.userMessage}` : "",
      recent ? `Recent exchange:\n${recent}` : "",
      "What Jordanian statutes, articles, and cassation rulings are directly relevant?",
    ].filter(Boolean).join("\n\n");
    const grounding = await ragContext(context.userId, ragQuestion);

    const system = `${strictLanguageDirective(data.locale)}

You simulate a realistic court hearing in the Hashemite Kingdom of Jordan. Reply entirely in ${lang}.
Ground every legal argument, objection, and ruling in Jordanian law (Civil Code, Penal Code, Procedure codes, Labour Law, Cassation rulings, etc.). Cite specific article numbers or case numbers when possible, drawing on the RAG CONTEXT below.

Roles:
- "judge": fair, formal presiding judge; manages procedure, asks questions, rules on objections, eventually issues a verdict grounded in Jordanian law.
- "opposing": ${opposingRole}'s counsel — argumentative but professional, citing Jordanian authorities.
- The user is the ${data.userRole}'s counsel. NEVER speak as the user.
Keep each message concise (1-4 sentences). Stay in character.
When the hearing reaches a natural verdict, the judge issues a final ruling and you set verdictReached=true.

Reply with a single JSON object only — no markdown, no commentary — with this shape:
{
  "turns": [ { "speaker": "judge" | "opposing" | "narrator", "text": string } ],   // 1-3 items
  "verdictReached": boolean
}

RAG CONTEXT (Jordanian legal corpus, may be empty):
${grounding || "(no retrieved context)"}

CASE BRIEF:
${data.caseBrief}

HISTORY SO FAR (chronological):
${data.history.map((m) => `[${m.speaker}] ${m.text}`).join("\n") || "(none yet)"}`;

    const userPrompt = data.start
      ? `Open the hearing. The judge enters, identifies the case, states the charges/claims under Jordanian law, and invites the ${data.userRole === "claimant" ? "claimant" : "prosecution/claimant"} to begin. Return 1-2 turns.`
      : `The user (${data.userRole}'s counsel) just said: "${data.userMessage ?? ""}"
Continue the hearing with 1-3 turns (judge and/or opposing counsel reacting), citing Jordanian law where relevant.`;

    const { text } = await generateText({
      model: gateway(MODEL),
      system,
      prompt: userPrompt,
    });
    const parsed = TurnOutput.parse(extractJson(text));
    return {
      ...parsed,
      turns: parsed.turns.map((turn) => ({
        ...turn,
        text: sanitizeLanguageText(turn.text, data.locale),
      })),
    };
  });

// ---------- Persistence ----------


const SaveSimInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().optional(),
  scenario: z.any(),
  transcript: z.any(),
  verdict: z.any().optional(),
  score: z.number().int().optional(),
  case_id: z.string().uuid().nullable().optional(),
});

export const saveSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSimInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      title: data.title ?? null,
      scenario: data.scenario,
      transcript: data.transcript,
      verdict: data.verdict ?? null,
      score: data.score ?? null,
      case_id: data.case_id || null,
      owner_id: context.userId,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase.from("courtroom_simulations").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("courtroom_simulations").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSimulations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("courtroom_simulations")
      .select("id, title, created_at, score, scenario")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("courtroom_simulations")
      .select("id, title, scenario, transcript, verdict, score, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("courtroom_simulations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
