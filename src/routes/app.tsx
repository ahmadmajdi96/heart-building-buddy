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
import {
  LayoutDashboard, Briefcase, FileText, Search, Sparkles, CalendarDays,
  Receipt, GraduationCap, BarChart3, Building2, Settings, Clock,
  ArrowLeft, Gavel, LogOut, Loader2, Mic, Video, Menu, ChevronDown, MoreHorizontal,
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
      { to: "/app/courtroom", key: "m_courtroom", icon: Gavel },
      { to: "/app/drafting", key: "m_drafting", icon: Sparkles, perm: "edit_cases" },
      { to: "/app/live-sessions", key: "m_live_sessions", icon: Mic },
      { to: "/app/education", key: "m_education", icon: GraduationCap },
    ],
  },
];

const allNavItems: NavItem[] = [...soloItems, ...navGroups.flatMap((g) => g.items)];


function AppLayout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { org, loading: orgLoading, can } = useOrg();
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Auto sign-out after 30 minutes of inactivity (US-029)
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
    return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  }

  const filterItem = (i: NavItem) => (!i.perm || !org || can(i.perm)) && (!i.firmOnly || org?.type === "firm");
  const visibleSolo = soloItems.filter(filterItem);
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter(filterItem) }))
    .filter((g) => g.items.length > 0);
  const visibleNav: NavItem[] = [...visibleSolo, ...visibleGroups.flatMap((g) => g.items)];
  const isActive = (to: string) => pathname === to || (to !== "/app/dashboard" && pathname.startsWith(to));
  const groupActive = (g: NavGroup) => g.items.some((i) => isActive(i.to));

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Top brand bar */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 md:px-6">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b p-5">
                <SheetTitle><BrandMark /></SheetTitle>
              </SheetHeader>
              <nav className="p-3">
                <ul className="space-y-0.5">
                  {visibleNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className={[
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                            isActive(item.to)
                              ? "bg-gold/15 text-gold ring-1 ring-gold/30"
                              : "text-foreground/75 hover:bg-secondary",
                          ].join(" ")}
                        >
                          <Icon className="size-4" /><span>{t(item.key)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="my-3 h-px bg-border" />
                <Link to="/app/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/75 hover:bg-secondary">
                  <Settings className="size-4" />{t("m_settings")}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/app/dashboard" className="flex items-center gap-2 shrink-0">
            <BrandMark />
          </Link>

          <div className="h-7 w-px bg-border hidden lg:block mx-1" />

          {/* Primary nav (desktop) */}
          <nav className="hidden lg:flex items-center gap-1 min-w-0 flex-1 overflow-x-auto scrollbar-none">
            {visibleSolo.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    "group relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "text-foreground bg-gold/12 ring-1 ring-gold/30"
                      : "text-foreground/65 hover:text-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  <Icon className="size-4 opacity-80 group-hover:opacity-100" />
                  <span>{t(item.key)}</span>
                </Link>
              );
            })}
            {visibleGroups.map((group) => {
              const active = groupActive(group);
              return (
                <DropdownMenu key={group.key}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={[
                        "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                        active
                          ? "text-foreground bg-gold/12 ring-1 ring-gold/30"
                          : "text-foreground/65 hover:text-foreground hover:bg-secondary",
                      ].join(" ")}
                    >
                      <span>{t(group.key)}</span>
                      <ChevronDown className="size-3.5 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.to} asChild>
                          <Link to={item.to} className="flex items-center gap-2">
                            <Icon className="size-4 opacity-70" /> {t(item.key)}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>


          {/* Right actions */}
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
        <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      </header>

      <main className="mx-auto max-w-[1600px] p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
