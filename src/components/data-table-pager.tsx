// Reusable page-size selector + pager, matching the activity log table pattern.
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

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

export function usePagination(reset: unknown[], initialSize: number = 25) {
  // Compact helper — kept as plain functions to avoid a hook signature.
  return { initialSize };
}
