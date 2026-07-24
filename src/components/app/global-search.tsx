import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  Users,
  Briefcase,
  FileText,
  Receipt,
  Scale,
  Plus,
  LayoutDashboard,
  CalendarDays,
  Gavel,
  MessageSquare,
  Settings,
  Wallet,
  BookOpen,
  Video,
  Clock,
  Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { globalSearch, type GlobalSearchHit } from "@/lib/global-search.functions";

const ICONS: Record<GlobalSearchHit["type"], any> = {
  client: Users,
  case: Briefcase,
  invoice: Receipt,
  document: FileText,
  debt_case: Scale,
};

const GROUP_LABEL: Record<GlobalSearchHit["type"], { en: string; ar: string }> = {
  client: { en: "Clients", ar: "العملاء" },
  case: { en: "Cases", ar: "القضايا" },
  invoice: { en: "Invoices", ar: "الفواتير" },
  document: { en: "Documents", ar: "المستندات" },
  debt_case: { en: "Debt collection", ar: "التحصيل" },
};

type QuickAction = {
  labelEn: string;
  labelAr: string;
  to: string;
  icon: any;
  keywords?: string;
  search?: Record<string, string>;
};

const CREATE_ACTIONS: QuickAction[] = [
  { labelEn: "New client", labelAr: "عميل جديد", to: "/app/clients", icon: Users, search: { create: "1" }, keywords: "create add customer" },
  { labelEn: "New case", labelAr: "قضية جديدة", to: "/app/cases", icon: Briefcase, search: { create: "1" }, keywords: "matter file open" },
  { labelEn: "New invoice", labelAr: "فاتورة جديدة", to: "/app/financials", icon: Receipt, search: { create: "invoice" }, keywords: "billing tax" },
  { labelEn: "Upload document", labelAr: "رفع مستند", to: "/app/documents", icon: FileText, search: { create: "1" }, keywords: "file upload pdf" },
  { labelEn: "New debt case", labelAr: "قضية تحصيل", to: "/app/debt-collection", icon: Scale, search: { create: "1" }, keywords: "collection" },
  { labelEn: "Schedule meeting", labelAr: "جدولة اجتماع", to: "/app/meetings", icon: Video, search: { create: "1" }, keywords: "meeting session" },
];

const OPEN_ACTIONS: QuickAction[] = [
  { labelEn: "Dashboard", labelAr: "لوحة القيادة", to: "/app/dashboard", icon: LayoutDashboard },
  { labelEn: "Clients", labelAr: "العملاء", to: "/app/clients", icon: Users },
  { labelEn: "Cases", labelAr: "القضايا", to: "/app/cases", icon: Briefcase },
  { labelEn: "Debt collection", labelAr: "التحصيل", to: "/app/debt-collection", icon: Scale },
  { labelEn: "Documents", labelAr: "المستندات", to: "/app/documents", icon: FileText },
  { labelEn: "Financials", labelAr: "الماليات", to: "/app/financials", icon: Wallet },
  { labelEn: "Calendar", labelAr: "التقويم", to: "/app/calendar", icon: CalendarDays },
  { labelEn: "Deadlines", labelAr: "المواعيد النهائية", to: "/app/deadlines", icon: Clock },
  { labelEn: "Courtroom", labelAr: "قاعة المحكمة", to: "/app/courtroom", icon: Gavel },
  { labelEn: "Meetings", labelAr: "الاجتماعات", to: "/app/meetings", icon: Video },
  { labelEn: "Messages", labelAr: "الرسائل", to: "/app/messages", icon: MessageSquare },
  { labelEn: "Activity", labelAr: "النشاط", to: "/app/activity", icon: Bell },
  { labelEn: "Education", labelAr: "التعليم", to: "/app/education", icon: BookOpen },
  { labelEn: "Settings", labelAr: "الإعدادات", to: "/app/settings", icon: Settings },
];

