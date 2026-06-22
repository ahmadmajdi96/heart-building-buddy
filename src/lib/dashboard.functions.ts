import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400_000).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [casesRes, apptsAll, clientsRes, docsRes, recentCases, upcoming, invoices, payments] = await Promise.all([
      supabase.from("cases").select("id,status,opened_at"),
      supabase.from("appointments").select("id,starts_at,kind").gte("starts_at", now.toISOString()).lte("starts_at", in7),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }),
      supabase.from("cases").select("id,title,case_number,status,court,opened_at,clients(name)").order("opened_at", { ascending: false }).limit(5),
      supabase.from("appointments").select("id,title,starts_at,location,kind,cases(title,case_number)").gte("starts_at", now.toISOString()).order("starts_at", { ascending: true }).limit(5),
      supabase.from("tax_invoices").select("total,issue_date,status,amount_paid").gte("issue_date", startMonth),
      supabase.from("payments").select("amount,paid_at").gte("paid_at", startMonth),
    ]);

    const cases = casesRes.data ?? [];
    const activeCases = cases.filter((c) => c.status === "open" || c.status === "pending").length;
    const monthRevenue = (payments.data ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstanding = (invoices.data ?? []).reduce(
      (s, i) => s + Math.max(Number(i.total || 0) - Number(i.amount_paid || 0), 0),
      0,
    );

    return {
      counts: {
        totalCases: cases.length,
        activeCases,
        upcoming7d: (apptsAll.data ?? []).length,
        clients: clientsRes.count ?? 0,
        documents: docsRes.count ?? 0,
        monthRevenue,
        outstanding,
      },
      recentCases: recentCases.data ?? [],
      upcomingHearings: upcoming.data ?? [],
    };
  });
