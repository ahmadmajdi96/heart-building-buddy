import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatTile, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDashboardStats, getTeamPerformance } from "@/lib/dashboard.functions";
import { useOrg, roleLabel, type OrgRole } from "@/lib/org-context";
import {
  Briefcase, Clock3, DollarSign, FileWarning, ArrowUpRight, Users,
  Loader2, FileText, Pencil, Video, Receipt, TrendingUp, Radio,
  AlertTriangle, Timer,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const { locale } = useI18n();
  const { org } = useOrg();
  const stats = useServerFn(getDashboardStats);
  const team = useServerFn(getTeamPerformance);
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [teamData, setTeamData] = useState<Awaited<ReturnType<typeof getTeamPerformance>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    stats()
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError((e as Error).message); toast.error((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    team()
      .then((t) => { if (!cancelled) setTeamData(t); })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, []);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
      style: "currency",
      currency: org?.currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  if (loading) {
    return <div className="grid place-items-center p-20"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  }
  if (!data) {
    return (
      <div className="grid place-items-center p-20 text-center">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{error || (locale === "ar" ? "تعذّر تحميل البيانات" : "Failed to load dashboard data")}</p>
          <Button size="sm" onClick={() => window.location.reload()}>{locale === "ar" ? "إعادة المحاولة" : "Retry"}</Button>
        </div>
      </div>
    );
  }

  const c = data.counts;
  const orgName = org?.display_name || org?.legal_name || (locale === "ar" ? "مكتبك" : "your firm");
  const maxTrend = Math.max(...data.revenueTrend.map((t) => t.amount), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? `مرحباً، ${orgName} 👋` : `Welcome back, ${orgName} 👋`}
        subtitle={locale === "ar" ? "نظرة شاملة على نشاط المكتب." : "A complete snapshot of your firm."}
      />

      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={locale === "ar" ? "قضايا نشطة" : "Active matters"}
          value={String(c.activeCases)}
          delta={locale === "ar" ? `${c.totalCases} إجمالي` : `${c.totalCases} total`}
          icon={<Briefcase className="size-4" />} />
        <StatTile label={locale === "ar" ? "إيرادات الشهر" : "Revenue (month)"}
          value={fmtMoney(c.monthRevenue)}
          delta={locale === "ar" ? `السنة: ${fmtMoney(c.ytdRevenue)}` : `YTD: ${fmtMoney(c.ytdRevenue)}`}
          icon={<DollarSign className="size-4" />} tone="success" />
        <StatTile label={locale === "ar" ? "المستحقات" : "Outstanding"}
          value={fmtMoney(c.outstanding)}
          delta={locale === "ar" ? `${c.invoiceTotalCount} فاتورة` : `${c.invoiceTotalCount} invoices`}
          icon={<Receipt className="size-4" />} tone="warning" />
        <StatTile label={locale === "ar" ? "مواعيد 7 أيام" : "Upcoming (7d)"}
          value={String(c.upcoming7d)}
          icon={<Clock3 className="size-4" />} tone="gold" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatTile label={locale === "ar" ? "ساعات (الشهر)" : "Hours (month)"}
          value={(c as any).hoursMonth?.toFixed(1) ?? "0.0"}
          delta={locale === "ar" ? `قابلة للفوترة: ${(c as any).billableHoursMonth?.toFixed(1) ?? 0}` : `Billable: ${(c as any).billableHoursMonth?.toFixed(1) ?? 0}`}
          icon={<Timer className="size-4" />} tone="gold" />
        <StatTile label={locale === "ar" ? "أعمال جارية (WIP)" : "Work in progress"}
          value={fmtMoney((c as any).wipMonth ?? 0)}
          icon={<DollarSign className="size-4" />} />
        <StatTile label={locale === "ar" ? "فواتير متأخرة" : "Overdue invoices"}
          value={String((c as any).overdueCount ?? 0)}
          delta={(c as any).overdueAmount ? fmtMoney((c as any).overdueAmount) : undefined}
          icon={<AlertTriangle className="size-4" />} tone={(c as any).overdueCount > 0 ? "warning" : undefined} />
        <StatTile label={locale === "ar" ? "مواعيد متأخرة" : "Overdue deadlines"}
          value={String((c as any).overdueDeadlines ?? 0)}
          icon={<AlertTriangle className="size-4" />} tone={(c as any).overdueDeadlines > 0 ? "warning" : undefined} />
        <StatTile label={locale === "ar" ? "العملاء" : "Clients"} value={String(c.clients)} icon={<Users className="size-4" />} />
        <StatTile label={locale === "ar" ? "فواتير مدفوعة" : "Paid invoices"} value={`${c.invoicePaidCount}/${c.invoiceTotalCount}`} icon={<TrendingUp className="size-4" />} tone="success" />
      </div>

      {/* Tertiary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label={locale === "ar" ? "المستندات" : "Documents"} value={String(c.documents)} icon={<FileText className="size-4" />} />
        <StatTile label={locale === "ar" ? "المسودات" : "Drafts"} value={String(c.drafts)} icon={<Pencil className="size-4" />} />
        <StatTile label={locale === "ar" ? "اجتماعات" : "Meetings"} value={String(c.meetings)}
          delta={c.liveMeetings ? (locale === "ar" ? `${c.liveMeetings} مباشر` : `${c.liveMeetings} live`) : undefined}
          icon={<Video className="size-4" />} />
        <StatTile label={locale === "ar" ? "جلسات مباشرة" : "Live sessions"} value={String(c.liveSessions)} icon={<Radio className="size-4" />} />
        <StatTile label={locale === "ar" ? "إجمالي ساعات الشهر" : "Total hours (month)"}
          value={(c as any).hoursMonth?.toFixed(1) ?? "0.0"}
          icon={<Clock3 className="size-4" />} />
      </div>


      {/* Revenue trend + Cases by status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">{locale === "ar" ? "تدفّق الإيرادات (6 أشهر)" : "Revenue trend (6 months)"}</div>
            <span className="text-xs text-muted-foreground">{fmtMoney(c.ytdRevenue)} {locale === "ar" ? "هذا العام" : "YTD"}</span>
          </div>
          <div className="flex h-40 items-end gap-3">
            {data.revenueTrend.map((t, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative w-full flex-1">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t bg-gradient-to-t from-gold/70 to-gold transition-all group-hover:from-gold group-hover:to-gold/90"
                    style={{ height: `${(t.amount / maxTrend) * 100}%`, minHeight: t.amount ? 4 : 0 }}
                    title={fmtMoney(t.amount)}
                  />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.month}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 text-sm font-semibold">{locale === "ar" ? "حالة القضايا" : "Cases by status"}</div>
          {Object.keys(c.casesByStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">{locale === "ar" ? "لا قضايا بعد." : "No matters yet."}</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(c.casesByStatus).map(([k, v]) => {
                const pct = c.totalCases ? Math.round((v / c.totalCases) * 100) : 0;
                return (
                  <li key={k}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="capitalize">{k}</span>
                      <span className="text-muted-foreground">{v} · {pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Team performance */}
      {teamData && teamData.members.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-5">
            <div className="text-sm font-semibold">{locale === "ar" ? "أداء الفريق" : "Team performance"}</div>
            <Button asChild variant="ghost" size="sm"><Link to="/app/settings">{locale === "ar" ? "إدارة" : "Manage"} <ArrowUpRight className="size-3.5" /></Link></Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "العضو" : "Member"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الدور" : "Role"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "قضايا" : "Matters"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "نشطة" : "Active"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {teamData.members.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3">
                    <div className="font-medium">{m.name || m.email || "—"}</div>
                    {m.email && m.name && <div className="text-xs text-muted-foreground">{m.email}</div>}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{roleLabel(m.role as OrgRole, locale)}</td>
                  <td className="px-5 py-3">{m.cases}</td>
                  <td className="px-5 py-3">{m.activeCases}</td>
                  <td className="px-5 py-3 text-xs capitalize text-muted-foreground">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Recents row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-5">
            <div className="text-sm font-semibold">{locale === "ar" ? "أحدث القضايا" : "Recent matters"}</div>
            <Button asChild variant="ghost" size="sm"><Link to="/app/cases">{locale === "ar" ? "عرض الكل" : "View all"} <ArrowUpRight className="size-3.5" /></Link></Button>
          </div>
          {data.recentCases.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">{locale === "ar" ? "لا توجد قضايا بعد." : "No matters yet."}</div>
          ) : (
            <ul className="divide-y">
              {data.recentCases.map((c: any) => (
                <li key={c.id} className="flex items-center gap-4 p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                    {(c.case_number || c.id).slice(-4)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.clients?.name ?? "—"}{c.court ? ` · ${c.court}` : ""}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-5">
            <div className="text-sm font-semibold">{locale === "ar" ? "الجلسات القادمة" : "Upcoming hearings"}</div>
            <Button asChild variant="ghost" size="sm"><Link to="/app/calendar">{locale === "ar" ? "عرض الكل" : "View all"} <ArrowUpRight className="size-3.5" /></Link></Button>
          </div>
          {data.upcomingHearings.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <FileWarning className="mx-auto mb-2 size-6 text-gold/50" />
              {locale === "ar" ? "لا مواعيد قادمة." : "Nothing scheduled."}
            </div>
          ) : (
            <ul className="divide-y">
              {data.upcomingHearings.map((h: any) => {
                const d = new Date(h.starts_at);
                return (
                  <li key={h.id} className="flex items-center gap-4 p-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
                      <div className="text-center leading-tight">
                        <div className="text-[10px] font-medium uppercase">{d.toLocaleString(locale === "ar" ? "ar" : "en", { month: "short" })}</div>
                        <div className="font-serif text-lg">{d.getDate()}</div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{h.title}{h.cases?.title ? ` — ${h.cases.title}` : ""}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.toLocaleTimeString(locale === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })}
                        {h.location ? ` · ${h.location}` : ""}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.kind}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div className="text-sm font-semibold">{locale === "ar" ? "عملاء جدد" : "Recent clients"}</div>
            <Button asChild variant="ghost" size="sm"><Link to="/app/clients">{locale === "ar" ? "الكل" : "All"}</Link></Button>
          </div>
          {data.recentClients.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">—</div>
          ) : (
            <ul className="divide-y">
              {data.recentClients.map((cl: any) => (
                <li key={cl.id} className="p-4">
                  <div className="truncate text-sm font-medium">{cl.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{cl.email || new Date(cl.created_at).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div className="text-sm font-semibold">{locale === "ar" ? "مستندات حديثة" : "Recent documents"}</div>
            <Button asChild variant="ghost" size="sm"><Link to="/app/documents">{locale === "ar" ? "الكل" : "All"}</Link></Button>
          </div>
          {data.recentDocuments.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">—</div>
          ) : (
            <ul className="divide-y">
              {data.recentDocuments.map((d: any) => (
                <li key={d.id} className="p-4">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div className="text-sm font-semibold">{locale === "ar" ? "فواتير حديثة" : "Recent invoices"}</div>
            <Button asChild variant="ghost" size="sm"><Link to="/app/financials">{locale === "ar" ? "الكل" : "All"}</Link></Button>
          </div>
          {data.recentInvoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">—</div>
          ) : (
            <ul className="divide-y">
              {data.recentInvoices.map((iv: any) => {
                const due = Math.max(Number(iv.total || 0) - Number(iv.amount_paid || 0), 0);
                return (
                  <li key={iv.id} className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{iv.number}</div>
                      <div className="truncate text-xs text-muted-foreground">{iv.clients?.name ?? "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{fmtMoney(Number(iv.total || 0))}</div>
                      {due > 0 && <div className="text-[10px] text-amber-600">{locale === "ar" ? "متبقّي" : "Due"} {fmtMoney(due)}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
