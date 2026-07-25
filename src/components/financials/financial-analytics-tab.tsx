import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  TrendingUp, Wallet, Clock, AlertTriangle, PieChart, Users, Receipt, Timer,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getFinancialAnalytics } from "@/lib/financial-analytics.functions";
import { StatsSkeleton, EmptyState } from "@/components/app/states";
import { CourtFeeCalculator } from "@/components/app/court-fee-calculator";

type Data = Awaited<ReturnType<typeof getFinancialAnalytics>>;

const money = (n: number) =>
  new Intl.NumberFormat("en-JO", { maximumFractionDigits: 0 }).format(Math.round(n || 0));

function Kpi({
  label, value, sub, tone, icon: Icon,
}: { label: string; value: string; sub?: string; tone?: "gold" | "danger" | "ok"; icon: typeof Wallet }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${tone === "danger" ? "text-destructive" : tone === "ok" ? "text-emerald-600" : "text-gold"}`} />
      </div>
      <div className={`mt-1.5 font-serif text-2xl tabular-nums ${tone === "danger" ? "text-destructive" : tone === "gold" ? "text-gold" : ""}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Simple SVG bar chart — billed vs collected per month. */
function TrendChart({ series, ar }: { series: Data["series"]; ar: boolean }) {
  const max = Math.max(1, ...series.map((s) => Math.max(s.billed, s.collected)));
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{ar ? "الفوترة مقابل التحصيل" : "Billed vs collected"}</h3>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-gold" />{ar ? "مفوتر" : "Billed"}</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-600" />{ar ? "محصّل" : "Collected"}</span>
        </div>
      </div>
      <div className="flex h-40 items-end gap-1.5" dir="ltr">
        {series.map((s) => (
          <div key={s.key} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-0.5">
              <div
                className="w-1/2 rounded-t bg-gold/70 transition group-hover:bg-gold"
                style={{ height: `${(s.billed / max) * 100}%` }}
                title={`${ar ? "مفوتر" : "Billed"}: ${money(s.billed)}`}
              />
              <div
                className="w-1/2 rounded-t bg-emerald-600/70 transition group-hover:bg-emerald-600"
                style={{ height: `${(s.collected / max) * 100}%` }}
                title={`${ar ? "محصّل" : "Collected"}: ${money(s.collected)}`}
              />
            </div>
            <span className="truncate text-[9px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bars({
  title, icon: Icon, rows, total, ar,
}: { title: string; icon: typeof PieChart; rows: { label: string; value: number }[]; total: number; ar: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-gold" />{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{ar ? "لا بيانات." : "No data."}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate">{r.label}</span>
                <span className="tabular-nums font-medium">{money(r.value)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-gold/70" style={{ width: `${total > 0 ? (r.value / total) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Detailed financial analytics tab. */
export function FinancialAnalyticsTab() {
  const { locale } = useI18n(); const ar = locale === "ar";
  const run = useServerFn(getFinancialAnalytics);
  const [data, setData] = useState<Data | null>(null);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    run({ data: { months } })
      .then((d) => { if (live) setData(d as Data); })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [months, run]);

  if (loading && !data) return <StatsSkeleton />;
  if (!data) return <EmptyState title={ar ? "لا توجد بيانات مالية" : "No financial data"} />;

  const k = data.kpis;
  const ageRows = [
    { label: ar ? "غير مستحق" : "Current", value: data.ageing.current },
    { label: "1–30", value: data.ageing.d1_30 },
    { label: "31–60", value: data.ageing.d31_60 },
    { label: "61–90", value: data.ageing.d61_90 },
    { label: ar ? "أكثر من ٩٠" : "90+", value: data.ageing.d90_plus },
  ];
  const ageTotal = ageRows.reduce((a, r) => a + r.value, 0);

  const methodLabels: Record<string, string> = {
    cash: ar ? "نقداً" : "Cash",
    bank_transfer: ar ? "حوالة بنكية" : "Bank transfer",
    cheque: ar ? "شيك" : "Cheque",
    card: ar ? "بطاقة" : "Card",
    other: ar ? "أخرى" : "Other",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{ar ? "التحليلات المالية التفصيلية" : "Detailed financial analytics"}</h2>
        <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
          {[3, 6, 12, 24].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`rounded px-2.5 py-1 transition ${months === m ? "bg-gold/15 font-semibold text-gold" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {m}{ar ? " ش" : "m"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Receipt} label={ar ? "إجمالي المفوتر" : "Billed"} value={`${money(k.billedTotal)} JOD`} sub={`${k.openInvoices} ${ar ? "فاتورة مفتوحة" : "open invoices"}`} />
        <Kpi icon={Wallet} tone="ok" label={ar ? "المحصّل" : "Collected"} value={`${money(k.collectedTotal)} JOD`} sub={k.collectionRate !== null ? `${k.collectionRate}% ${ar ? "نسبة التحصيل" : "collection rate"}` : undefined} />
        <Kpi icon={AlertTriangle} tone="danger" label={ar ? "متأخرات" : "Overdue"} value={`${money(k.overdueTotal)} JOD`} sub={`${money(k.outstandingTotal)} ${ar ? "إجمالي المستحق" : "total outstanding"}`} />
        <Kpi icon={TrendingUp} tone="gold" label={ar ? "صافي بعد المصاريف" : "Net of expenses"} value={`${money(k.netCollected)} JOD`} sub={`${money(k.expenseTotal)} ${ar ? "مصاريف" : "expenses"}`} />
        <Kpi icon={Timer} label={ar ? "متوسط أيام السداد" : "Avg days to pay"} value={k.avgDaysToPay !== null ? String(k.avgDaysToPay) : "—"} sub={k.dso !== null ? `DSO ${k.dso}` : undefined} />
        <Kpi icon={Clock} label={ar ? "ساعات قابلة للفوترة" : "Billable hours"} value={String(k.billableHours)} sub={k.utilisation !== null ? `${k.utilisation}% ${ar ? "استثمار الوقت" : "utilisation"}` : undefined} />
        <Kpi icon={TrendingUp} label={ar ? "نسبة التحقق" : "Realisation"} value={k.realisation !== null ? `${k.realisation}%` : "—"} sub={`${money(k.billableValue)} ${ar ? "قيمة الوقت" : "time value"}`} />
        <Kpi icon={Receipt} label={ar ? "مصاريف غير مفوترة" : "Unbilled expenses"} value={`${money(k.unbilledExpenses)} JOD`} />
      </div>

      <TrendChart series={data.series} ar={ar} />

      <div className="grid gap-3 lg:grid-cols-3">
        <Bars ar={ar} title={ar ? "أعمار الذمم" : "AR ageing"} icon={AlertTriangle} rows={ageRows} total={ageTotal} />
        <Bars ar={ar} title={ar ? "طرق الدفع" : "Payment methods"} icon={PieChart}
          rows={Object.entries(data.byMethod).map(([kk, v]) => ({ label: methodLabels[kk] ?? kk, value: v }))}
          total={Object.values(data.byMethod).reduce((a, b) => a + b, 0)} />
        <Bars ar={ar} title={ar ? "توزيع المصاريف" : "Expense mix"} icon={PieChart}
          rows={Object.entries(data.byExpenseKind).map(([kk, v]) => ({ label: kk, value: v }))}
          total={Object.values(data.byExpenseKind).reduce((a, b) => a + b, 0)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-gold" />{ar ? "أعلى العملاء فوترةً" : "Top clients by billing"}</h3>
          <table className="w-full text-xs">
            <tbody className="divide-y">
              {data.topClients.map((c) => (
                <tr key={c.name}>
                  <td className="py-1.5 pe-2 truncate">{c.name}</td>
                  <td className="py-1.5 text-end tabular-nums">{money(c.billed)}</td>
                  <td className="py-1.5 ps-2 text-end tabular-nums text-emerald-600">{money(c.collected)}</td>
                </tr>
              ))}
              {data.topClients.length === 0 && <tr><td className="py-2 text-muted-foreground">{ar ? "لا بيانات." : "No data."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="size-4 text-destructive" />{ar ? "أعلى المديونيات" : "Top debtors"}</h3>
          <table className="w-full text-xs">
            <tbody className="divide-y">
              {data.topDebtors.map((c) => (
                <tr key={c.name}>
                  <td className="py-1.5 pe-2 truncate">{c.name}</td>
                  <td className="py-1.5 text-end tabular-nums text-destructive">{money(c.outstanding)}</td>
                </tr>
              ))}
              {data.topDebtors.length === 0 && <tr><td className="py-2 text-muted-foreground">{ar ? "لا مديونيات." : "Nothing outstanding."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <CourtFeeCalculator />
    </div>
  );
}
