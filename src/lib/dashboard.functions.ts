import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400_000).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const [
      casesRes, apptsAll, clientsRes, docsRes, recentCases, upcoming,
      invoices, payments, ytdPayments, drafts, meetings, liveSessions,
      recentClients, recentDocs, recentInvoices, allInvoices,
    ] = await Promise.all([
      supabase.from("cases").select("id,status,opened_at,court"),
      supabase.from("appointments").select("id,starts_at,kind").gte("starts_at", now.toISOString()).lte("starts_at", in7),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }),
      supabase.from("cases").select("id,title,case_number,status,court,opened_at,clients(name)").order("opened_at", { ascending: false }).limit(6),
      supabase.from("appointments").select("id,title,starts_at,location,kind,cases(title,case_number)").gte("starts_at", now.toISOString()).order("starts_at", { ascending: true }).limit(6),
      supabase.from("tax_invoices").select("total,issue_date,status,amount_paid").gte("issue_date", startMonth),
      supabase.from("payments").select("amount,paid_at").gte("paid_at", startMonth),
      supabase.from("payments").select("amount,paid_at").gte("paid_at", startYear),
      supabase.from("drafts").select("id", { count: "exact", head: true }),
      supabase.from("meetings").select("id,started_at,ended_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("live_sessions").select("id", { count: "exact", head: true }),
      supabase.from("clients").select("id,name,email,created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("documents").select("id,name,created_at,case_id").order("created_at", { ascending: false }).limit(5),
      supabase.from("tax_invoices").select("id,number,total,amount_paid,status,issue_date,clients(name)").order("issue_date", { ascending: false }).limit(5),
      supabase.from("tax_invoices").select("total,amount_paid,status"),
    ]);

    const cases = casesRes.data ?? [];
    const byStatus: Record<string, number> = {};
    for (const c of cases) byStatus[c.status as string] = (byStatus[c.status as string] || 0) + 1;
    const activeCases = (byStatus["open"] || 0) + (byStatus["pending"] || 0);

    const monthRevenue = (payments.data ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const ytdRevenue = (ytdPayments.data ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstanding = (allInvoices.data ?? []).reduce(
      (s, i) => s + Math.max(Number(i.total || 0) - Number(i.amount_paid || 0), 0), 0);
    const invoicedTotal = (allInvoices.data ?? []).reduce((s, i) => s + Number(i.total || 0), 0);
    const invoicePaidCount = (allInvoices.data ?? []).filter((i) => i.status === "paid").length;

    const meetingsArr = meetings.data ?? [];
    const liveMeetings = meetingsArr.filter((m) => !m.ended_at).length;

    // Monthly revenue trend (last 6 months)
    const trend: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const amt = (ytdPayments.data ?? [])
        .filter((p) => { const t = new Date(p.paid_at as any); return t >= d && t < next; })
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      trend.push({ month: d.toLocaleString("en", { month: "short" }), amount: amt });
    }

    return {
      counts: {
        totalCases: cases.length, activeCases, casesByStatus: byStatus,
        upcoming7d: (apptsAll.data ?? []).length,
        clients: clientsRes.count ?? 0,
        documents: docsRes.count ?? 0,
        drafts: drafts.count ?? 0,
        meetings: meetingsArr.length,
        liveMeetings,
        liveSessions: liveSessions.count ?? 0,
        monthRevenue, ytdRevenue, outstanding, invoicedTotal, invoicePaidCount,
        invoiceTotalCount: (allInvoices.data ?? []).length,
      },
      revenueTrend: trend,
      recentCases: recentCases.data ?? [],
      upcomingHearings: upcoming.data ?? [],
      recentClients: recentClients.data ?? [],
      recentDocuments: recentDocs.data ?? [],
      recentInvoices: recentInvoices.data ?? [],
    };
  });

export const getTeamPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: caller } = await supabase
      .from("organization_members").select("org_id")
      .eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
    if (!caller) return { members: [] };

    const { data: members } = await supabase
      .from("organization_members")
      .select("id, user_id, invited_email, role, status, created_at")
      .eq("org_id", caller.org_id)
      .order("created_at", { ascending: true });

    const userIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const nameMap: Record<string, string | null> = {};
    const emailMap: Record<string, string | null> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds);
      for (const p of profs ?? []) nameMap[p.id] = p.full_name;
      for (const uid of userIds) {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (data?.user) emailMap[uid] = data.user.email ?? null;
        } catch { /* ignore */ }
      }
    }

    // Cases per owner
    const { data: casesAll } = await supabase.from("cases").select("id, owner_id, status");
    const stats: Record<string, { cases: number; active: number }> = {};
    for (const c of casesAll ?? []) {
      const u = (c as any).owner_id as string | null;
      if (!u) continue;
      stats[u] = stats[u] || { cases: 0, active: 0 };
      stats[u].cases += 1;
      const s = (c as any).status;
      if (s === "open" || s === "pending") stats[u].active += 1;
    }

    return {
      members: (members ?? []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        name: m.user_id ? nameMap[m.user_id] ?? null : null,
        email: m.user_id ? emailMap[m.user_id] ?? m.invited_email : m.invited_email,
        cases: m.user_id ? stats[m.user_id]?.cases ?? 0 : 0,
        activeCases: m.user_id ? stats[m.user_id]?.active ?? 0 : 0,
        joined_at: m.created_at,
      })),
    };
  });
