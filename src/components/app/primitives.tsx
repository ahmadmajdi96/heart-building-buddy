import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <div className="mb-2 h-px w-12 bg-gradient-to-r from-gold to-transparent" />
        <h1 className="font-serif text-3xl tracking-tight text-primary md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

export function StatTile({
  label, value, delta, icon, tone = "default", index = 0,
}: {
  label: string; value: string; delta?: string;
  icon?: ReactNode; tone?: "default" | "gold" | "success" | "warning"; index?: number;
}) {
  const tones = {
    default: "text-primary bg-primary/10 ring-primary/15",
    gold: "text-gold bg-gold/15 ring-gold/30",
    success: "text-success bg-success/10 ring-success/20",
    warning: "text-warning bg-warning/15 ring-warning/25",
  } as const;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow hover:shadow-[0_12px_40px_-12px_oklch(0.26_0.08_258/0.25)]"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br from-gold/15 to-transparent blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        {icon && <div className={cn("inline-grid size-9 place-items-center rounded-lg ring-1", tones[tone])}>{icon}</div>}
      </div>
      <div className="mt-3 font-serif text-3xl tracking-tight text-primary">{value}</div>
      {delta && <div className="mt-1 text-xs text-success">{delta}</div>}
    </motion.div>
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
