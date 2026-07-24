import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Loader2, MessageSquare, RefreshCw, Search } from "lucide-react";
import { listSmsMessages, smsStatusSummary } from "@/lib/sms.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/messages")({ component: MessagesPage });

const STATUS_TONE: Record<string, string> = {
  delivered: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  sent: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  queued: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  accepted: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  sending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  failed: "bg-red-500/15 text-red-600 border-red-500/30",
  undelivered: "bg-red-500/15 text-red-600 border-red-500/30",
};

const CONTEXT_LABEL: Record<string, { en: string; ar: string }> = {
  client_welcome: { en: "Client welcome", ar: "ترحيب بالعميل" },
  case_assignment: { en: "Case assignment", ar: "إسناد قضية" },
  debt_reminder: { en: "Debt reminder", ar: "تذكير تحصيل" },
  manual: { en: "Manual", ar: "يدوي" },
};

function MessagesPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listSmsMessages);
  const summary = useServerFn(smsStatusSummary);
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; byContext: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ctxFilter, setCtxFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function refresh() {
    setLoading(true);
    try {
      const payload: any = {};
      if (ctxFilter !== "all") payload.context = ctxFilter;
      if (statusFilter !== "all") payload.status = statusFilter;
      const [msgs, s] = await Promise.all([list({ data: payload }), summary()]);
      setRows(msgs as any[]);
      setStats(s as any);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [ctxFilter, statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      [r.to_number, r.body, r.twilio_sid, r.error_message, r.clients?.name, r.cases?.title]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "رسائل SMS" : "SMS Messages"}
        subtitle={ar ? "حالة تسليم كل رسالة SMS مُرسلة من النظام." : "Delivery status for every SMS the system sends."}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label={ar ? "الإجمالي" : "Total"} value={stats?.total ?? 0} />
        <StatCard label={ar ? "تم التسليم" : "Delivered"} value={stats?.byStatus?.delivered ?? 0} tone="emerald" />
        <StatCard label={ar ? "أُرسلت" : "Sent"} value={stats?.byStatus?.sent ?? 0} tone="sky" />
        <StatCard label={ar ? "قيد الإرسال" : "Queued"} value={(stats?.byStatus?.queued ?? 0) + (stats?.byStatus?.accepted ?? 0)} tone="amber" />
        <StatCard label={ar ? "فشلت" : "Failed"} value={(stats?.byStatus?.failed ?? 0) + (stats?.byStatus?.undelivered ?? 0)} tone="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "بحث…" : "Search…"} className="pl-8" />
        </div>
        <Select value={ctxFilter} onValueChange={setCtxFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? "كل الأنواع" : "All types"}</SelectItem>
            <SelectItem value="client_welcome">{ar ? "ترحيب بالعميل" : "Client welcome"}</SelectItem>
            <SelectItem value="case_assignment">{ar ? "إسناد قضية" : "Case assignment"}</SelectItem>
            <SelectItem value="debt_reminder">{ar ? "تذكير تحصيل" : "Debt reminder"}</SelectItem>
            <SelectItem value="manual">{ar ? "يدوي" : "Manual"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? "كل الحالات" : "All statuses"}</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="undelivered">Undelivered</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="size-4" />{ar ? "تحديث" : "Refresh"}</Button>
      </div>

      <div className="card-elev overflow-hidden rounded-xl border bg-card">
        {loading ? (
          <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 size-6 opacity-50" />
            {ar ? "لا توجد رسائل." : "No messages."}
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r: any) => {
              const status = String(r.status || "queued").toLowerCase();
              const tone = STATUS_TONE[status] ?? "bg-muted text-muted-foreground border";
              const ctx = CONTEXT_LABEL[r.context] ?? { en: r.context, ar: r.context };
              return (
                <li key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full border px-2 py-0.5 uppercase tracking-wider ${tone}`}>{status}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider">{ar ? ctx.ar : ctx.en}</span>
                      <span className="text-muted-foreground">→ {r.to_number}</span>
                      {r.clients?.name && <span className="text-muted-foreground">· {r.clients.name}</span>}
                      {r.cases?.title && <span className="text-muted-foreground">· {r.cases.title}</span>}
                    </div>
                    <p className="mt-1 text-sm break-words">{r.body}</p>
                    {r.error_message && (
                      <p className="mt-1 text-xs text-red-600">
                        {r.error_code ? `[${r.error_code}] ` : ""}{humanizeErrorMessage(r.error_message)}
                      </p>
                    )}
                    {/* Provider SID intentionally hidden from users — visible only in server logs. */}

                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    <div>{new Date(r.sent_at).toLocaleString()}</div>
                    {r.delivered_at && <div className="text-emerald-600">✓ {new Date(r.delivered_at).toLocaleTimeString()}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "sky" | "amber" | "red" }) {
  const cls =
    tone === "emerald" ? "text-emerald-600" :
    tone === "sky" ? "text-sky-600" :
    tone === "amber" ? "text-amber-600" :
    tone === "red" ? "text-red-600" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-serif ${cls}`}>{value}</div>
    </div>
  );
}
