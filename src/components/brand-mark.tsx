import { cn } from "@/lib/utils";
import logoSrc from "@/assets/mohkam-logo.jpeg";

export function BrandMark({
  className,
  tone = "light",
  size = "md",
}: {
  className?: string;
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const wordSize =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-white ring-1 ring-onyx/10 shadow-sm",
          dims,
        )}
      >
        <img
          src={logoSrc}
          alt="Mohkam"
          className="absolute inset-0 h-full w-full object-cover scale-[1.65]"
          draggable={false}
        />
      </div>
      <div className="leading-tight">
        <div
          className={cn(
            "font-semibold tracking-tight",
            wordSize,
            tone === "light" ? "text-foreground" : "text-pearl",
          )}
        >
          Mohkam
        </div>
        <div
          className={cn(
            "text-[11px] tracking-[0.18em]",
            tone === "light" ? "text-gold" : "text-gold",
          )}
        >
          محكم
        </div>
      </div>
    </div>
  );
}
