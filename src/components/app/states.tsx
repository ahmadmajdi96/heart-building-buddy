import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { Inbox } from "lucide-react";

/**
 * Standard empty state — ornamented with the brand rosette so blank tables
 * still feel like part of the manuscript language.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 text-center",
        compact ? "gap-2 px-6 py-8" : "gap-3 px-8 py-14",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-xl arabesque opacity-[0.07]" aria-hidden />
      <div className="relative flex size-12 items-center justify-center rounded-full border border-gold/40 bg-gold/5 text-gold">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <div className="relative space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="relative pt-1">{action}</div> : null}
    </div>
  );
}

/** Convenience empty state with a primary call to action. */
export function EmptyStateCTA({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
  icon?: ReactNode;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={<Button size="sm" onClick={onAction}>{actionLabel}</Button>}
    />
  );
}

/** Error variant, used by list views when a fetch fails. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { locale } = useI18n();
  return (
    <EmptyState
      title={locale === "ar" ? "تعذّر تحميل البيانات" : "Couldn't load this"}
      description={message}
      action={
        onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            {locale === "ar" ? "إعادة المحاولة" : "Try again"}
          </Button>
        ) : undefined
      }
    />
  );
}

/* ------------------------------ Skeletons ------------------------------ */

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y" aria-busy>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-3 px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4" style={{ width: `${c === 0 ? 80 : 45 + ((r + c) % 4) * 12}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

export function LinesSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-busy>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${95 - i * 12}%` }} />
      ))}
    </div>
  );
}
