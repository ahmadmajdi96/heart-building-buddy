import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createAiGatewayProvider, getAiGatewayApiKey, sanitizeLanguageText, strictLanguageDirective } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct";

function getGateway() {
  return createAiGatewayProvider(getAiGatewayApiKey());
}

async function ragJordanianContext(
  userId: string,
  question: string,
): Promise<{ grounding: string; hitCount: number }> {
  try {
    const { ragFetch } = await import("./rag.server");
    const res = await ragFetch(`/v1/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: `user:${userId}`,
        question,
        top_k: 18,
        rerank_top_n: 6,
        temperature: 0.1,
        max_tokens: 800,
      }),
    });
    if (!res.ok) return { grounding: "", hitCount: 0 };
    const json = (await res.json()) as {
      answer?: string;
      sources?: Array<{ filename?: string; page?: number; excerpt?: string }>;
    };
    const parts: string[] = [];
    if (json.answer) parts.push(json.answer.trim());
    const sources = json.sources ?? [];
    if (sources.length) {
      const src = sources
        .slice(0, 6)
        .map((s, i) => `[${i + 1}] ${s.filename ?? "source"}${s.page ? ` p.${s.page}` : ""}: ${(s.excerpt ?? "").slice(0, 500)}`)
        .join("\n");
      parts.push(`SOURCES:\n${src}`);
    }
    return { grounding: parts.join("\n\n").slice(0, 5000), hitCount: sources.length };
  } catch {
    return { grounding: "", hitCount: 0 };
  }
}

// ---------- Legal research (Jordanian law only) ----------
const ResearchInput = z.object({
  query: z.string().min(2),
  locale: z.enum(["ar", "en"]).default("en"),
});

/**
 * Public corpus scope disclosure — shown in the UI banner AND enforced server-side.
 * When the RAG index returns zero hits for a question, we refuse to guess and return
 * this notice instead of a hallucinated answer. Per the pilot readiness spec (§3):
 * "block answers outside corpus instead of guessing".
 */
export const CORPUS_SCOPE = {
  jurisdiction: "Jordan",
  updatedThrough: "2026",
  covers: [
    "Constitution 1952 + amendments",
    "Civil Code 43/1976",
    "Penal Code 16/1960",
    "Codes of Civil & Criminal Procedure",
    "Commercial Code 12/1966, Companies Law 22/1997, Insolvency Law 21/2018",
    "Labour Law 8/1996, Social Security 1/2014",
    "Personal Status Law 15/2019",
    "Landlords & Tenants Law",
    "Income Tax 34/2014, General Sales Tax",
    "Cybercrime 17/2023, PDPL 24/2023, Electronic Transactions",
    "Arbitration 31/2001, Execution Law, Evidence Law",
    "Cassation Court rulings",
  ],
} as const;

export const legalResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResearchInput.parse(d))
  .handler(async ({ data, context }) => {
    const gateway = getGateway();
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const sourcesLabel = data.locale === "ar" ? "المصادر" : "Sources";
    const { grounding, hitCount } = await ragJordanianContext(context.userId, data.query);

    // Guardrail: refuse-to-guess when the Jordanian corpus returns no matches.
    if (hitCount === 0) {
      const answer = data.locale === "ar"
        ? `**خارج نطاق المصادر المتاحة.**\n\nلم يعثر المحرك على مقاطع في مصادر القانون الأردني المفهرسة تُطابق سؤالك. لن نُقدّم إجابة مبنية على التخمين.\n\nاقتراحات:\n- أعد صياغة السؤال بذكر القانون أو المادة أو رقم القضية.\n- إن كانت لديك وثيقة ذات صلة، ارفعها إلى فهرس مكتبك من خلال المستندات ثم أعد السؤال.\n- إن كان السؤال خارج القانون الأردني، فهو خارج نطاق هذه الأداة.`
        : `**Outside the available corpus.**\n\nThe retrieval engine found no passages in the indexed Jordanian legal corpus that match your question. We will not answer by guessing.\n\nSuggestions:\n- Rephrase the question with a specific statute, article, or case number.\n- If you have a relevant document, upload it to your firm's index in Documents and re-ask.\n- If the question is not about Jordanian law, it is outside this tool's scope.`;
      return { answer, outsideCorpus: true };
    }

    const { text } = await generateText({
      model: gateway(MODEL),
      system: `${strictLanguageDirective(data.locale)}

You are an expert legal research assistant specialized EXCLUSIVELY in the Hashemite Kingdom of Jordan's laws, regulations and jurisprudence. Do NOT answer about any other jurisdiction — if asked, politely note you only cover Jordanian law.

STRICT GROUNDING RULE: You MUST base your answer on the RAG CONTEXT below. Do not invent article numbers, case numbers, dates, or statute titles. If the RAG CONTEXT does not contain enough information to answer, say so explicitly rather than guessing.

Cover the Jordanian legal corpus — Constitution, Civil Code, Penal Code, procedural codes, Commercial Code, Companies Law, Labour Law, Personal Status Law, tax and IP statutes, Cassation rulings, Official Gazette. Cite the specific article and case number in ${lang}. End with a "${sourcesLabel}" list of every law/ruling referenced from the RAG CONTEXT.

RAG CONTEXT (Jordanian corpus):
${grounding}`,
      prompt: data.query,
    });
    return { answer: sanitizeLanguageText(text, data.locale), outsideCorpus: false };
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
    const placeholderExample = data.locale === "ar" ? "[الاسم]" : "[Name]";
    const { text } = await generateText({
      model: gateway(MODEL),
      system: `${strictLanguageDirective(data.locale)}

You are an expert Arab legal drafter. Produce a polished, ready-to-use legal document in ${lang} suitable for use in Arab jurisdictions. Use proper legal structure: title, parties, preamble, numbered clauses, governing law, signatures. Use bracket placeholders like ${placeholderExample} for variables. Output the document text only — no commentary.`,
      prompt: `${data.template ? `Template: ${data.template}\n\n` : ""}User request: ${data.prompt}`,
    });
    return { draft: sanitizeLanguageText(text, data.locale) };
  });