export function GlobalSearch({ lang = "en" }: { lang?: "en" | "ar" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const run = useServerFn(globalSearch);
  const seq = useRef(0);
  const isAr = lang === "ar";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        const editable = (e.target as HTMLElement)?.isContentEditable;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && !editable) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) { setQ(""); setHits([]); }
  }, [open]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setHits([]); setLoading(false); return; }
    const mySeq = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await run({ data: { q: query } });
        if (mySeq === seq.current) setHits(res);
      } catch {
        if (mySeq === seq.current) setHits([]);
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, run]);

  const grouped = useMemo(() => {
    const g: Record<string, GlobalSearchHit[]> = {};
    for (const h of hits) (g[h.type] ||= []).push(h);
    return g;
  }, [hits]);

  const go = (to: string, search?: Record<string, string>) => {
    setOpen(false);
    setQ("");
    navigate({ to, search: search as any });
  };

  const goHref = (href: string) => {
    setOpen(false);
    setQ("");
    navigate({ to: href });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group hidden md:inline-flex h-9 min-w-[240px] items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-gold/40"
        aria-label={isAr ? "بحث شامل" : "Search everywhere"}
      >
        <Search className="size-4" />
        <span className="flex-1 text-start">{isAr ? "ابحث في كل شيء…" : "Search everything…"}</span>
        <kbd className="pointer-events-none rounded border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      <button
        type="button"
        className="md:hidden inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        onClick={() => setOpen(true)}
        aria-label={isAr ? "بحث" : "Search"}
      >
        <Search className="size-5" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={isAr ? "ابحث أو أنشئ — جرّب «قضية جديدة»، «فاتورة»…" : "Search or create — try 'new case', 'invoice', 'client'…"}
          value={q}
          onValueChange={setQ}
        />
        <CommandList className="max-h-[520px]">
          {!q && (
            <>
              <CommandGroup heading={isAr ? "إنشاء" : "Create"}>
                {CREATE_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <CommandItem
                      key={`create-${a.to}-${a.labelEn}`}
                      value={`create ${a.labelEn} ${a.labelAr} ${a.keywords ?? ""}`}
                      onSelect={() => go(a.to, a.search)}
                    >
                      <Plus className="me-2 size-4 text-gold" />
                      <span>{isAr ? a.labelAr : a.labelEn}</span>
                      <Icon className="ms-auto size-3.5 text-muted-foreground" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading={isAr ? "الانتقال إلى" : "Jump to"}>
                {OPEN_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <CommandItem
                      key={`jump-${a.to}`}
                      value={`${a.labelEn} ${a.labelAr}`}
                      onSelect={() => go(a.to)}
                    >
                      <Icon className="me-2 size-4 text-muted-foreground" />
                      <span>{isAr ? a.labelAr : a.labelEn}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {q && (
            <>
              {loading && q.length >= 2 && (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                  <Search className="size-4 animate-pulse" />
                  {isAr ? "جارٍ البحث…" : "Searching…"}
                </div>
              )}
              {!loading && q.length >= 2 && hits.length === 0 && (
                <CommandEmpty>{isAr ? `لا نتائج لـ "${q}"` : `No matches for "${q}"`}</CommandEmpty>
              )}
              {!loading && q.length < 2 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {isAr ? "اكتب حرفين على الأقل للبحث." : "Type at least 2 characters."}
                </div>
              )}
              {Object.entries(grouped).map(([type, items], idx) => {
                const Icon = ICONS[type as GlobalSearchHit["type"]];
                const label = GROUP_LABEL[type as GlobalSearchHit["type"]][isAr ? "ar" : "en"];
                return (
                  <div key={type}>
                    {idx > 0 && <CommandSeparator />}
                    <CommandGroup heading={label}>
                      {items.map((h) => (
                        <CommandItem
                          key={`${h.type}-${h.id}`}
                          value={`${h.type}-${h.id}-${h.title}`}
                          onSelect={() => goHref(h.href)}
                          className="group"
                        >
                          <Icon className="me-2 size-4 text-muted-foreground group-aria-selected:text-gold" />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm">{h.title}</span>
                            {h.subtitle && (
                              <span className="truncate text-xs text-muted-foreground">{h.subtitle}</span>
                            )}
                          </div>
                          <Badge variant="outline" className="ms-2 text-[10px] uppercase">
                            {label}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </div>
                );
              })}
            </>
          )}
        </CommandList>
        <div className="border-t px-3 py-2 text-[11px] text-muted-foreground flex justify-between">
          <span>
            {isAr ? "نصيحة: استخدم" : "Tip: press"}{" "}
            <kbd className="rounded border px-1">↑</kbd> <kbd className="rounded border px-1">↓</kbd>{" "}
            {isAr ? "للتنقل" : "to navigate"}
          </span>
          <span>
            <kbd className="rounded border px-1">/</kbd> {isAr ? "أو" : "or"}{" "}
            <kbd className="rounded border px-1">⌘</kbd> <kbd className="rounded border px-1">K</kbd>
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
