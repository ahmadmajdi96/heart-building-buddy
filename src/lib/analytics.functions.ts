import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createAiGatewayProvider, getAiGatewayApiKey, sanitizeLanguageText, strictLanguageDirective } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct";
function gateway() {
  return createAiGatewayProvider(getAiGatewayApiKey());
}

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [cases, clients, appts, docs, drafts, sims, events, paymentsMonth, meetingsRecent, timeMonth] = await Promise.all([
      s.from("cases").select("id, status, priority, opened_at, created_at"),
      s.from("clients").select("id, created_at"),
      s.from("appointments").select("id, kind, starts_at"),
      s.from("documents").select("id, created_at"),
      s.from("drafts").select("id, created_at"),
      s.from("courtroom_simulations").select("id, score, created_at"),
      s.from("case_events").select("id, kind, created_at"),
      s.from("payments").select("amount, paid_at").gte("paid_at", startMonth),
      s.from("meetings").select("id, started_at, ended_at").order("created_at", { ascending: false }).limit(100),
      s.from("time_entries").select("duration_seconds, billable, started_at").gte("started_at", startMonth),
    ]);
    const sevenDays = new Date(now.getTime() + 7 * 86400_000);
    const apptsUpcoming = (appts.data ?? []).filter(
      (a) => new Date(a.starts_at) >= now && new Date(a.starts_at) <= sevenDays,
    );
    const statusCounts: Record<string, number> = {};
    for (const c of cases.data ?? []) statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
    const won = statusCounts["won"] ?? 0;
    const lost = statusCounts["lost"] ?? 0;
    const settled = statusCounts["closed"] ?? 0;
    // Honest win rate: settled cases count against the denominator so the KPI cannot inflate to 100%.
    const denom = won + lost + settled;
    const winRate = denom > 0 ? Math.round((won / denom) * 100) : null;

    // Monthly buckets for last 6 months
    const months: { m: string; cases: number; clients: number; docs: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short" });
      const inMonth = (iso: string) => iso.startsWith(key);
      months.push({
        m: label,
        cases: (cases.data ?? []).filter((c) => inMonth(c.opened_at ?? c.created_at)).length,
        clients: (clients.data ?? []).filter((c) => inMonth(c.created_at)).length,
        docs: (docs.data ?? []).filter((c) => inMonth(c.created_at)).length,
      });
    }

    const monthRevenue = (paymentsMonth.data ?? []).reduce((sum, p: any) => sum + Number(p.amount || 0), 0);
    const liveMeetings = (meetingsRecent.data ?? []).filter((m: any) => m.started_at && !m.ended_at).length;
    const paidHoursMonth = Math.round(
      ((timeMonth.data ?? []) as any[])
        .filter((e) => e.billable)
        .reduce((sum, e) => sum + Number(e.duration_seconds || 0), 0) / 3600 * 10,
    ) / 10;

    return {
      totals: {
        cases: cases.data?.length ?? 0,
        clients: clients.data?.length ?? 0,
        appointments: appts.data?.length ?? 0,
        documents: docs.data?.length ?? 0,
        drafts: drafts.data?.length ?? 0,
        simulations: sims.data?.length ?? 0,
        events: events.data?.length ?? 0,
        upcoming: apptsUpcoming.length,
        monthRevenue,
        liveMeetings,
        paidHoursMonth,
      },
      winRate,
      statusCounts,
      months,
      avgSimScore: sims.data?.length
        ? Math.round((sims.data.reduce((a, b) => a + (b.score ?? 0), 0) / sims.data.length) * 10) / 10
        : null,
    };
  });

export const generateAnalyticsInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ locale: z.enum(["ar", "en"]).default("en"), summary: z.record(z.string(), z.any()) }).parse(d),
  )
  .handler(async ({ data }) => {
    const lang = data.locale === "ar" ? "Arabic" : "English";
    const { text } = await generateText({
      model: gateway()(MODEL),
      system: `${strictLanguageDirective(data.locale)}

You are a senior legal-practice analyst. Given a JSON snapshot of a law firm's data, produce concise, actionable insights in ${lang}. Use Markdown with short headings and bullet lists. Cover: practice performance, risk areas, productivity, client pipeline, recommended next actions. Be specific to the numbers given. No fluff.`,
      prompt: `DATA SNAPSHOT:\n${JSON.stringify(data.summary, null, 2)}`,
    });
    return { insights: sanitizeLanguageText(text, data.locale) };
  });
