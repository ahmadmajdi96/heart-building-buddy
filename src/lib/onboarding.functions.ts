import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side log sink for onboarding RLS / permission failures.
 * Writes structured entries to server logs so future permission issues
 * can be diagnosed from `stack_modern--server-function-logs`.
 */
export const logOnboardingFailure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    stage: "org_insert" | "member_insert" | "verify_org" | "verify_member" | "logo_move" | "unknown";
    code?: string | null;
    message: string;
    details?: string | null;
    hint?: string | null;
    payload?: Record<string, unknown>;
  }) => d)
  .handler(async ({ data, context }) => {
    const entry = {
      kind: "onboarding_failure",
      at: new Date().toISOString(),
      userId: context.userId,
      stage: data.stage,
      code: data.code ?? null,
      message: data.message,
      details: data.details ?? null,
      hint: data.hint ?? null,
      payload: data.payload ?? {},
    };
    // eslint-disable-next-line no-console
    console.error("[ONBOARDING_FAILURE]", JSON.stringify(entry));
    return { logged: true };
  });

/**
 * Verifies the org row + owner membership row exist for the current user.
 * Uses the user's own RLS context — if these reads return empty, the
 * onboarding writes did not persist visibly to the user (the real bug).
 */
export const verifyOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orgId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [orgRes, memRes] = await Promise.all([
      supabase.from("organizations").select("id, legal_name, type").eq("id", data.orgId).maybeSingle(),
      supabase.from("organization_members").select("org_id, user_id, role, status")
        .eq("org_id", data.orgId).eq("user_id", userId).maybeSingle(),
    ]);
    const result = {
      orgExists: !!orgRes.data,
      memberExists: !!memRes.data,
      role: memRes.data?.role ?? null,
      status: memRes.data?.status ?? null,
      orgError: orgRes.error?.message ?? null,
      memberError: memRes.error?.message ?? null,
    };
    if (!result.orgExists || !result.memberExists) {
      // eslint-disable-next-line no-console
      console.error("[ONBOARDING_VERIFY_FAILED]", JSON.stringify({ userId, orgId: data.orgId, ...result }));
    }
    return result;
  });
