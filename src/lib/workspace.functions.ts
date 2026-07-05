import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCallerOrgId(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.org_id as string | undefined) ?? null;
}

/**
 * Returns the org directory (teammates) plus every case in the org,
 * annotated with its members (owner + case_members). One round-trip
 * for the workspace hub page.
 */
export const getWorkspaceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await getCallerOrgId(context);
    if (!orgId) return { teammates: [], cases: [] };

    const [membersRes, casesRes] = await Promise.all([
      context.supabase
        .from("organization_members")
        .select("user_id, role, status, invited_email, created_at")
        .eq("org_id", orgId)
        .eq("status", "active"),
      // cases don't have org_id — scope through owner_id ∈ org members
      (async () => {
        const { data: orgMems } = await context.supabase
          .from("organization_members").select("user_id").eq("org_id", orgId).eq("status", "active");
        const ownerIds = (orgMems ?? []).map((m: any) => m.user_id).filter(Boolean);
        if (ownerIds.length === 0) return { data: [] as any[], error: null };
        return await context.supabase
          .from("cases")
          .select("id, title, case_number, status, priority, opened_at, owner_id, client_id, clients(id, name)")
          .in("owner_id", ownerIds)
          .order("opened_at", { ascending: false });
      })(),
    ]);
    if (membersRes.error) throw new Error(membersRes.error.message);
    if (casesRes.error) throw new Error(casesRes.error.message);

    const orgUserIds = (membersRes.data ?? []).map((m: any) => m.user_id).filter(Boolean);
    const caseIds = (casesRes.data ?? []).map((c: any) => c.id);

    const [profilesRes, cmRes] = await Promise.all([
      orgUserIds.length
        ? context.supabase.from("profiles").select("id, full_name").in("id", orgUserIds)
        : Promise.resolve({ data: [] as any[] }),
      caseIds.length
        ? context.supabase.from("case_members").select("case_id, user_id, role").in("case_id", caseIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const nameById: Record<string, string | null> = {};
    for (const p of (profilesRes.data ?? [])) nameById[p.id] = p.full_name;

    const teammates = (membersRes.data ?? []).map((m: any) => ({
      user_id: m.user_id,
      role: m.role,
      email: m.invited_email,
      full_name: m.user_id ? nameById[m.user_id] ?? null : null,
    }));

    const membersByCase: Record<string, Array<{ user_id: string; role: string; full_name: string | null }>> = {};
    for (const cm of (cmRes.data ?? [])) {
      (membersByCase[cm.case_id] ??= []).push({
        user_id: cm.user_id,
        role: cm.role,
        full_name: nameById[cm.user_id] ?? null,
      });
    }

    const cases = (casesRes.data ?? []).map((c: any) => {
      const members = membersByCase[c.id] ?? [];
      // Include owner as an implicit "owner" member if not already listed
      const ownerListed = members.some((m) => m.user_id === c.owner_id);
      const allMembers = ownerListed
        ? members
        : [{ user_id: c.owner_id, role: "owner", full_name: nameById[c.owner_id] ?? null }, ...members];
      return { ...c, members: allMembers, member_count: allMembers.length };
    });

    return { teammates, cases };
  });

/**
 * Rich case bundle for the workspace-scoped case page: core case data,
 * team members (with profile names), documents, appointments, deadlines,
 * time entries, and invoices — one round trip.
 */
export const getWorkspaceCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    if (!d || typeof d !== "object" || !("id" in d)) throw new Error("id required");
    const id = (d as any).id;
    if (typeof id !== "string") throw new Error("id must be string");
    return { id };
  })
  .handler(async ({ data, context }) => {
    const [caseRes, membersRes, docs, appts, timeEntries, invoices, drafts, deadlines] = await Promise.all([
      context.supabase.from("cases")
        .select("*, clients(id, name, email, phone)")
        .eq("id", data.id).maybeSingle(),
      context.supabase.from("case_members")
        .select("id, user_id, role, created_at")
        .eq("case_id", data.id).order("created_at", { ascending: true }),
      context.supabase.from("documents").select("id, name, file_path, file_type, file_size, created_at, uploaded_by").eq("case_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("appointments").select("id, title, starts_at, ends_at, location, status").eq("case_id", data.id).order("starts_at", { ascending: true }),
      context.supabase.from("time_entries").select("id, description, duration_seconds, hourly_rate, billable, status, started_at, user_id").eq("case_id", data.id).order("started_at", { ascending: false }),
      context.supabase.from("tax_invoices").select("id, number, issue_date, due_date, status, total, amount_paid, currency, client_name, notes, items, tax_rate").eq("case_id", data.id).order("issue_date", { ascending: false }),
      context.supabase.from("draft_invoices").select("*").eq("case_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("deadlines").select("id, title, due_date, status, priority").eq("case_id", data.id).order("due_date", { ascending: true }),
    ]);
    if (caseRes.error) throw new Error(caseRes.error.message);
    if (!caseRes.data) throw new Error("Case not found");

    const memberUserIds = Array.from(new Set([
      caseRes.data.owner_id,
      ...(membersRes.data ?? []).map((m: any) => m.user_id),
      ...(timeEntries.data ?? []).map((t: any) => t.user_id).filter(Boolean),
      ...(docs.data ?? []).map((d: any) => d.uploaded_by).filter(Boolean),
    ].filter(Boolean)));

    const { data: profs } = memberUserIds.length
      ? await context.supabase.from("profiles").select("id, full_name").in("id", memberUserIds)
      : { data: [] as any[] };
    const nameById: Record<string, string | null> = {};
    for (const p of (profs ?? [])) nameById[p.id] = p.full_name;

    const members = (membersRes.data ?? []).map((m: any) => ({
      ...m, full_name: nameById[m.user_id] ?? null,
    }));

    return {
      case: {
        ...caseRes.data,
        owner_name: nameById[caseRes.data.owner_id] ?? null,
      },
      members,
      documents: (docs.data ?? []).map((d: any) => ({ ...d, uploader_name: nameById[d.uploaded_by] ?? null })),
      appointments: appts.data ?? [],
      timeEntries: (timeEntries.data ?? []).map((t: any) => ({ ...t, user_name: nameById[t.user_id] ?? null })),
      invoices: invoices.data ?? [],
      deadlines: deadlines.data ?? [],
    };
  });
