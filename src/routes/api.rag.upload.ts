import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/rag/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") || "";
          if (!auth.startsWith("Bearer ")) {
            return json({ error: "Unauthorized" }, 401);
          }
          const token = auth.slice("Bearer ".length);

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return json({ error: "Supabase not configured" }, 500);
          }
          const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
          if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
          const userId = claimsData.claims.sub as string;
          const tenantId = `user:${userId}`;

          const apiKey = process.env.RAG_API_KEY;
          if (!apiKey) return json({ error: "RAG service not configured (missing RAG_API_KEY)" }, 500);

          const RAG_BASE = (process.env.RAG_BASE_URL?.trim() || "http://70.30.221.109:50752").replace(/\/+$/, "");

          const inbound = await request.formData();
          const files = inbound.getAll("files").filter((v): v is File => v instanceof File);
          if (files.length === 0) return json({ error: "No files provided" }, 400);

          const meta = inbound.get("metadata");
          const metadataObj = typeof meta === "string" && meta.trim() ? safeJson(meta) : {};

          const out = new FormData();
          for (const f of files) out.append("files", f, f.name);
          out.append("tenant_id", tenantId);
          out.append(
            "metadata",
            JSON.stringify({ ...metadataObj, user_id: userId }),
          );

          const res = await fetch(`${RAG_BASE}/v1/documents`, {
            method: "POST",
            headers: { "X-API-Key": apiKey },
            body: out,
          });
          const text = await res.text();
          if (!res.ok) {
            return new Response(text || JSON.stringify({ error: `RAG upload ${res.status}` }), {
              status: res.status,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(text, { headers: { "Content-Type": "application/json" } });
        } catch (e) {
          return json({ error: (e as Error).message }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}
