import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({
  label, value, delta, icon, tone = "default",
}: {
  label: string; value: string; delta?: string;
  icon?: ReactNode; tone?: "default" | "gold" | "success" | "warning";
}) {
  const tones = {
    default: "text-primary bg-primary/10",
    gold: "text-gold bg-gold/15",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/15",
  } as const;
  return (
    <div className="stat-tile card-elev rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && <div className={cn("inline-grid size-9 place-items-center rounded-lg", tones[tone])}>{icon}</div>}
      </div>
      <div className="mt-3 font-serif text-3xl tracking-tight">{value}</div>
      {delta && <div className="mt-1 text-xs text-success">{delta}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    closed: "bg-muted text-muted-foreground",
    urgent: "bg-destructive/15 text-destructive",
    draft: "bg-muted text-muted-foreground",
    review: "bg-warning/15 text-warning",
    signed: "bg-success/15 text-success",
    filed: "bg-primary/10 text-primary",
    paid: "bg-success/15 text-success",
    sent: "bg-primary/10 text-primary",
    overdue: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", map[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}
