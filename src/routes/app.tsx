import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { useI18n, type TKey } from "@/lib/i18n";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";
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

const soloItems: NavItem[] = [
  { to: "/app/dashboard", key: "m_dashboard", icon: LayoutDashboard },
  { to: "/app/analytics", key: "m_analytics", icon: BarChart3, perm: "view_financials" },
  { to: "/app/activity", key: "m_activity", icon: History, perm: "manage_members" },
];

const navGroups: NavGroup[] = [
  {
    key: "m_grp_management",
    items: [
      { to: "/app/cases", key: "m_cases", icon: Briefcase, perm: "view_cases" },
      { to: "/app/documents", key: "m_documents", icon: FileText, perm: "view_cases" },
      { to: "/app/clients", key: "m_clients", icon: Building2, perm: "view_clients" },
      { to: "/app/team", key: "m_team", icon: Users, firmOnly: true },
      { to: "/app/workspace", key: "m_workspace", icon: Network, perm: "view_cases" },
      { to: "/app/debt-collection", key: "m_debt_collection", icon: Wallet, perm: "view_financials" },
      { to: "/app/financials", key: "m_financials", icon: Receipt, perm: "view_financials" },
    ],
  },
  {
    key: "m_grp_scheduling",
    items: [
      { to: "/app/deadlines", key: "m_deadlines", icon: AlertTriangle, perm: "view_cases" },
      { to: "/app/calendar", key: "m_calendar", icon: CalendarDays },
      { to: "/app/meetings", key: "m_meetings", icon: Video },
    ],
  },
  {
    key: "m_grp_operations",
    items: [
      { to: "/app/time", key: "m_time", icon: Clock, perm: "view_cases" },
      { to: "/app/research", key: "m_research", icon: Search },
      { to: "/app/drafting", key: "m_drafting", icon: Sparkles, perm: "edit_cases" },
      { to: "/app/live-sessions", key: "m_live_sessions", icon: Mic },
      { to: "/app/messages", key: "m_messages", icon: MessageSquare },
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

function AppLayout() {
  const { t, dir } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { org, loading: orgLoading, can } = useOrg();
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isRtl = dir === "rtl";

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
  const asideWidth = collapsed ? "lg:w-[76px]" : "lg:w-[268px]";

  /* Nav renderers ------------------------------------------------------- */
  function ItemLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
    const Icon = item.icon;
    const active = isActive(item.to);
    return (
      <Link
        to={item.to}
        onClick={onClick}
        title={collapsed ? t(item.key) : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all",
          active
            ? "bg-gold/15 text-gold shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--gold),transparent_60%)]"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          collapsed && "justify-center px-2",
        )}
      >
        {/* Gold gilded rail on the reading edge */}
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-gold transition-opacity",
            isRtl ? "right-0" : "left-0",
            active ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />
        <Icon className={cn("size-[17px] shrink-0", active ? "text-gold" : "opacity-80 group-hover:opacity-100")} />
        {!collapsed && <span className="truncate">{t(item.key)}</span>}
      </Link>
    );
  }

  function GroupLabel({ label }: { label: string }) {
    if (collapsed) {
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
      <nav className="flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
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
      {/* Global ivory canvas with a very faint mashrabiya watermark */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 arabesque-lg opacity-[0.05]"
      />

      <div className="relative flex min-h-screen">
        {/* ───── Desktop sidebar (fixed, teal, gold typography) ───── */}
        <aside
          className={cn(
            "hidden lg:flex flex-col bg-sidebar text-sidebar-foreground",
            sideEdge,
            "border-sidebar-border/70 transition-[width] duration-300 ease-out",
            asideWidth,
            "sticky top-0 h-screen shrink-0",
          )}
        >
          {/* Sidebar surface ornaments */}
          <div aria-hidden className="pointer-events-none absolute inset-0 arabesque-lg opacity-[0.06]" />
          <div aria-hidden className={cn("pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-b from-gold/[0.08] via-transparent to-gold/[0.05]", isRtl ? "left-0" : "right-0")} />
          <CornerFlourish className={cn("absolute top-2 text-gold/60", isRtl ? "right-2 -scale-x-100" : "left-2")} size={22} />
          <CornerFlourish className={cn("absolute bottom-2 text-gold/50", isRtl ? "right-2 -scale-100" : "left-2 -scale-y-100")} size={22} />

          {/* Brand */}
          <div className={cn("relative flex items-center gap-2 border-b border-sidebar-border/70 px-4 py-4", collapsed && "justify-center px-2")}>
            <Link to="/app/dashboard" className="min-w-0 flex-1">
              {collapsed ? (
                <div className="mx-auto grid size-9 place-items-center rounded-lg bg-gold/15 text-gold ring-1 ring-gold/30">
                  <Rosette size={16} />
                </div>
              ) : (
                <BrandMark tone="dark" />
              )}
            </Link>
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="hidden lg:grid place-items-center size-8 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <CollapseIcon className="size-4" />
            </button>
          </div>

          {/* Gold hairline */}
          <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-gold/45 to-transparent" />

          <NavBody />

          {/* Footer: settings */}
          <div className="relative border-t border-sidebar-border/70 p-3">
            <Link
              to="/app/settings"
              title={collapsed ? t("m_settings") : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                isActive("/app/settings") && "bg-gold/15 text-gold",
                collapsed && "justify-center px-2",
              )}
            >
              <Settings className="size-[17px]" />
              {!collapsed && <span>{t("m_settings")}</span>}
            </Link>
          </div>
        </aside>

        {/* ───── Main column ───── */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Top control strip — thin, ornamental, holds mobile trigger + right controls */}
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
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
                  className="w-[280px] border-sidebar-border/70 bg-sidebar p-0 text-sidebar-foreground"
                >
                  <div aria-hidden className="pointer-events-none absolute inset-0 arabesque-lg opacity-[0.06]" />
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
              </div>
            </div>
            {/* Gilded rule under the header */}
            <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
          </header>

          <main className="relative flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-[1500px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
