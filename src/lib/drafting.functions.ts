import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createAiGatewayProvider, getAiGatewayApiKey } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct";
function gateway() {
  return createAiGatewayProvider(getAiGatewayApiKey());
}

const GenInput = z.object({
  prompt: z.string().optional().default(""),
  locale: z.enum(["ar", "en"]).default("ar"),
  variables: z.record(z.string(), z.string()).optional(),
  templateIds: z.array(z.string().uuid()).max(3).optional(),
});

export const generateDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data, context }) => {
    const lang = data.locale === "ar" ? "Arabic" : "English";

    const vars = data.variables ?? {};
    const varBlock = Object.entries(vars).length
      ? `Variables to use throughout the document (replace any matching placeholders and weave the values into the prose naturally):\n${Object.entries(vars).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
      : "";

    // Templates: PDF/DOC → use text verbatim as the master template; others → reference only.
    let primaryTemplate = "";
    const referenceParts: string[] = [];
    if (data.templateIds?.length) {
      const { data: docs } = await context.supabase
        .from("documents")
        .select("name, mime_type, extracted_text")
        .in("id", data.templateIds);
      for (const d of docs ?? []) {
        const mime = (d.mime_type || "").toLowerCase();
        const name = d.name.toLowerCase();
        const isTextual =
          mime === "application/pdf" ||
          name.endsWith(".pdf") ||
          mime.includes("wordprocessingml") ||
          name.endsWith(".doc") ||
          name.endsWith(".docx");
        if (isTextual && d.extracted_text && d.extracted_text.trim()) {
          primaryTemplate += `\n\n--- TEMPLATE: ${d.name} ---\n${d.extracted_text.slice(0, 20_000)}`;
        } else {
          referenceParts.push(`- ${d.name} (${mime || "file"})${d.extracted_text ? `: ${d.extracted_text.slice(0, 2000)}` : ""}`);
        }
      }
    }

    const system = primaryTemplate
      ? `You are an expert Arab legal drafter. You will be given one or more legal TEMPLATE documents. Reproduce the template text VERBATIM in ${lang} — preserve its wording, structure, numbering, and clauses exactly. The ONLY changes you may make are: (1) substitute the provided variable values everywhere they contextually belong, and (2) if multiple templates are provided, merge them coherently. Do not invent new clauses, do not summarize, do not paraphrase. Output the final document only — clean Markdown, no commentary.`
      : `You are an expert Arab legal drafter. Produce a polished, ready-to-use legal document in ${lang}. Use proper structure: title, parties, preamble, numbered clauses, governing law, signatures. Format with clean Markdown. Substitute all known variables inline. Output the document text only — no commentary.`;

    const userParts = [
      data.prompt?.trim() ? `User instructions: ${data.prompt.trim()}` : "",
      varBlock,
      referenceParts.length ? `Supporting reference materials (use as context only, do NOT copy verbatim):\n${referenceParts.join("\n")}` : "",
      primaryTemplate ? `TEMPLATE TEXT (reproduce verbatim, only substituting variables):${primaryTemplate}` : "",
    ].filter(Boolean);

    if (!userParts.length) throw new Error("Provide a prompt or pick a template document.");

    const { text } = await generateText({
      model: gateway()(MODEL),
      system,
      prompt: userParts.join("\n\n"),
    });
    return { draft: text };
  });

const SaveInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  template: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  content: z.string(),
  case_id: z.string().uuid().nullable().optional(),
});

export const saveDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      title: data.title,
      template: data.template ?? null,
      variables: data.variables ?? {},
      content: data.content,
      case_id: data.case_id || null,
      owner_id: context.userId,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase.from("drafts").update(payload).eq("id", data.id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase.from("drafts").insert(payload).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("drafts")
      .select("id, title, template, updated_at, case_id")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("drafts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
