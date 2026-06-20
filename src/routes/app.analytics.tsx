import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatTile } from "@/components/app/primitives";
import { billingMonthly, practiceMix } from "@/lib/mock-data";
import { TrendingUp, Users, Briefcase, Award } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Line, LineChart } from "recharts";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

const lawyerPerf = [
  { name: "Leila", cases: 9, hours: 168 },
  { name: "Khaled", cases: 7, hours: 142 },
  { name: "Hisham", cases: 5, hours: 121 },
  { name: "Yasser", cases: 8, hours: 154 },
  { name: "Mona", cases: 4, hours: 98 },
];

function AnalyticsPage() {
  const { locale } = useI18n();
  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "التحليلات والمؤشرات" : "Analytics & KPIs"}
        subtitle={locale === "ar" ? "صورة شاملة عن أداء المكتب، الشركاء، ومجالات الممارسة." : "Holistic view of firm, partners and practice-area performance."}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={locale === "ar" ? "نسبة الفوز" : "Win rate"} value="87%" delta="+4 pts" icon={<TrendingUp className="size-4" />} tone="success" />
        <StatTile label={locale === "ar" ? "متوسط مدة القضية" : "Avg matter duration"} value="4.2m" icon={<Briefcase className="size-4" />} tone="gold" />
        <StatTile label={locale === "ar" ? "موكلون نشطون" : "Active clients"} value="312" icon={<Users className="size-4" />} />
        <StatTile label={locale === "ar" ? "رضا الموكلين (NPS)" : "Client NPS"} value="64" icon={<Award className="size-4" />} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-elev rounded-xl border bg-card p-6">
          <div className="mb-4 text-sm font-semibold">{locale === "ar" ? "أداء المحامين" : "Lawyer performance"}</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lawyerPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 250)" />
                <XAxis dataKey="name" stroke="oklch(0.48 0.025 252)" fontSize={12} />
                <YAxis stroke="oklch(0.48 0.025 252)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.91 0.012 250)" }} />
                <Bar dataKey="hours" fill="oklch(0.55 0.15 255)" radius={[4,4,0,0]} />
                <Bar dataKey="cases" fill="oklch(0.76 0.13 78)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elev rounded-xl border bg-card p-6">
          <div className="mb-4 text-sm font-semibold">{locale === "ar" ? "نقاط القوة في الممارسة" : "Practice-area strength"}</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={practiceMix}>
                <PolarGrid stroke="oklch(0.91 0.012 250)" />
                <PolarAngleAxis dataKey="name" fontSize={11} />
                <PolarRadiusAxis fontSize={10} />
                <Radar dataKey="value" stroke="oklch(0.76 0.13 78)" fill="oklch(0.76 0.13 78)" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elev rounded-xl border bg-card p-6 lg:col-span-2">
          <div className="mb-4 text-sm font-semibold">{locale === "ar" ? "اتجاه الإيرادات" : "Revenue trend"}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={billingMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.012 250)" />
                <XAxis dataKey="m" stroke="oklch(0.48 0.025 252)" fontSize={12} />
                <YAxis stroke="oklch(0.48 0.025 252)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.91 0.012 250)" }} />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.76 0.13 78)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
