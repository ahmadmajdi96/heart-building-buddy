// Server-side helper: resolve the active workspace (org) for the caller.
// Reads the `x-active-org` header sent by the client-side middleware and
// falls back to the caller's first org membership.
import { getRequestHeader } from "@tanstack/react-start/server";

export async function getActiveOrgId(ctx: { supabase: any; userId: string }): Promise<string | null> {
  let header: string | null = null;
  try {
    header = getRequestHeader("x-active-org") ?? null;
  } catch {
    header = null;
  }

  if (header) {
    // Verify the caller is an active member of that org before trusting it.
    const { data: mem } = await ctx.supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", ctx.userId)
      .eq("org_id", header)
      .eq("status", "active")
      .maybeSingle();
    if (mem?.org_id) return mem.org_id as string;
  }

  // Fallback: first membership.
  const { data: first } = await ctx.supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (first?.org_id as string | undefined) ?? null;
}
