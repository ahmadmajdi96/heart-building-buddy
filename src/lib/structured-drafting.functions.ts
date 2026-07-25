import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import {
  createAiGatewayProvider, getAiGatewayApiKey, sanitizeLanguageText, strictLanguageDirective,
} from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getWorkflow, type WorkflowKind } from "./drafting-workflows";
import { bi } from "./jordan-legal";

const MODEL = process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct";

const Input = z.object({
  kind: z.enum(["opinion", "claim", "reply", "contract", "poa", "library"]),
  locale: z.enum(["ar", "en"]).default("ar"),
  values: z.record(z.string(), z.string()),
  /** Extra free-text instructions appended after the structured brief. */
  notes: z.string().max(4000).optional(),
  /** Ground the draft in the firm's private Jordanian corpus. */
  useCorpus: z.boolean().default(true),
});

/** Pull supporting Jordanian authority for the brief. Fails soft. */
async function corpusGrounding(userId: string, question: string) {
  try {
    const { ragFetch } = await import("./rag.server");
    const res = await ragFetch("/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: `user:${userId}`,
        question,
        top_k: 16,
        rerank_top_n: 6,
        temperature: 0.1,
        max_tokens: 700,
      }),
    });
    if (!res.ok) return "";
    const json = (await res.json()) as {
      answer?: string;
      sources?: Array<{ filename?: string; page?: number; excerpt?: string }>;
    };
    const parts: string[] = [];
    if (json.answer) parts.push(json.answer.trim());
    for (const [i, s] of (json.sources ?? []).slice(0, 6).entries()) {
      parts.push(`[${i + 1}] ${s.filename ?? "source"}${s.page ? ` p.${s.page}` : ""}: ${(s.excerpt ?? "").slice(0, 400)}`);
    }
    return parts.join("\n").slice(0, 4500);
  } catch {
    return "";
  }
}

/**
 * Structured drafting: the five guided workflows (opinion / statement of claim /
 * defence reply / contract / power of attorney). The model is bound to the
 * workflow's fixed outline so output is a real Jordanian legal instrument,
 * not free prose.
 */
export const generateStructuredDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const wf = getWorkflow(data.kind as WorkflowKind);
    const locale = data.locale;
    const lang = locale === "ar" ? "Arabic" : "English";

    // Structured brief from the wizard answers, labelled in the target language.
    const briefLines: string[] = [];
    for (const f of wf.fields) {
      const v = (data.values[f.name] ?? "").trim();
      if (!v) continue;
      const label = bi(f.label, locale);
      const pretty = f.options
        ? v.split(",").map((x) => bi(f.options!.find((o) => o.value === x.trim())?.label, locale) || x.trim()).join("، ")
        : v;
      briefLines.push(`- ${label}: ${pretty}`);
    }
    if (!briefLines.length) {
      throw new Error(locale === "ar" ? "أكمل حقول النموذج أولاً." : "Fill in the workflow fields first.");
    }

    const outline = wf.outline.map((o, i) => `${i + 1}. ${bi(o, locale)}`).join("\n");

    const grounding = data.useCorpus
      ? await corpusGrounding(
          context.userId,
          `${bi(wf.label, "en")} — Jordanian law authorities for: ${briefLines.slice(0, 6).join(" | ")}`,
        )
      : "";

    const system = `${strictLanguageDirective(locale)}

You are a senior Jordanian advocate drafting for a licensed law firm in the Hashemite Kingdom of Jordan. Produce a **${bi(wf.label, "en")}** in ${lang}, ready to file or sign.

MANDATORY STRUCTURE — follow this outline exactly, in this order, each as a Markdown heading:
${outline}

RULES:
- Jordanian law only. Cite statute name, number/year and article (e.g. القانون المدني رقم 43/1976، المادة 202). Never invent an article, case number or date.
- Use only the facts in the BRIEF. Where a fact is missing, insert a clear bracketed placeholder such as [تاريخ العقد] / [Contract date] — never fabricate.
- Formal court/instrument register. Numbered clauses or numbered pleading paragraphs, as the document type requires.
- Amounts in Jordanian Dinar (JOD / د.أ). Dates in Gregorian, with Hijri in brackets where the document is a Sharia-court instrument.
- Output the document only — clean Markdown, no commentary, no explanation of what you did.${
      grounding
        ? `

SUPPORTING AUTHORITY retrieved from the firm's Jordanian corpus. Rely on it for citations; ignore anything irrelevant:
${grounding}`
        : ""
    }`;

    const prompt = [
      `BRIEF (${bi(wf.label, locale)}):`,
      briefLines.join("\n"),
      data.notes?.trim() ? `\nADDITIONAL INSTRUCTIONS:\n${data.notes.trim()}` : "",
    ].filter(Boolean).join("\n");

    const { text } = await generateText({ model: createAiGatewayProvider(getAiGatewayApiKey())(MODEL), system, prompt });
    return { draft: sanitizeLanguageText(text, locale), grounded: !!grounding };
  });
