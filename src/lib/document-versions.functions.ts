import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("document_versions")
      .select("*")
      .eq("document_id", data.document_id)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      document_id: z.string().uuid(),
      storage_path: z.string().min(1),
      size: z.number().optional(),
      mime_type: z.string().optional(),
      note: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: doc } = await sb.from("documents").select("current_version").eq("id", data.document_id).maybeSingle();
    const next = (doc?.current_version ?? 1) + 1;
    const { data: ver, error } = await sb
      .from("document_versions")
      .insert({
        document_id: data.document_id,
        version: next,
        storage_path: data.storage_path,
        size: data.size ?? null,
        mime_type: data.mime_type ?? null,
        note: data.note ?? null,
        uploaded_by: context.userId,
      }).select().maybeSingle();
    if (error) throw new Error(error.message);
    await sb.from("documents").update({
      current_version: next,
      storage_path: data.storage_path,
      size: data.size ?? null,
      mime_type: data.mime_type ?? null,
    }).eq("id", data.document_id);
    return ver;
  });

export const restoreVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string().uuid(), version_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: v } = await sb.from("document_versions").select("*").eq("id", data.version_id).maybeSingle();
    if (!v) throw new Error("Version not found");
    const { data: doc } = await sb.from("documents").select("current_version").eq("id", data.document_id).maybeSingle();
    const next = (doc?.current_version ?? v.version) + 1;
    await sb.from("document_versions").insert({
      document_id: data.document_id, version: next,
      storage_path: v.storage_path, size: v.size, mime_type: v.mime_type,
      note: `Restored from v${v.version}`, uploaded_by: context.userId,
    });
    await sb.from("documents").update({
      current_version: next, storage_path: v.storage_path, size: v.size, mime_type: v.mime_type,
    }).eq("id", data.document_id);
    return { ok: true };
  });

function randomToken() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ document_id: z.string().uuid(), expires_in_days: z.number().int().min(1).max(365).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const token = randomToken();
    const expires_at = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 86_400_000).toISOString()
      : null;
    const { data: row, error } = await (context.supabase as any)
      .from("document_shares")
      .insert({ document_id: data.document_id, token, expires_at, created_by: context.userId })
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listShares = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("document_shares").select("*").eq("document_id", data.document_id).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const revokeShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("document_shares").update({ revoked_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
