import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatTile, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { invoices, billingMonthly } from "@/lib/mock-data";
import { DollarSign, FileBarChart, AlertCircle, TrendingUp, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/app/billing")({ component: BillingPage });

function BillingPage() {
  const { locale } = useI18n();
  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "الفوترة والتحصيل" : "Billing & Collections"}
        subtitle={locale === "ar" ? "ساعات العمل، الفواتير، المصاريف، والتحصيل في مكان واحد." : "Time tracking, invoices, expenses and collections."}
        actions={<Button size="sm" variant="gold" className="gap-1.5"><Plus className="size-4" />{locale === "ar" ? "فاتورة جديدة" : "New invoice"}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={locale === "ar" ? "إجمالي مفوتر" : "Total invoiced"} value={`$${(total/1000).toFixed(0)}K`} icon={<DollarSign className="size-4" />} tone="gold" />
        <StatTile label={locale === "ar" ? "تم التحصيل" : "Collected"} value="$684K" delta="+18%" icon={<TrendingUp className="size-4" />} tone="success" />
        <StatTile label={locale === "ar" ? "متأخرة" : "Overdue"} value={String(overdue)} icon={<AlertCircle className="size-4" />} tone="warning" />
        <StatTile label={locale === "ar" ? "فواتير الشهر" : "Invoices this month"} value={String(invoices.length)} icon={<FileBarChart className="size-4" />} />
      </div>

      <div className="card-elev rounded-xl border bg-card p-6">
        <div className="mb-4 text-sm font-semibold">{locale === "ar" ? "الإيرادات الشهرية" : "Monthly revenue"}</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={billingMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 250)" />
              <XAxis dataKey="m" stroke="oklch(0.48 0.025 252)" fontSize={12} />
              <YAxis stroke="oklch(0.48 0.025 252)" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.91 0.012 250)" }} />
              <Bar dataKey="revenue" fill="oklch(0.76 0.13 78)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-elev overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-5 text-sm font-semibold">{locale === "ar" ? "الفواتير" : "Invoices"}</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-start font-medium">#</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "العميل" : "Client"}</th>
              <th className="px-5 py-3 text-end font-medium">{locale === "ar" ? "المبلغ" : "Amount"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الإصدار" : "Issued"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الاستحقاق" : "Due"}</th>
              <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map((i) => (
              <tr key={i.id} className="transition-colors hover:bg-secondary/40">
                <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{i.id}</td>
                <td className="px-5 py-4 font-medium">{i.client}</td>
                <td className="px-5 py-4 text-end font-mono tabular-nums">{i.amount.toLocaleString()} <span className="text-xs text-muted-foreground">{i.currency}</span></td>
                <td className="px-5 py-4 text-muted-foreground">{i.issued}</td>
                <td className="px-5 py-4 text-muted-foreground">{i.due}</td>
                <td className="px-5 py-4"><StatusBadge status={i.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
