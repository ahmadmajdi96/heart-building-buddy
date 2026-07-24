import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatTile, ManuscriptFrame } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { getAnalytics, generateAnalyticsInsights } from "@/lib/analytics.functions";
import { useOrg } from "@/lib/org-context";
import { MarkdownView } from "@/lib/markdown";
import { TrendingUp, Users, Briefcase, Award, Loader2, Sparkles, FileText, CalendarDays, Gavel } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell, Legend, Line, LineChart } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dashboard")({ component: AnalyticsPage });

type Stats = Awaited<ReturnType<typeof getAnalytics>>;

function AnalyticsPage() {
  const { locale } = useI18n();
  const { org } = useOrg();
  const load = useServerFn(getAnalytics);
  const insightsFn = useServerFn(generateAnalyticsInsights);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setStats(await load()); } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function runInsights() {
    if (!stats) return;
    setInsightsLoading(true);
    try { const res = await insightsFn({ data: { locale, summary: stats } }); setInsights(res.insights); }
    catch (e) { toast.error((e as Error).message); }
    finally { setInsightsLoading(false); }
  }

  if (loading || !stats) return <div className="grid place-items-center p-12"><Loader2 className="size-6 animate-spin text-gold" /></div>;

  const statusData = Object.entries(stats.statusCounts).map(([k, v]) => ({ name: k, value: v }));
  const COLORS = ["#fce343", "#0f3460", "#16a34a", "#dc2626", "#9333ea"];
  const orgName = org?.display_name || org?.legal_name || (locale === "ar" ? "مكتبك" : "your firm");

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? `مرحباً، ${orgName} 👋` : `Welcome back, ${orgName} 👋`}
        subtitle={locale === "ar" ? "نظرة شاملة على نشاط المكتب." : "A complete snapshot of your firm."}
        actions={<Button variant="gold" size="sm" className="gap-1.5" onClick={runInsights} disabled={insightsLoading}>
          {insightsLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {locale === "ar" ? "رؤى الذكاء الاصطناعي" : "AI insights"}
        </Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile to="/app/cases" label={locale === "ar" ? "القضايا" : "Cases"} value={String(stats.totals.cases)} icon={<Briefcase className="size-4" />} tone="gold" />
        <StatTile to="/app/clients" label={locale === "ar" ? "الموكلون" : "Clients"} value={String(stats.totals.clients)} icon={<Users className="size-4" />} />
        <StatTile to="/app/analytics" label={locale === "ar" ? "نسبة الفوز" : "Win rate"} value={stats.winRate != null ? `${stats.winRate}%` : "—"} icon={<TrendingUp className="size-4" />} tone="success" />
        <StatTile to="/app/calendar" label={locale === "ar" ? "مواعيد قادمة (٧ أيام)" : "Upcoming (7d)"} value={String(stats.totals.upcoming)} icon={<CalendarDays className="size-4" />} />
        <StatTile to="/app/documents" label={locale === "ar" ? "المستندات" : "Documents"} value={String(stats.totals.documents)} icon={<FileText className="size-4" />} />
        <StatTile to="/app/drafting" label={locale === "ar" ? "المسودات" : "Drafts"} value={String(stats.totals.drafts)} icon={<FileText className="size-4" />} />
        <StatTile to="/app/courtroom" label={locale === "ar" ? "محاكاة المحاكم" : "Courtroom sims"} value={String(stats.totals.simulations)} icon={<Gavel className="size-4" />} />
        <StatTile to="/app/courtroom" label={locale === "ar" ? "متوسط درجة المحاكاة" : "Avg sim score"} value={stats.avgSimScore != null ? String(stats.avgSimScore) : "—"} icon={<Award className="size-4" />} tone="success" />
      </div>


      <div className="grid gap-6 lg:grid-cols-2">
        <ManuscriptFrame>
          <div className="mb-4 text-sm font-semibold">{locale === "ar" ? "النشاط الشهري" : "Monthly activity"}</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 250)" />
                <XAxis dataKey="m" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cases" fill="#fce343" name={locale === "ar" ? "قضايا" : "Cases"} radius={[4,4,0,0]} />
                <Bar dataKey="clients" fill="#0f3460" name={locale === "ar" ? "موكلون" : "Clients"} radius={[4,4,0,0]} />
                <Bar dataKey="docs" fill="#7a5c2a" name={locale === "ar" ? "مستندات" : "Docs"} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ManuscriptFrame>

        <ManuscriptFrame>
          <div className="mb-4 text-sm font-semibold">{locale === "ar" ? "توزيع حالات القضايا" : "Case status distribution"}</div>
          <div className="h-72">
            {statusData.length === 0 ? <div className="grid h-full place-items-center text-sm text-muted-foreground">{locale === "ar" ? "لا توجد قضايا بعد" : "No cases yet"}</div> :
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>}
          </div>
        </ManuscriptFrame>

        <ManuscriptFrame className="lg:col-span-2">
          <div className="mb-4 text-sm font-semibold">{locale === "ar" ? "اتجاه المستندات" : "Documents trend"}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 250)" />
                <XAxis dataKey="m" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="docs" stroke="#fce343" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ManuscriptFrame>
      </div>

      <ManuscriptFrame>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold">
          <Sparkles className="size-4" /> {locale === "ar" ? "رؤى الذكاء الاصطناعي" : "AI insights"}
        </div>
        {insightsLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Analyzing your data…</div>
        : insights ? <MarkdownView text={insights} />
        : <p className="text-sm text-muted-foreground">{locale === "ar" ? "اضغط زر «رؤى الذكاء الاصطناعي» لتوليد توصيات بناءً على بياناتك." : "Click \"AI insights\" to generate recommendations from your real data."}</p>}
      </ManuscriptFrame>
    </div>
  );
}
