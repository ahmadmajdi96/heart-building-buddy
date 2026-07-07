// Small toolbar used by all Financials tabs — search + status + date range + export.
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Download, X } from "lucide-react";

export function FinancialsToolbar({
  q, setQ, status, setStatus, statuses,
  fromLabel, from, setFrom, to, setTo,
  onExport, exportDisabled,
  placeholder, locale,
}: {
  q: string; setQ: (v: string) => void;
  status?: string; setStatus?: (v: string) => void;
  statuses?: string[];
  fromLabel?: string;
  from: string; setFrom: (v: string) => void;
  to: string; setTo: (v: string) => void;
  onExport: () => void;
  exportDisabled?: boolean;
  placeholder: string; locale: "ar" | "en";
}) {
  const hasAny = q || (status && status !== "all") || from || to;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "بحث" : "Search"}</Label>
        <div className="relative w-56">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-9 ps-9" />
        </div>
      </div>
      {statuses && setStatus && (
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "الحالة" : "Status"}</Label>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "ghost"} onClick={() => setStatus(s)} className="capitalize h-9">
                {s === "all" ? (locale === "ar" ? "الكل" : "All") : s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">{fromLabel ?? (locale === "ar" ? "من" : "From")}</Label>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">{locale === "ar" ? "إلى" : "To"}</Label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
      </div>
      {hasAny && (
        <Button size="sm" variant="ghost" onClick={() => { setQ(""); if (setStatus) setStatus("all"); setFrom(""); setTo(""); }} className="h-9 gap-1.5">
          <X className="size-3.5" />{locale === "ar" ? "مسح" : "Clear"}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={onExport} disabled={exportDisabled} className="h-9 gap-1.5 ms-auto">
        <Download className="size-3.5" />{locale === "ar" ? "تصدير CSV" : "Export CSV"}
      </Button>
    </div>
  );
}
