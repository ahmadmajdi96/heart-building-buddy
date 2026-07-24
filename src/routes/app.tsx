import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useI18n, type TKey } from "@/lib/i18n";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";
import { GlobalSearch } from "@/components/app/global-search";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { OrgProvider, useOrg, type Permission } from "@/lib/org-context";
import { NotificationBell } from "@/components/app/notification-bell";
import { CornerFlourish } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Briefcase, FileText, Search, Sparkles, CalendarDays,
  Receipt, GraduationCap, BarChart3, Building2, Settings, Clock,
  Gavel, LogOut, Loader2, Mic, Video, Menu, ChevronDown, ChevronsLeft, ChevronsRight,
  AlertTriangle, History, Users, Network, Wallet, MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  component: () => <OrgProvider><AppLayout /></OrgProvider>,
});

type NavItem = { to: string; key: TKey; icon: ComponentType<{ className?: string }>; perm?: Permission; firmOnly?: boolean };
type NavGroup = { key: TKey; items: NavItem[] };

// Flat top-level primary items (no group). Per the pilot readiness spec (§6):
// "flatten Management overload → Dashboard · Cases · Clients · Calendar · Billing ·
// Collections · AI Tools · Settings. Case is the hub."
const soloItems: NavItem[] = [
  { to: "/app/dashboard", key: "m_dashboard", icon: LayoutDashboard },
  { to: "/app/cases", key: "m_cases", icon: Briefcase, perm: "view_cases" },
  { to: "/app/clients", key: "m_clients", icon: Building2, perm: "view_clients" },
  { to: "/app/calendar", key: "m_calendar", icon: CalendarDays },
  { to: "/app/deadlines", key: "m_deadlines", icon: AlertTriangle, perm: "view_cases" },
  { to: "/app/documents", key: "m_documents", icon: FileText, perm: "view_cases" },
  { to: "/app/financials", key: "m_financials", icon: Receipt, perm: "view_financials" },
  { to: "/app/debt-collection", key: "m_debt_collection", icon: Wallet, perm: "view_financials" },
];

const navGroups: NavGroup[] = [
  {
    key: "m_grp_ai_tools",
    items: [
      { to: "/app/research", key: "m_research", icon: Search },
      { to: "/app/drafting", key: "m_drafting", icon: Sparkles, perm: "edit_cases" },
      { to: "/app/live-sessions", key: "m_live_sessions", icon: Mic },
    ],
  },
  {
    key: "m_grp_firm",
    items: [
      { to: "/app/time", key: "m_time", icon: Clock, perm: "view_cases" },
      { to: "/app/meetings", key: "m_meetings", icon: Video },
      { to: "/app/messages", key: "m_messages", icon: MessageSquare },
      { to: "/app/team", key: "m_team", icon: Users, firmOnly: true },
      { to: "/app/workspace", key: "m_workspace", icon: Network, perm: "view_cases" },
      { to: "/app/analytics", key: "m_analytics", icon: BarChart3, perm: "view_financials" },
      { to: "/app/activity", key: "m_activity", icon: History, perm: "manage_members" },
      // Courtroom Simulation and Legal Academy are hidden from the pilot navigation per the
      // readiness spec (§5). Routes remain reachable by URL behind a future feature flag.
    ],
  },
];

