import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DocInput = z.object({
  name: z.string().min(1),
  mime_type: z.string().optional(),
  size: z.number().optional(),
  storage_path: z.string().min(1),
  extracted_text: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  case_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  is_template: z.boolean().optional(),
});

async function logDocActivity(ctx: any, action: string, doc: any, summary: string) {
  try {
    const { data: mem } = await ctx.supabase
      .from("organization_members").select("org_id")
      .eq("user_id", ctx.userId).eq("status", "active").limit(1).maybeSingle();
    await ctx.supabase.from("activity_log").insert({
      org_id: mem?.org_id ?? null,
      actor_id: ctx.userId,
      entity_type: "document",
      entity_id: doc.id,
      case_id: doc.case_id ?? null,
      action, summary,
    });
  } catch { /* non-fatal */ }
}

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("*, cases(id, title), clients(id, name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listTemplateDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id, name, mime_type, size, extracted_text, created_at")
      .eq("is_template", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DocInput.parse(d))
  .handler(async ({ data, context }) => {
    const caseId = data.case_id || null;
    const clientId = data.client_id || null;
    const isTemplate = data.is_template ?? (!caseId && !clientId);
    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({
        ...data,
        case_id: caseId,
        client_id: clientId,
        is_template: isTemplate,
        owner_id: context.userId,
      })
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    if (row) await logDocActivity(context, "uploaded", row, `Uploaded ${(row as any).name}`);
    return row;
  });

export const renameDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), name: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("documents").update({ name: data.name }).eq("id", data.id).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (row) await logDocActivity(context, "renamed", row, `Renamed to ${(row as any).name}`);
    return row;
  });

export const getSignedDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error: dErr } = await context.supabase.from("documents").select("storage_path,name,mime_type").eq("id", data.id).maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!doc) throw new Error("Document not found");
    const { data: signed, error } = await context.supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl, name: doc.name, mime_type: (doc as any).mime_type };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase.from("documents").select("storage_path, name, case_id, id").eq("id", data.id).maybeSingle();
    if (doc?.storage_path) {
      await context.supabase.storage.from("documents").remove([doc.storage_path]);
    }
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (doc) await logDocActivity(context, "deleted", doc, `Deleted ${(doc as any).name}`);
    return { ok: true };
  });
