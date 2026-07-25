// Reusable page-size selector + pager, matching the activity log table pattern.
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Rows2, Rows3, Rows4 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useDensity, type Density } from "@/hooks/use-density";


export const PAGE_SIZES = [25, 50, 100, 200] as const;

export function PageSizeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{ar ? "لكل صفحة" : "Per page"}</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-9 w-[90px]"><SelectValue /></SelectTrigger>
        <SelectContent>{PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export function TablePager({
  page, pageSize, total, onPage,
}: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-xs text-muted-foreground">
      <div>{ar ? `عرض ${from}–${to} من ${total}` : `Showing ${from}–${to} of ${total}`}</div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-8 gap-1" disabled={current <= 1} onClick={() => onPage(Math.max(1, current - 1))}>
          <ChevronLeft className="size-3.5" />{ar ? "السابق" : "Prev"}
        </Button>
        <span className="px-2">{ar ? `صفحة ${current} من ${totalPages}` : `Page ${current} of ${totalPages}`}</span>
        <Button size="sm" variant="outline" className="h-8 gap-1" disabled={current >= totalPages} onClick={() => onPage(Math.min(totalPages, current + 1))}>
          {ar ? "التالي" : "Next"}<ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Table density control — comfortable / cozy / compact, persisted per browser. */
export function DensityToggle() {
  const { locale } = useI18n(); const ar = locale === "ar";
  const { density, setDensity } = useDensity();
  const opts: { v: Density; label: string; icon: typeof Rows3 }[] = [
    { v: "comfortable", label: ar ? "مريح" : "Comfortable", icon: Rows2 },
    { v: "cozy", label: ar ? "متوسط" : "Cozy", icon: Rows3 },
    { v: "compact", label: ar ? "مضغوط" : "Compact", icon: Rows4 },
  ];
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{ar ? "كثافة الجدول" : "Density"}</Label>
      <div className="inline-flex h-9 items-center rounded-md border bg-card p-0.5">
        {opts.map((o) => {
          const Icon = o.icon;
          const active = density === o.v;
          return (
            <button
              key={o.v}
              type="button"
              title={o.label}
              aria-label={o.label}
              aria-pressed={active}
              onClick={() => setDensity(o.v)}
              className={`flex size-7 items-center justify-center rounded transition ${active ? "bg-gold/15 text-gold" : "text-muted-foreground hover:bg-secondary"}`}
            >
              <Icon className="size-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

