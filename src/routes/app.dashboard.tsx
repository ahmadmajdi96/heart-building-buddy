import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatTile, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { useOrg } from "@/lib/org-context";
import { Briefcase, Clock3, DollarSign, FileWarning, ArrowUpRight, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const { locale } = useI18n();
  const { org } = useOrg();
  const stats = useServerFn(getDashboardStats);
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await stats()); }
      catch (e) { toast.error((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, []);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
      style: "currency",
      currency: org?.currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  if (loading || !data) {
    return <div className="grid place-items-center p-20"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  }

  const c = data.counts;
  const orgName = org?.display_name || org?.legal_name || (locale === "ar" ? "مكتبك" : "your firm");

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? `مرحباً، ${orgName} 👋` : `Welcome back, ${orgName} 👋`}
        subtitle={locale === "ar" ? "ملخّص نشاطك الحالي." : "A live snapshot of your activity."}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={locale === "ar" ? "قضايا نشطة" : "Active matters"}
          value={String(c.activeCases)}
          delta={locale === "ar" ? `${c.totalCases} إجمالي` : `${c.totalCases} total`}
          icon={<Briefcase className="size-4" />}
        />
        <StatTile
          label={locale === "ar" ? "مواعيد خلال 7 أيام" : "Upcoming (7 days)"}
          value={String(c.upcoming7d)}
          icon={<Clock3 className="size-4" />}
          tone="gold"
        />
        <StatTile
          label={locale === "ar" ? "إيرادات الشهر" : "Revenue this month"}
          value={fmtMoney(c.monthRevenue)}
          delta={c.outstanding ? (locale === "ar" ? `مستحق: ${fmtMoney(c.outstanding)}` : `Outstanding: ${fmtMoney(c.outstanding)}`) : undefined}
          icon={<DollarSign className="size-4" />}
          tone="success"
        />
        <StatTile
          label={locale === "ar" ? "العملاء" : "Clients"}
          value={String(c.clients)}
          delta={locale === "ar" ? `${c.documents} مستند` : `${c.documents} documents`}
          icon={<Users className="size-4" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-elev rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-5">
            <div className="text-sm font-semibold">{locale === "ar" ? "أحدث القضايا" : "Recent matters"}</div>
            <Button asChild variant="ghost" size="sm"><Link to="/app/cases">{locale === "ar" ? "عرض الكل" : "View all"} <ArrowUpRight className="size-3.5" /></Link></Button>
          </div>
          {data.recentCases.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {locale === "ar" ? "لا توجد قضايا بعد." : "No matters yet."}
            </div>
          ) : (
            <ul className="divide-y">
              {data.recentCases.map((c: any) => (
                <li key={c.id} className="flex items-center gap-4 p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                    {(c.case_number || c.id).slice(-4)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.clients?.name ?? (locale === "ar" ? "—" : "—")}{c.court ? ` · ${c.court}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-elev rounded-xl border bg-card">
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
        </div>
      </div>
    </div>
  );
}
