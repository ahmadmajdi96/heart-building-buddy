import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/app/clients")({ component: ClientsPage });

const clients = [
  { id: "cl1", name: "شركة الأنوار للتجارة", industry: "تجارة وتوزيع", country: "السعودية", matters: 7, since: "2021" },
  { id: "cl2", name: "Gulf Capital Holdings", industry: "استثمار", country: "الإمارات", matters: 12, since: "2019" },
  { id: "cl3", name: "وزارة الأشغال العامة", industry: "حكومي", country: "الكويت", matters: 4, since: "2023" },
  { id: "cl4", name: "مجموعة الواحة", industry: "تجزئة", country: "السعودية", matters: 3, since: "2022" },
  { id: "cl5", name: "شركة نسيج للأزياء", industry: "أزياء", country: "مصر", matters: 5, since: "2020" },
  { id: "cl6", name: "ورثة آل سالم", industry: "أفراد", country: "الكويت", matters: 2, since: "2024" },
];

function ClientsPage() {
  const { locale } = useI18n();
  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "العملاء" : "Clients"}
        subtitle={locale === "ar" ? `${clients.length} عميلاً نشطاً` : `${clients.length} active clients`}
        actions={<Button size="sm" variant="gold" className="gap-1.5"><Plus className="size-4" />{locale === "ar" ? "عميل جديد" : "New client"}</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => (
          <div key={c.id} className="card-elev rounded-xl border bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{c.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{c.industry}</div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{c.country}</span>
                  <span>·</span>
                  <span>{locale === "ar" ? "عميل منذ" : "Since"} {c.since}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs">
              <span className="text-muted-foreground">{locale === "ar" ? `${c.matters} قضية` : `${c.matters} matters`}</span>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="icon" className="size-7"><Mail className="size-3.5" /></Button>
                <Button variant="ghost" size="icon" className="size-7"><Phone className="size-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
