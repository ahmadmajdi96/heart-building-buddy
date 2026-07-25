import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check, CheckCheck, X, Trash2, Inbox, CalendarClock, Receipt, Scale, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { EmptyState, LinesSkeleton } from "@/components/app/states";
import { listNotifications, markRead, deleteNotification, unreadCount, runDeadlineReminders } from "@/lib/notifications.functions";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  kind: string;
};

const KIND_ICON: Record<string, typeof Bell> = {
  deadline_reminder: CalendarClock,
  invoice: Receipt,
  payment: Receipt,
  case: Scale,
  sms: MessageSquare,
};

function relative(iso: string, ar: boolean) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return ar ? "الآن" : "just now";
  if (m < 60) return ar ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return ar ? `قبل ${h} س` : `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return ar ? `قبل ${d} يوم` : `${d}d ago`;
  return new Date(iso).toLocaleDateString(ar ? "ar-JO" : "en-JO");
}

function bucketOf(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);
  if (d >= today) return "today";
  if (d >= yesterday) return "yesterday";
  return "earlier";
}

/** Full notification centre — replaces the old dropdown. */
export function NotificationCenter() {
  const { t, locale } = useI18n(); const ar = locale === "ar";
  const navigate = useNavigate();
  const load = useServerFn(listNotifications);
  const count = useServerFn(unreadCount);
  const mark = useServerFn(markRead);
  const del = useServerFn(deleteNotification);
  const runRem = useServerFn(runDeadlineReminders);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");

  async function refreshCount() {
    try { setUnread((await count()).count); } catch { /* noop */ }
  }
  async function fetchList() {
    setLoading(true);
    try {
      setItems((await load({ data: { limit: 100 } })) as Notif[]);
      await refreshCount();
    } finally { setLoading(false); }
  }

  useEffect(() => {
    refreshCount();
    (async () => { try { await runRem(); refreshCount(); } catch { /* noop */ } })();
    const id = setInterval(refreshCount, 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (open) fetchList(); }, [open]);

  const visible = useMemo(
    () => (tab === "unread" ? items.filter((n) => !n.read_at) : items),
    [items, tab],
  );
  const groups = useMemo(() => {
    const g: Record<string, Notif[]> = { today: [], yesterday: [], earlier: [] };
    for (const n of visible) g[bucketOf(n.created_at)].push(n);
    return g;
  }, [visible]);

  async function openItem(n: Notif) {
    if (!n.read_at) await mark({ data: { id: n.id } });
    setOpen(false);
    if (n.link) navigate({ to: n.link });
    refreshCount();
  }

  const groupLabel: Record<string, string> = {
    today: ar ? "اليوم" : "Today",
    yesterday: ar ? "أمس" : "Yesterday",
    earlier: ar ? "أقدم" : "Earlier",
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("app_notifications")} className="relative">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute end-1.5 top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side={ar ? "left" : "right"} className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4 text-gold" />
            {t("app_notifications")}
            {unread > 0 && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
                {unread} {ar ? "غير مقروء" : "unread"}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
            {(["all", "unread"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`rounded px-3 py-1 transition ${tab === v ? "bg-gold/15 font-semibold text-gold" : "text-muted-foreground hover:bg-secondary"}`}
              >
                {v === "all" ? (ar ? "الكل" : "All") : (ar ? "غير مقروء" : "Unread")}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={fetchList} aria-label={ar ? "تحديث" : "Refresh"}>
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={unread === 0}
              onClick={async () => { await mark({ data: { all: true } }); fetchList(); }}
            >
              <CheckCheck className="me-1 size-3.5" />{ar ? "تعليم الكل كمقروء" : "Mark all read"}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 4 }).map((_, i) => <LinesSkeleton key={i} lines={3} />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="p-4">
              <EmptyState
                compact
                icon={<Inbox className="size-5" />}
                title={tab === "unread" ? (ar ? "لا شيء غير مقروء" : "Nothing unread") : (ar ? "لا توجد إشعارات" : "No notifications")}
                description={ar
                  ? "ستظهر هنا تذكيرات الجلسات والمواعيد والفواتير وتحديثات القضايا."
                  : "Hearing reminders, deadlines, invoices and case updates will appear here."}
              />
            </div>
          ) : (
            (["today", "yesterday", "earlier"] as const).map((b) =>
              groups[b].length ? (
                <div key={b}>
                  <div className="sticky top-0 z-10 bg-background/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
                    {groupLabel[b]}
                  </div>
                  {groups[b].map((n) => {
                    const Icon = KIND_ICON[n.kind] ?? Bell;
                    return (
                      <div
                        key={n.id}
                        className={`group flex items-start gap-3 border-b px-4 py-3 transition hover:bg-secondary/50 ${!n.read_at ? "bg-gold/[0.06]" : ""}`}
                      >
                        <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${!n.read_at ? "bg-gold/15 text-gold" : "bg-secondary text-muted-foreground"}`}>
                          <Icon className="size-4" />
                        </span>
                        <button onClick={() => openItem(n)} className="min-w-0 flex-1 text-start">
                          <div className="text-sm font-medium leading-tight">{n.title}</div>
                          {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                          <div className="mt-1 text-[10px] text-muted-foreground">{relative(n.created_at, ar)}</div>
                        </button>
                        <div className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
                          {!n.read_at && (
                            <Button size="icon" variant="ghost" className="size-6" onClick={async () => { await mark({ data: { id: n.id } }); fetchList(); }}>
                              <Check className="size-3" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="size-6" onClick={async () => { await del({ data: { id: n.id } }); fetchList(); }}>
                            <X className="size-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null,
            )
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={async () => {
                if (!confirm(ar ? "حذف كل الإشعارات المقروءة؟" : "Delete all read notifications?")) return;
                await Promise.all(items.filter((n) => n.read_at).map((n) => del({ data: { id: n.id } })));
                fetchList();
              }}
            >
              <Trash2 className="me-1 size-3.5" />{ar ? "حذف المقروء" : "Clear read"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
