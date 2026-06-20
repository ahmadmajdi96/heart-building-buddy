import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatTile, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { cases, hearings, billingMonthly, practiceMix } from "@/lib/mock-data";
import { Briefcase, Clock3, DollarSign, FileWarning, ArrowUpRight, Sparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
});

const PIE_COLORS = ["oklch(0.55 0.15 255)", "oklch(0.76 0.13 78)", "oklch(0.6 0.13 175)", "oklch(0.65 0.18 25)", "oklch(0.55 0.16 320)", "oklch(0.62 0.13 155)"];

function DashboardPage() {
  const { t, locale } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "مرحباً، د. ليلى 👋" : "Welcome back, Dr. Leila 👋"}
        subtitle={locale === "ar" ? "هذا ملخص أداء مكتبك اليوم." : "Here's how your firm is doing today."}
        actions={
          <>
            <Button variant="outline" size="sm">{locale === "ar" ? "تصدير التقرير" : "Export report"}</Button>
            <Button size="sm" variant="gold" className="gap-1.5"><Sparkles className="size-4" />{locale === "ar" ? "مساعد الذكاء" : "AI Assistant"}</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={locale === "ar" ? "قضايا نشطة" : "Active matters"} value="128" delta="+12% MoM" icon={<Briefcase className="size-4" />} />
        <StatTile label={locale === "ar" ? "ساعات قابلة للفوترة" : "Billable hours"} value="1,284" delta="+8%" icon={<Clock3 className="size-4" />} tone="gold" />
        <StatTile label={locale === "ar" ? "إيرادات الشهر" : "Monthly revenue"} value="$295K" delta="+22%" icon={<DollarSign className="size-4" />} tone="success" />
        <StatTile label={locale === "ar" ? "مواعيد عاجلة" : "Urgent deadlines"} value="6" delta={locale === "ar" ? "خلال 7 أيام" : "next 7 days"} icon={<FileWarning className="size-4" />} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-elev rounded-xl border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold">{locale === "ar" ? "الإيرادات والساعات" : "Revenue & Hours"}</div>
              <div className="text-xs text-muted-foreground">{locale === "ar" ? "آخر 6 أشهر" : "Last 6 months"}</div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">{t("view_all")} <ArrowUpRight className="size-3.5" /></Button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={billingMonthly}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.76 0.13 78)" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="oklch(0.76 0.13 78)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="hrs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.55 0.15 255)" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="oklch(0.55 0.15 255)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 250)" />
                <XAxis dataKey="m" stroke="oklch(0.48 0.025 252)" fontSize={12} />
                <YAxis stroke="oklch(0.48 0.025 252)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.91 0.012 250)" }} />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.76 0.13 78)" strokeWidth={2} fill="url(#rev)" />
                <Area type="monotone" dataKey="hours" stroke="oklch(0.55 0.15 255)" strokeWidth={2} fill="url(#hrs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elev rounded-xl border bg-card p-6">
          <div className="mb-4 text-sm font-semibold">{locale === "ar" ? "توزيع الممارسات" : "Practice mix"}</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={practiceMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {practiceMix.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-elev rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-5">
            <div className="text-sm font-semibold">{locale === "ar" ? "القضايا الأخيرة" : "Recent matters"}</div>
            <Button asChild variant="ghost" size="sm"><Link to="/app/cases">{t("view_all")}</Link></Button>
          </div>
          <ul className="divide-y">
            {cases.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center gap-4 p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                  {c.ref.slice(-4)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{locale === "ar" ? c.titleAr : c.titleEn}</div>
                  <div className="text-xs text-muted-foreground">{c.client} · {c.court}</div>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="card-elev rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-5">
            <div className="text-sm font-semibold">{locale === "ar" ? "الجلسات القادمة" : "Upcoming hearings"}</div>
            <Button asChild variant="ghost" size="sm"><Link to="/app/calendar">{t("view_all")}</Link></Button>
          </div>
          <ul className="divide-y">
            {hearings.map((h) => (
              <li key={h.id} className="flex items-center gap-4 p-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
                  <div className="text-center leading-tight">
                    <div className="text-[10px] font-medium uppercase">{h.date.slice(5, 7)}</div>
                    <div className="font-serif text-lg">{h.date.slice(8, 10)}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{h.type} — {h.caseRef}</div>
                  <div className="text-xs text-muted-foreground">{h.court} · {h.time}</div>
                </div>
                <div className="text-xs text-muted-foreground">{h.attendee}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