/* Islamic 8-point rosette used as sidebar bullet + backdrop watermark */
function Rosette({ className, size = 10 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

const PAGE_BG = ["#fefaf1", "#f1fef3", "#f1f5fe", "#fef1fb"];
function bgForPath(pathname: string) {
  let h = 0;
  for (let i = 0; i < pathname.length; i++) h = (h * 31 + pathname.charCodeAt(i)) >>> 0;
  return PAGE_BG[h % PAGE_BG.length];
}

function LiveClock({ locale }: { locale: "en" | "ar" }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const bcp = locale === "ar" ? "ar-JO" : "en-GB";
  const time = now.toLocaleTimeString(bcp, { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString(bcp, { weekday: "short", day: "2-digit", month: "short" });
  return (
    <div className="hidden md:flex flex-col items-end leading-tight rounded-full border border-border/70 bg-white px-3 py-1 shadow-sm">
      <span className="text-[13px] font-semibold tabular-nums text-foreground">{time}</span>
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{date}</span>
    </div>
  );
}

function AppLayout() {
  const { t, dir, locale } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { org, loading: orgLoading, can } = useOrg();
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const expandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRtl = dir === "rtl";
  const navCollapsed = collapsed && !hoverExpanded;

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) navigate({ to: "/auth" });
      else { setUserEmail(data.session.user.email ?? ""); setChecking(false); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) navigate({ to: "/auth" });
      else setUserEmail(session.user.email ?? "");
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  // Auto sign-out after 30 min inactivity
  useEffect(() => {
    const IDLE_MS = 30 * 60_000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await supabase.auth.signOut();
        navigate({ to: "/auth" });
      }, IDLE_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [navigate]);

  useEffect(() => {
    if (checking || orgLoading) return;
    if (!org && pathname !== "/app/onboarding") navigate({ to: "/app/onboarding" });
  }, [checking, orgLoading, org, pathname, navigate]);

  useEffect(() => {
    return () => {
      if (expandTimer.current) clearTimeout(expandTimer.current);
    };
  }, []);

  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/auth" }); }

  if (checking || orgLoading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  }

  const filterItem = (i: NavItem) => (!i.perm || !org || can(i.perm)) && (!i.firmOnly || org?.type === "firm");
  const visibleSolo = soloItems.filter(filterItem);
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter(filterItem) }))
    .filter((g) => g.items.length > 0);
  const visibleNav: NavItem[] = [...visibleSolo, ...visibleGroups.flatMap((g) => g.items)];
  const isActive = (to: string) => pathname === to || (to !== "/app/dashboard" && pathname.startsWith(to));

  const sideEdge = isRtl ? "border-l" : "border-r";
  const asideWidth = navCollapsed ? "lg:w-[76px]" : "lg:w-[268px]";

  const startHoverExpand = () => {
    if (!collapsed) return;
    if (expandTimer.current) clearTimeout(expandTimer.current);
    expandTimer.current = setTimeout(() => setHoverExpanded(true), 2000);
  };

  const stopHoverExpand = () => {
    if (expandTimer.current) clearTimeout(expandTimer.current);
    expandTimer.current = null;
    setHoverExpanded(false);
  };

  /* Nav renderers ------------------------------------------------------- */
  function ItemLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
    const Icon = item.icon;
    const active = isActive(item.to);
    return (
      <div className="group/item relative">
        <Link
          to={item.to}
          onClick={onClick}
          aria-label={navCollapsed ? t(item.key) : undefined}
          className={cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all overflow-hidden",
            active
              ? "bg-gold/18 text-gold ring-1 ring-gold/40 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--gold),transparent_64%)]"
              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground",
            navCollapsed && "justify-center px-2",
          )}
        >


          <span
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-gold transition-opacity",
              isRtl ? "right-0" : "left-0",
              active ? "opacity-100" : "opacity-0",
            )}
            aria-hidden
          />
          <Icon className={cn("relative z-10 size-[17px] shrink-0", active ? "text-gold" : "opacity-80 group-hover:opacity-100")} />
          {!navCollapsed && <span className="relative z-10 truncate">{t(item.key)}</span>}
        </Link>
        {navCollapsed && (
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 z-50 hidden -translate-y-1/2 rounded-md border border-sidebar-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-elev-2 group-hover/item:block",
              isRtl ? "right-[calc(100%+0.5rem)]" : "left-[calc(100%+0.5rem)]",
            )}
          >
            {t(item.key)}
          </span>
        )}
      </div>
    );
  }


  function GroupLabel({ label }: { label: string }) {
    if (navCollapsed) {
      return <div className="my-3 flex justify-center text-gold/50"><Rosette size={9} /></div>;
    }
    return (
      <div className="mt-5 flex items-center gap-2 px-3 pb-1.5">
        <Rosette size={9} className="text-gold/70" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/45">{label}</span>
        <span className="ms-2 h-px flex-1 bg-gradient-to-r from-sidebar-border/60 to-transparent rtl:from-transparent rtl:to-sidebar-border/60" />
      </div>
    );
  }

  function NavBody({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className={cn("flex-1 px-3 py-2 [scrollbar-width:thin]", navCollapsed ? "overflow-visible" : "overflow-y-auto")}>
        <ul className="space-y-0.5">
          {visibleSolo.map((i) => <li key={i.to}><ItemLink item={i} onClick={onNavigate} /></li>)}
        </ul>
        {visibleGroups.map((g) => (
          <div key={g.key}>
            <GroupLabel label={t(g.key)} />
            <ul className="space-y-0.5">
              {g.items.map((i) => <li key={i.to}><ItemLink item={i} onClick={onNavigate} /></li>)}
            </ul>
          </div>
        ))}
      </nav>
    );
  }

  const CollapseIcon = collapsed ? (isRtl ? ChevronsLeft : ChevronsRight) : (isRtl ? ChevronsRight : ChevronsLeft);

  return (
    <div className="relative min-h-screen bg-background text-foreground">

      <div className="relative flex min-h-screen">

        {/* ───── Desktop sidebar (fixed, teal, gold typography) ───── */}
        <aside
          onMouseEnter={startHoverExpand}
          onMouseLeave={stopHoverExpand}
          className={cn(
            "hidden lg:flex flex-col text-sidebar-foreground relative",
            sideEdge,
            "border-sidebar-border/70 transition-[width] duration-300 ease-out",
            asideWidth,
            "sticky top-0 h-screen shrink-0",
          )}
          style={{ background: "linear-gradient(180deg, var(--sidebar) 0%, var(--sidebar-deep) 100%)" }}
        >

          {/* Sidebar surface ornaments */}
          <div aria-hidden className="pointer-events-none absolute inset-0 arabesque opacity-40" />

          <div aria-hidden className={cn("pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-b from-gold/[0.08] via-transparent to-gold/[0.05]", isRtl ? "left-0" : "right-0")} />
          <CornerFlourish className={cn("absolute top-2 text-gold/60", isRtl ? "right-2 -scale-x-100" : "left-2")} size={22} />
          <CornerFlourish className={cn("absolute bottom-2 text-gold/50", isRtl ? "right-2 -scale-100" : "left-2 -scale-y-100")} size={22} />

          {/* Brand */}
          <div className={cn(
            "relative flex items-center gap-2 border-b border-sidebar-border/70 px-4 py-4",
            navCollapsed && "flex-col justify-center gap-2 px-2 py-3",
          )}>
            <Link to="/app/dashboard" className={cn("min-w-0", navCollapsed ? "flex-none" : "flex-1")} aria-label="Mohkam dashboard">
              {navCollapsed ? (
                <BrandMark tone="dark" size="sm" markOnly />
              ) : (
                <BrandMark tone="dark" />
              )}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setHoverExpanded(false);
                setCollapsed((v) => !v);
              }}
              className={cn(
                "hidden lg:grid place-items-center rounded-md text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                navCollapsed ? "size-7" : "size-8",
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <CollapseIcon className="size-4" />
            </Button>
          </div>

          {/* Gold hairline */}
          <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-gold/45 to-transparent" />

          <NavBody />

          {/* Footer: settings */}
          <div className="relative border-t border-sidebar-border/70 p-3">
            <ItemLink item={{ to: "/app/settings", key: "m_settings", icon: Settings }} />
          </div>
        </aside>

        {/* ───── Main column ───── */}
        <div className="relative flex min-w-0 flex-1 flex-col" style={{ backgroundColor: bgForPath(pathname) }}>
          {/* Top control strip — thin, ornamental, holds mobile trigger + right controls */}
          <header className="sticky top-0 z-30 border-b border-border/70 backdrop-blur" style={{ backgroundColor: `color-mix(in oklch, ${bgForPath(pathname)} 85%, white)` }}>
            <div className="flex h-14 items-center gap-2 px-4 md:px-6">
              {/* Mobile menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side={isRtl ? "right" : "left"}
                  className="w-[280px] border-sidebar-border/70 p-0 text-sidebar-foreground"
                  style={{ background: "linear-gradient(180deg, var(--sidebar) 0%, var(--sidebar-deep) 100%)" }}
                >

                  <div aria-hidden className="pointer-events-none absolute inset-0 arabesque-lg opacity-[0.18]" />
                  <SheetHeader className="relative border-b border-sidebar-border/70 p-4">
                    <SheetTitle><BrandMark tone="dark" /></SheetTitle>
                  </SheetHeader>
                  <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-gold/45 to-transparent" />
                  <div className="relative flex h-[calc(100vh-64px)] flex-col">
                    <NavBody onNavigate={() => setMobileOpen(false)} />
                    <div className="border-t border-sidebar-border/70 p-3">
                      <Link to="/app/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent">
                        <Settings className="size-4" /> {t("m_settings")}
                      </Link>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Mobile brand */}
              <Link to="/app/dashboard" className="lg:hidden">
                <BrandMark />
              </Link>

              <div className="ms-auto flex items-center gap-1.5">
                <LangToggle />
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full p-1 pr-2 ring-1 ring-transparent transition hover:ring-border focus:outline-none focus-visible:ring-gold/40">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{(userEmail[0] ?? "L").toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <ChevronDown className="size-3.5 text-muted-foreground hidden md:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {org && (
                      <>
                        <DropdownMenuLabel className="font-normal">
                          <div className="text-sm font-semibold truncate">{org.display_name || org.legal_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/app/settings" className="flex items-center gap-2"><Settings className="size-4" />{t("m_settings")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                      <LogOut className="size-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="mx-1 hidden md:block h-6 w-px bg-border/70" aria-hidden />
                <GlobalSearch lang={locale === "ar" ? "ar" : "en"} />
                <LiveClock locale={locale === "ar" ? "ar" : "en"} />
              </div>
            </div>
            {/* Gilded rule under the header */}
            <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
          </header>

          <main className="relative flex-1 p-4 md:p-8 transition-colors" style={{ backgroundColor: bgForPath(pathname) }}>
            <div className="mx-auto max-w-[1500px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
