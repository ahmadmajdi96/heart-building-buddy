import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cases, type CaseStatus } from "@/lib/mock-data";
import { Filter, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/app/cases")({
  component: CasesPage,
});

function CasesPage() {
  const { locale } = useI18n();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<CaseStatus | "all">("all");

  const filtered = cases.filter((c) => {
    const matchQ = !q || (locale === "ar" ? c.titleAr : c.titleEn).toLowerCase().includes(q.toLowerCase()) || c.ref.toLowerCase().includes(q.toLowerCase());
    const matchF = filter === "all" || c.status === filter;
    return matchQ && matchF;
  });

  const filters: { k: CaseStatus | "all"; labelAr: string; labelEn: string }[] = [
    { k: "all", labelAr: "الكل", labelEn: "All" },
    { k: "active", labelAr: "نشطة", labelEn: "Active" },
    { k: "urgent", labelAr: "عاجلة", labelEn: "Urgent" },
    { k: "pending", labelAr: "معلّقة", labelEn: "Pending" },
    { k: "closed", labelAr: "مغلقة", labelEn: "Closed" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "إدارة القضايا" : "Case Management"}
        subtitle={locale === "ar" ? `${cases.length} قضية مفتوحة عبر 12 مجال ممارسة` : `${cases.length} matters across 12 practice areas`}
        actions={<Button size="sm" variant="gold" className="gap-1.5"><Plus className="size-4" />{locale === "ar" ? "قضية جديدة" : "New matter"}</Button>}
      />

      <div className="card-elev rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={locale === "ar" ? "ابحث برقم القضية أو الموضوع…" : "Search by reference or subject…"} className="h-9 ps-9" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.map((f) => (
              <Button key={f.k} variant={filter === f.k ? "default" : "ghost"} size="sm" onClick={() => setFilter(f.k)}>
                {locale === "ar" ? f.labelAr : f.labelEn}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 ms-auto"><Filter className="size-4" />{locale === "ar" ? "مرشحات" : "Filters"}</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "رقم القضية" : "Ref"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الموضوع" : "Subject"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "المحامي الرئيسي" : "Lead"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الجلسة القادمة" : "Next hearing"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "التقدّم" : "Progress"}</th>
                <th className="px-5 py-3 text-start font-medium">{locale === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-secondary/40">
                  <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{c.ref}</td>
                  <td className="px-5 py-4">
                    <div className="font-medium">{locale === "ar" ? c.titleAr : c.titleEn}</div>
                    <div className="text-xs text-muted-foreground">{c.client} · {c.court} · {c.practice}</div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">{c.lead}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">{c.nextHearing}</td>
                  <td className="px-5 py-4 w-48">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${c.progress}%` }} />
                      </div>
                      <span className="w-8 text-xs tabular-nums text-muted-foreground">{c.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
