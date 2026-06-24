import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCallerOrg(ctx: { supabase: any; userId: string }) {
  const { data: mem, error } = await ctx.supabase
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!mem) throw new Error("No active organization");
  return mem as { org_id: string; role: string };
}

export const getTeamOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await getCallerOrg(context);

    // Member-scoped queries rely on the user's RLS access; only return what the caller can see.
    const [casesRes, clientsRes, apptsRes, docsRes, membersRes] = await Promise.all([
      context.supabase.from("cases").select("id, title, status, owner_id, responsible_lawyer, clients(id, name)").order("opened_at", { ascending: false }),
      context.supabase.from("clients").select("id, name, owner_id, created_at").order("created_at", { ascending: false }),
      context.supabase.from("appointments").select("id, title, starts_at, ends_at, kind, owner_id, case_id").order("starts_at", { ascending: true }),
      context.supabase.from("documents").select("id, name, owner_id, case_id, created_at").order("created_at", { ascending: false }).limit(50),
      context.supabase.from("case_members").select("id, case_id, user_id, role"),
    ]);

    return {
      cases: casesRes.data ?? [],
      clients: clientsRes.data ?? [],
      appointments: apptsRes.data ?? [],
      documents: docsRes.data ?? [],
      caseMembers: membersRes.data ?? [],
    };
  });
