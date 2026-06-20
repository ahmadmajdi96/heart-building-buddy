import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3-flash-preview";
function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

const GenInput = z.object({
  prompt: z.string().min(2),
  template: z.string().optional(),
  locale: z.enum(["ar", "en"]).default("ar"),
  variables: z.record(z.string(), z.string()).optional(),
  documentIds: z.array(z.string().uuid()).optional(),
});

export const generateDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data, context }) => {
    const lang = data.locale === "ar" ? "Arabic" : "English";

    // Build variables block
    const vars = data.variables ?? {};
    const varBlock = Object.entries(vars).length
      ? `Variables to substitute (replace any matching {{key}} placeholders with these values):\n${Object.entries(vars).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
      : "";

    // Pull reference document text
    let refBlock = "";
    if (data.documentIds && data.documentIds.length) {
      const { data: docs } = await context.supabase
        .from("documents")
        .select("name, extracted_text")
        .in("id", data.documentIds);
      const lines = (docs ?? [])
        .filter((d) => d.extracted_text && d.extracted_text.trim().length > 0)
        .map((d) => `### ${d.name}\n${d.extracted_text!.slice(0, 8000)}`);
      if (lines.length) refBlock = `Reference documents to use as source material:\n${lines.join("\n\n")}`;
    }

    const { text } = await generateText({
      model: gateway()(MODEL),
      system: `You are an expert Arab legal drafter. Produce a polished, ready-to-use legal document in ${lang}. Use proper structure: title, parties, preamble, numbered clauses, governing law, signatures. Format the output with clean Markdown (use **bold** for headings/labels, numbered lists, bullet lists where appropriate). Substitute all known variables from the user's variable list inline. Output the document text only — no commentary.`,
      prompt: [
        data.template ? `Template: ${data.template}` : "",
        `User request: ${data.prompt}`,
        varBlock,
        refBlock,
      ].filter(Boolean).join("\n\n"),
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
