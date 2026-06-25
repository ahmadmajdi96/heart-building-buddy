import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative grid size-9 place-items-center rounded-lg",
          tone === "light"
            ? "bg-primary text-primary-foreground"
            : "bg-gold/15 text-gold ring-1 ring-gold/30",
        )}
      >
        <Scale className="size-5" strokeWidth={2.25} />
        <span className="absolute -bottom-px left-1/2 h-px w-5 -translate-x-1/2 bg-gold" />
      </div>
      <div className="leading-tight">
        <div
          className={cn(
            "font-semibold tracking-tight",
            tone === "light" ? "text-foreground" : "text-sidebar-foreground",
          )}
        >
          محكم
        </div>
        <div
          className={cn(
            "text-[10px] uppercase tracking-[0.2em]",
            tone === "light" ? "text-muted-foreground" : "text-sidebar-foreground/60",
          )}
        >
          mohkam
        </div>
      </div>
    </div>
  );
}
