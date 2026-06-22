import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function isHttpUrl(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^https?:\/\//i.test(s);
}

/** Resolve a logo_path value (either a full http(s) URL or a storage key in `org-assets`) to a displayable URL. */
export function useLogoUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (isHttpUrl(path) ? (path as string) : null));

  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    if (isHttpUrl(path)) { setUrl(path); return; }
    supabase.storage.from("org-assets").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [path]);

  return url;
}

export async function resolveLogoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (isHttpUrl(path)) return path;
  const { data } = await supabase.storage.from("org-assets").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
