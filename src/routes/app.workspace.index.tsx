import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Users, Briefcase, ChevronRight, Crown } from "lucide-react";
import { toast } from "sonner";
import { getWorkspaceOverview } from "@/lib/workspace.functions";

export const Route = createFileRoute("/app/workspace/")({
  component: WorkspacePage,
  validateSearch: (s: Record<string, unknown>) => ({
    user: typeof s.user === "string" ? s.user : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function initials(s?: string | null) {
  if (!s) return "·";
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "·";
}

const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  closed: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  won: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  lost: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

function WorkspacePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const load = useServerFn(getWorkspaceOverview);

  const [data, setData] = useState<{ teammates: any[]; cases: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [directoryQ, setDirectoryQ] = useState("");

  useEffect(() => {
    setLoading(true);
    load()
      .then((r) => setData(r as any))
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const q = search.q ?? "";
  const activeUser = search.user;

  const teammates = data?.teammates ?? [];
  const cases = data?.cases ?? [];

  const filteredTeammates = useMemo(() => {
    const s = directoryQ.trim().toLowerCase();
    if (!s) return teammates;
    return teammates.filter((t: any) =>
      (t.full_name ?? "").toLowerCase().includes(s) ||
      (t.email ?? "").toLowerCase().includes(s)
    );
  }, [teammates, directoryQ]);

  const filteredCases = useMemo(() => {
    return cases.filter((c: any) => {
      if (activeUser && !c.members.some((m: any) => m.user_id === activeUser)) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (c.title ?? "").toLowerCase().includes(s)
        || (c.case_number ?? "").toLowerCase().includes(s)
        || (c.clients?.name ?? "").toLowerCase().includes(s);
    });
  }, [cases, activeUser, q]);

  const activeTeammate = teammates.find((t: any) => t.user_id === activeUser);

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? "مساحة العمل" : "Workspace"}
        subtitle={ar
          ? "دليل الفريق والقضايا المشتركة ومواردها في مكان واحد."
          : "Team directory, shared cases and their resources — in one place."}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left: teammates directory */}
        <Card className="h-fit overflow-hidden">
          <div className="border-b p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-gold" />
              {ar ? "الفريق" : "Teammates"}
              <span className="ms-auto text-xs font-normal text-muted-foreground">{teammates.length}</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={directoryQ}
                onChange={(e) => setDirectoryQ(e.target.value)}
                placeholder={ar ? "ابحث…" : "Search…"}
                className="h-9 ps-9"
              />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto py-2">
            <button
              type="button"
              onClick={() => navigate({ search: (prev: any) => ({ ...prev, user: undefined }) })}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-secondary/50 ${!activeUser ? "bg-secondary/70 font-medium" : ""}`}
            >
              <div className="grid size-8 place-items-center rounded-full bg-gold/15 text-gold">
                <Briefcase className="size-4" />
              </div>
              <span>{ar ? "كل القضايا" : "All cases"}</span>
              <span className="ms-auto text-xs text-muted-foreground">{cases.length}</span>
            </button>

            {filteredTeammates.map((t: any) => {
              const casesForUser = cases.filter((c: any) => c.members.some((m: any) => m.user_id === t.user_id)).length;
              const active = activeUser === t.user_id;
              return (
                <button
                  key={t.user_id}
                  type="button"
                  onClick={() => navigate({ search: (prev: any) => ({ ...prev, user: t.user_id }) })}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-secondary/50 ${active ? "bg-secondary/70" : ""}`}
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-gold/15 text-xs text-gold">{initials(t.full_name || t.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate ${active ? "font-medium" : ""}`}>
                      {t.full_name || t.email || t.user_id?.slice(0, 8)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground capitalize">{t.role}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{casesForUser}</span>
                </button>
              );
            })}
            {filteredTeammates.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">{ar ? "لا نتائج" : "No matches"}</div>
            )}
          </div>
        </Card>

        {/* Right: cases hub */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            <div className="text-sm font-semibold">
              {activeTeammate
                ? (ar ? `قضايا ${activeTeammate.full_name || activeTeammate.email || ""}` : `Cases with ${activeTeammate.full_name || activeTeammate.email || ""}`)
                : (ar ? "كل قضايا المكتب" : "All firm cases")}
              <span className="ms-2 text-xs font-normal text-muted-foreground">({filteredCases.length})</span>
            </div>
            <div className="relative ms-auto w-72 max-w-full">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => navigate({ search: (prev: any) => ({ ...prev, q: e.target.value || undefined }) })}
                placeholder={ar ? "ابحث بعنوان أو رقم أو عميل…" : "Search by title, #, or client…"}
                className="h-9 ps-9"
              />
            </div>
            {activeTeammate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate({ search: (prev: any) => ({ ...prev, user: undefined }) })}
              >
                {ar ? "مسح المرشح" : "Clear filter"}
              </Button>
            )}
          </div>

          {filteredCases.length === 0 ? (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              {ar ? "لا قضايا تطابق التصفية." : "No cases match this filter."}
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredCases.map((c: any) => (
                <Link
                  key={c.id}
                  to="/app/workspace/$caseId"
                  params={{ caseId: c.id }}
                  className="group block rounded-xl border bg-card p-4 transition hover:border-gold/50 hover:shadow-md"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 font-semibold">{c.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {c.case_number || "—"} · {c.clients?.name || (ar ? "بدون عميل" : "No client")}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-gold" />
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_COLOR[c.status] ?? "bg-muted"}`}>
                      {c.status}
                    </span>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{c.priority}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {c.members.slice(0, 4).map((m: any) => (
                        <Avatar key={m.user_id} className="size-7 border-2 border-card">
                          <AvatarFallback className="bg-gold/15 text-[10px] text-gold">{initials(m.full_name)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {c.members.length > 4 && (
                        <div className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary text-[10px] font-medium">
                          +{c.members.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {c.members.some((m: any) => m.role === "owner") && <Crown className="size-3 text-gold" />}
                      {c.member_count} {ar ? "عضو" : c.member_count === 1 ? "member" : "members"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
