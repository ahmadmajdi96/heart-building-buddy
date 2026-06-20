import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function getGateway() {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) throw new Error("Missing AI gateway API key. Set AI_GATEWAY_API_KEY in your environment (.env or docker-compose).");
  return createAiGatewayProvider(key);
}

// ---------- Legal research ----------
const ResearchInput = z.object({
  query: z.string().min(2),
  locale: z.enum(["ar", "en"]).default("en"),
});

export const legalResearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ResearchInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const { text } = await generateText({
      model: gateway(MODEL),
      system: `You are an expert legal research assistant specialized in Arab jurisdictions (KSA, UAE, Egypt, Qatar, Kuwait, Bahrain, Oman, Jordan) and comparative/international law. Provide concise, professional answers grounded in statutes and case law. Cite specific articles, laws, and rulings when relevant (e.g. "Saudi Labor Law Art. 77", "UAE Cass. 2023/118"). End with a short "Sources" list. Reply entirely in ${lang}.`,
      prompt: data.query,
    });
    return { answer: text };
  });

// ---------- AI drafting ----------
const DraftInput = z.object({
  prompt: z.string().min(2),
  locale: z.enum(["ar", "en"]).default("ar"),
  template: z.string().optional(),
});

export const draftDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DraftInput.parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const { text } = await generateText({
      model: gateway(MODEL),
      system: `You are an expert Arab legal drafter. Produce a polished, ready-to-use legal document in ${lang} suitable for use in Arab jurisdictions. Use proper legal structure: title, parties, preamble, numbered clauses, governing law, signatures. Use bracket placeholders like [الاسم] / [Name] for variables. Output the document text only — no commentary.`,
      prompt: `${data.template ? `Template: ${data.template}\n\n` : ""}User request: ${data.prompt}`,
    });
    return { draft: text };
  });
