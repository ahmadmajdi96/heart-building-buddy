import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { useI18n, type TKey } from "@/lib/i18n";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { OrgProvider, useOrg, type Permission } from "@/lib/org-context";
import {
  LayoutDashboard, Briefcase, FileText, Search, Sparkles, CalendarDays,
  Receipt, GraduationCap, BarChart3, Building2, Settings, Bell,
  ArrowLeft, Gavel, LogOut, Loader2, Mic, Video,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  component: () => <OrgProvider><AppLayout /></OrgProvider>,
});

type NavItem = { to: string; key: TKey; icon: ComponentType<{ className?: string }>; perm?: Permission };

const navItems: NavItem[] = [
  { to: "/app/dashboard", key: "m_dashboard", icon: LayoutDashboard },
  { to: "/app/cases", key: "m_cases", icon: Briefcase, perm: "view_cases" },
  { to: "/app/documents", key: "m_documents", icon: FileText, perm: "view_cases" },
  { to: "/app/research", key: "m_research", icon: Search },
  { to: "/app/drafting", key: "m_drafting", icon: Sparkles, perm: "edit_cases" },
  { to: "/app/calendar", key: "m_calendar", icon: CalendarDays },
  { to: "/app/courtroom", key: "m_courtroom", icon: Gavel },
  { to: "/app/live-sessions", key: "m_live_sessions", icon: Mic },
  { to: "/app/meetings", key: "m_meetings", icon: Video },
  { to: "/app/financials", key: "m_financials", icon: Receipt, perm: "view_financials" },
  { to: "/app/clients", key: "m_clients", icon: Building2, perm: "view_clients" },
  { to: "/app/education", key: "m_education", icon: GraduationCap },
  { to: "/app/analytics", key: "m_analytics", icon: BarChart3, perm: "view_financials" },
];

function AppLayout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { org, loading: orgLoading, can } = useOrg();
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState("");

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

  // Redirect to onboarding once we know there's no org
  useEffect(() => {
    if (checking || orgLoading) return;
    if (!org && pathname !== "/app/onboarding") navigate({ to: "/app/onboarding" });
  }, [checking, orgLoading, org, pathname, navigate]);

  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/auth" }); }

  if (checking || orgLoading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;
  }

  const visibleNav = navItems.filter((i) => !i.perm || !org || can(i.perm));

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <div className="border-b border-sidebar-border p-5">
            <Link to="/app/dashboard"><BrandMark tone="dark" /></Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-0.5">
              {visibleNav.map((item) => {
                const active = pathname === item.to || (item.to !== "/app/dashboard" && pathname.startsWith(item.to));
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link to={item.to} className={[
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-gold/15 text-gold ring-1 ring-gold/25"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    ].join(" ")}>
                      <Icon className="size-4" /><span>{t(item.key)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="my-4 h-px bg-sidebar-border" />
            <Link to="/app/settings" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Settings className="size-4" />{t("m_settings")}
            </Link>
          </nav>

          {org && (
            <div className="border-t border-sidebar-border p-4">
              <div className="rounded-lg bg-sidebar-accent/60 p-3 text-xs text-sidebar-foreground/70">
                <div className="font-semibold text-sidebar-foreground truncate">{org.display_name || org.legal_name}</div>
                <div className="mt-1 capitalize">{org.type === "firm" ? (t("brand") && "Law firm") : "Solo lawyer"}</div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t("app_search")} className="h-10 ps-9 bg-secondary/60 border-transparent focus-visible:bg-background" />
            </div>
            <div className="ms-auto flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link to="/"><ArrowLeft className="size-4" />{t("app_back_site")}</Link>
              </Button>
              <LangToggle />
              <Button variant="ghost" size="icon" aria-label={t("app_notifications")} className="relative">
                <Bell className="size-4" />
                <span className="absolute end-2 top-2 size-1.5 rounded-full bg-destructive" />
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
              <Avatar className="size-9 ring-2 ring-border">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{(userEmail[0] ?? "L").toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
