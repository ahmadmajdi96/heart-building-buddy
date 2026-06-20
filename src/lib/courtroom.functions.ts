import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function getGateway() {
  const key = process.env.AI_GATEWAY_API_KEY || process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing AI gateway API key. Set AI_GATEWAY_API_KEY in your environment (.env or docker-compose).");
  return createAiGatewayProvider(key);
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
      system: `You are a legal case generator. Always reply with a single valid JSON object and no other text.`,
      prompt: `Generate a realistic but fictional legal case scenario for a courtroom simulation in an Arab jurisdiction (KSA, UAE, Egypt, Qatar, Jordan etc.).
Write all string values in ${lang}.
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
  "charges": string[] (2-4 items),
  "claimantName": string,
  "defendantName": string,
  "evidence": string[] (3-5 items)
}`,
    });
    const parsed = CaseSchema.parse(extractJson(text));
    return parsed;
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
  .inputValidator((d: unknown) => TurnInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const opposingRole = data.userRole === "claimant" ? "defendant" : "claimant";

    const system = `You simulate a realistic court hearing in an Arab jurisdiction. Reply entirely in ${lang}.
Roles:
- "judge": fair, formal presiding judge; manages procedure, asks questions, rules on objections, eventually issues a verdict.
- "opposing": ${opposingRole}'s counsel — argumentative but professional.
- The user is the ${data.userRole}'s counsel. NEVER speak as the user.
Keep each message concise (1-4 sentences). Stay in character.
When the hearing reaches a natural verdict, the judge issues a final ruling and you set verdictReached=true.

Reply with a single JSON object only — no markdown, no commentary — with this shape:
{
  "turns": [ { "speaker": "judge" | "opposing" | "narrator", "text": string } ],   // 1-3 items
  "verdictReached": boolean
}

CASE BRIEF:
${data.caseBrief}

HISTORY SO FAR (chronological):
${data.history.map((m) => `[${m.speaker}] ${m.text}`).join("\n") || "(none yet)"}`;

    const userPrompt = data.start
      ? `Open the hearing. The judge enters, identifies the case, states the charges/claims, and invites the ${data.userRole === "claimant" ? "claimant" : "prosecution/claimant"} to begin. Return 1-2 turns.`
      : `The user (${data.userRole}'s counsel) just said: "${data.userMessage ?? ""}"
Continue the hearing with 1-3 turns (judge and/or opposing counsel reacting).`;

    const { text } = await generateText({
      model: gateway(MODEL),
      system,
      prompt: userPrompt,
    });
    return TurnOutput.parse(extractJson(text));
  });

// ---------- Persistence ----------
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const deleteSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("courtroom_simulations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
