import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Loader2, History, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { listActivity } from "@/lib/activity-log.functions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/activity")({ component: ActivityPage });

const PAGE_SIZES = [25, 50, 100, 200] as const;

function ActivityPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listActivity);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);

  async function refresh() {
    setLoading(true);
    try { setRows((await list({ data: { limit: 500 } })) as any[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 86_399_999 : null;
    return rows.filter((r) => {
      if (fromTs || toTs) {
        const t = new Date(r.created_at).getTime();
        if (fromTs && t < fromTs) return false;
        if (toTs && t > toTs) return false;
      }
      if (!needle) return true;
      const hay = [
        r.actor_name, r.action, r.entity_type, r.summary,
        r.cases?.title, r.cases?.case_number,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [q, from, to, pageSize]);

  const hasFilters = q || from || to;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "سجل النشاط" : "Activity Log"}
        subtitle={ar ? "سجل غير قابل للتعديل لأهم تصرفات المستخدمين في المكتب." : "Immutable log of important user actions across the firm."}
      />

      <div className="card-elev rounded-xl border bg-card">
        <div className="flex flex-wrap items-end gap-2 border-b p-4">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{ar ? "بحث" : "Search"}</Label>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={ar ? "ابحث في المستخدم، الإجراء، الملخص..." : "Search actor, action, summary..."}
                className="h-9 ps-9"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{ar ? "من" : "From"}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{ar ? "إلى" : "To"}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
          </div>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={() => { setQ(""); setFrom(""); setTo(""); }} className="h-9 gap-1.5">
              <X className="size-3.5" />{ar ? "مسح" : "Clear"}
            </Button>
          )}
          <div className="ms-auto flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{ar ? "لكل صفحة" : "Per page"}</Label>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-9 w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-2 size-6 opacity-50" />
            {ar ? "لا يوجد نشاط مطابق." : "No matching activity."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ar ? "المستخدم" : "User"}</TableHead>
                    <TableHead>{ar ? "الإجراء" : "Action"}</TableHead>
                    <TableHead>{ar ? "الكيان" : "Entity"}</TableHead>
                    <TableHead>{ar ? "القضية" : "Case"}</TableHead>
                    <TableHead>{ar ? "الملخص" : "Summary"}</TableHead>
                    <TableHead className="whitespace-nowrap">{ar ? "التاريخ" : "Date"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.actor_name || (ar ? "مستخدم" : "User")}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider">{r.action}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.entity_type}</TableCell>
                      <TableCell>
                        {r.cases?.title ? (
                          <Link to="/app/cases/$caseId" params={{ caseId: r.case_id }} className="text-gold hover:underline">
                            {r.cases.title}
                          </Link>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="max-w-[420px] truncate text-sm" title={r.summary}>{r.summary}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-xs text-muted-foreground">
              <div>
                {ar
                  ? `عرض ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} من ${filtered.length}`
                  : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length}`}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-8 gap-1" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="size-3.5" />{ar ? "السابق" : "Prev"}
                </Button>
                <span className="px-2">{ar ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
                <Button size="sm" variant="outline" className="h-8 gap-1" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  {ar ? "التالي" : "Next"}<ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
