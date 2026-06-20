import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

// ---------- Generate a fictional case ----------
const GenerateCaseInput = z.object({
  locale: z.enum(["ar", "en"]).default("en"),
  hint: z.string().optional(),
  practiceArea: z.string().optional(),
});

export const generateCase = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GenerateCaseInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({
        schema: z.object({
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
        }),
      }),
      prompt: `Generate a realistic but fictional legal case scenario suitable for a courtroom simulation in an Arab jurisdiction.
Language: write all string fields in ${lang}.
Practice area hint: ${data.practiceArea ?? "any"}.
Extra hint from user: ${data.hint ?? "none"}.
Make the facts detailed (3-5 sentences). Include 2-4 charges/claims and 3-5 pieces of evidence.`,
    });
    return output;
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

export const courtroomTurn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TurnInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const opposingRole = data.userRole === "claimant" ? "defendant" : "claimant";

    const system = `You are simulating a realistic court hearing in an Arab jurisdiction. Respond entirely in ${lang}.
Roles:
- "judge": a fair, formal presiding judge who manages procedure, asks questions, makes rulings on objections, and eventually issues a verdict.
- "opposing": the ${opposingRole}'s counsel — argumentative but professional.
- The user is the ${data.userRole}'s counsel and speaks for themselves.
You will return ONE OR MORE turns advancing the hearing. Typical flow: judge opens, calls each side; sides present arguments/respond; judge may interject. Keep each message concise (1-4 sentences). Stay in character. Do NOT speak as the user. When the hearing reaches a natural verdict, the judge issues a final ruling and set verdictReached=true.

CASE BRIEF:
${data.caseBrief}

HISTORY SO FAR (chronological):
${data.history.map((m) => `[${m.speaker}] ${m.text}`).join("\n") || "(none yet)"}
`;

    const userPrompt = data.start
      ? `Open the hearing. The judge enters, identifies the case, states the charges/claims, and invites the ${data.userRole === "claimant" ? "claimant" : "prosecution/claimant"} to begin. Return 1-2 turns.`
      : `The user (${data.userRole}'s counsel) just said: "${data.userMessage ?? ""}"
Continue the hearing with 1-3 turns (judge and/or opposing counsel reacting). Do not put words in the user's mouth.`;

    const { output } = await generateText({
      model: gateway(MODEL),
      system,
      prompt: userPrompt,
      output: Output.object({
        schema: z.object({
          turns: z.array(z.object({
            speaker: z.enum(["judge", "opposing", "narrator"]),
            text: z.string(),
          })).min(1).max(4),
          verdictReached: z.boolean().default(false),
        }),
      }),
    });
    return output;
  });
