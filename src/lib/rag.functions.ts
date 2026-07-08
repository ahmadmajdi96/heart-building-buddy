import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeLanguageText } from "./ai-gateway.server";

async function ragCall(path: string, init: RequestInit = {}) {
  const { ragFetch } = await import("./rag.server");
  return ragFetch(path, init);
}

function tenantFor(userId: string) {
  return `user:${userId}`;
}

export const getRagJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenant = tenantFor(context.userId);
    const res = await ragCall(`/v1/jobs/${encodeURIComponent(data.jobId)}?tenant_id=${encodeURIComponent(tenant)}`);
    if (!res.ok) throw new Error(`RAG job status ${res.status}: ${await res.text().catch(() => "")}`);
    return res.json();
  });

export const queryRag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      question: z.string().min(1),
      locale: z.enum(["ar", "en"]).default("en"),
      top_k: z.number().int().min(1).max(50).default(18),
      rerank_top_n: z.number().int().min(1).max(20).default(6),
      temperature: z.number().min(0).max(2).default(0.1),
      max_tokens: z.number().int().min(64).max(4096).default(1200),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenant = tenantFor(context.userId);
    const { locale, ...ragData } = data;
    const res = await ragCall(`/v1/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenant, ...ragData }),
    });
    if (!res.ok) throw new Error(`RAG query ${res.status}: ${await res.text().catch(() => "")}`);
    const json = (await res.json()) as {
      answer: string;
      sources?: Array<{
        source_id: string;
        document_id: string;
        filename: string;
        page?: number;
        chunk_index?: number;
        score?: number;
        rerank_score?: number;
        excerpt?: string;
      }>;
      latency_ms?: number;
    };
    return {
      ...json,
      answer: sanitizeLanguageText(json.answer ?? "", locale),
      sources: json.sources?.map((source) => ({
        ...source,
        excerpt: source.excerpt ? sanitizeLanguageText(source.excerpt, locale) : source.excerpt,
      })),
    };
  });

export const deleteRagDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ documentId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const tenant = tenantFor(context.userId);
    const res = await ragCall(
      `/v1/documents/${encodeURIComponent(data.documentId)}?tenant_id=${encodeURIComponent(tenant)}`,
      { method: "DELETE" },
    );
    if (!res.ok && res.status !== 404) {
      throw new Error(`RAG delete ${res.status}: ${await res.text().catch(() => "")}`);
    }
    return { ok: true };
  });
