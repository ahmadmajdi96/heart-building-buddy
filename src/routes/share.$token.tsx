import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const resolveShare = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: share } = await admin.from("document_shares").select("*, documents(id, name, storage_path, mime_type, size)").eq("token", data.token).maybeSingle();
    if (!share || share.revoked_at) return { error: "Link revoked or invalid" };
    if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) return { error: "Link expired" };
    const doc: any = (share as any).documents;
    if (!doc) return { error: "Document missing" };
    const { data: signed } = await admin.storage.from("documents").createSignedUrl(doc.storage_path, 60 * 10);
    await admin.from("document_shares").update({ access_count: (share.access_count ?? 0) + 1 }).eq("id", share.id);
    return { name: doc.name, mime: doc.mime_type, size: doc.size, url: signed?.signedUrl ?? null };
  });

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
  errorComponent: ({ error }) => <div className="p-10 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">Not found</div>,
});

function SharePage() {
  const { token } = Route.useParams();
  return <SharedDoc token={token} />;
}

import { useEffect, useState } from "react";
import { Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

function SharedDoc({ token }: { token: string }) {
  const [state, setState] = useState<any>({ loading: true });
  useEffect(() => {
    (async () => {
      try {
        const r = await resolveShare({ data: { token } });
        setState({ loading: false, ...r });
      } catch (e: any) {
        setState({ loading: false, error: e.message });
      }
    })();
  }, [token]);
  if (state.loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  if (state.error) return <div className="min-h-screen grid place-items-center text-destructive">{state.error}</div>;
  return (
    <div className="min-h-screen grid place-items-center bg-secondary/40 p-6">
      <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center">
        <FileText className="size-12 mx-auto text-gold mb-3" />
        <h1 className="text-xl font-semibold mb-1">{state.name}</h1>
        <p className="text-sm text-muted-foreground mb-6">{state.mime} {state.size ? `· ${Math.round(state.size / 1024)} KB` : ""}</p>
        <Button asChild className="w-full"><a href={state.url} download={state.name}><Download className="size-4 mr-2" />Download</a></Button>
      </div>
    </div>
  );
}
