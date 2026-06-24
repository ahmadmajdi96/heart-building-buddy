import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check, CheckCheck, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
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

export function NotificationBell() {
  const { t } = useI18n();
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

  async function refresh() {
    try {
      const c = await count();
      setUnread(c.count);
    } catch { /* noop */ }
  }
  async function fetchList() {
    setLoading(true);
    try {
      const rows = (await load({ data: { limit: 30 } })) as Notif[];
      setItems(rows);
      const c = await count();
      setUnread(c.count);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    refresh();
    // generate deadline reminders + refresh every 5min
    (async () => { try { await runRem(); refresh(); } catch { /* noop */ } })();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { if (open) fetchList(); }, [open]);

  async function openItem(n: Notif) {
    if (!n.read_at) { await mark({ data: { id: n.id } }); }
    setOpen(false);
    if (n.link) navigate({ to: n.link });
    refresh();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("app_notifications")} className="relative">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute end-1.5 top-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold text-white grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t("app_notifications")}</span>
          <Button variant="ghost" size="sm" onClick={async () => { await mark({ data: { all: true } }); fetchList(); }}>
            <CheckCheck className="size-3.5 mr-1" /> Mark all read
          </Button>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="p-6 grid place-items-center text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : items.map((n) => (
            <div key={n.id} className={`group flex items-start gap-2 border-b px-3 py-2.5 hover:bg-secondary/60 ${!n.read_at ? "bg-gold/5" : ""}`}>
              <button onClick={() => openItem(n)} className="flex-1 text-start">
                <div className="text-sm font-medium leading-tight">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </button>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100">
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
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
