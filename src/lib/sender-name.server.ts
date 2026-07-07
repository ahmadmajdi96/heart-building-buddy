// Server-only: resolve the sender name (law firm or lawyer) that signs
// outgoing SMS/notifications on behalf of the account.
import type { SupabaseClient } from "@supabase/supabase-js";

const FALLBACK = { en: "Legal Team", ar: "الفريق القانوني" };

export async function resolveSenderName(
  supabase: SupabaseClient<any>,
  userId: string,
  locale: "ar" | "en" = "en",
): Promise<string> {
  try {
    // 1) Prefer the user's active organization (law firm) display/legal name.
    const { data: orgId } = await (supabase as any).rpc("current_user_org");
    if (orgId) {
      const { data: org } = await (supabase as any)
        .from("organizations")
        .select("display_name, legal_name")
        .eq("id", orgId)
        .maybeSingle();
      const name = (org?.display_name || org?.legal_name || "").trim();
      if (name) return name;
    }
    // 2) Fall back to the individual lawyer's profile name.
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const pname = (profile?.full_name || "").trim();
    if (pname) return pname;
  } catch {
    // ignore and use fallback
  }
  return FALLBACK[locale];
}
