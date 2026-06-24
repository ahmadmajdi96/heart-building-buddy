import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Loader2, History } from "lucide-react";
import { listActivity } from "@/lib/activity-log.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/app/activity")({ component: ActivityPage });

function ActivityPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listActivity);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setRows((await list({ data: { limit: 200 } })) as any[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "سجل النشاط" : "Activity Log"}
        subtitle={ar ? "سجل غير قابل للتعديل لأهم تصرفات المستخدمين في المكتب." : "Immutable log of important user actions across the firm."}
      />
      <div className="card-elev rounded-xl border bg-card">
        {loading ? (
          <div className="grid place-items-center p-12"><Loader2 className="size-5 animate-spin text-gold" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-2 size-6 opacity-50" />
            {ar ? "لا يوجد نشاط حتى الآن." : "No activity yet."}
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r: any) => (
              <li key={r.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{r.actor_name || (ar ? "مستخدم" : "User")}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider">{r.action}</span>
                    <span>· {r.entity_type}</span>
                    {r.cases?.title && (
                      <Link to="/app/cases/$caseId" params={{ caseId: r.case_id }} className="text-gold hover:underline">
                        · {r.cases.title}
                      </Link>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{r.summary}</p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
