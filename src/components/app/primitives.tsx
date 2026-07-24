import { type ReactNode, type SVGProps } from "react";
import { motion, useMotionValue, useTransform, animate, useInView, useReducedMotion } from "@/components/motion-lite";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Living-Manuscript ornaments — recurring brand motifs across app   */
/* ------------------------------------------------------------------ */

// Illuminated-manuscript corner flourish (top-left / mirror for RTL via CSS flip).
// Kept as inline SVG so it inherits `currentColor` (usually gold on ivory).
export function CornerFlourish({
  className,
  size = 28,
  ...rest
}: { className?: string; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      aria-hidden
      {...rest}
    >
      <path d="M2 2 H26" strokeLinecap="round" />
      <path d="M2 2 V26" strokeLinecap="round" />
      <path d="M2 10 Q16 10 16 24" />
      <path d="M10 2 Q10 16 24 16" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none" />
      <path d="M22 22 L30 30" strokeLinecap="round" opacity="0.55" />
      <path d="M30 30 l3 -1 M30 30 l-1 3" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

// Horizontal ornamental rule with a central 8-point star — used to open a heading.
export function OrnamentalRule({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-gold", className)} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/70 to-gold/70" />
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.1">
        <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/70 to-gold/70" />
    </div>
  );
}

// Full-width mashrabiya lattice divider between sections. Draws in on scroll.
export function LatticeDivider({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  return (
    <div className={cn("pointer-events-none relative flex items-center justify-center py-6", className)} aria-hidden>
      <span className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      <svg
        ref={ref}
        viewBox="0 0 240 40"
        className="relative h-10 w-auto text-gold/70"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Central 8-point rosette + flanking arabesques */}
        <g style={{
          strokeDasharray: 600,
          strokeDashoffset: reduce ? 0 : inView ? 0 : 600,
          transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)",
        }}>
          <circle cx="120" cy="20" r="12" />
          <path d="M120 4 L124 16 L136 20 L124 24 L120 36 L116 24 L104 20 L116 16 Z" />
          <path d="M108 20 A12 12 0 0 1 132 20" />
          <path d="M108 20 A12 12 0 0 0 132 20" />
          {/* left arabesque */}
          <path d="M96 20 q -12 -12 -24 0 q 12 12 24 0 z" />
          <path d="M72 20 q -12 -8 -20 0 q 8 8 20 0 z" opacity="0.7" />
          <circle cx="52" cy="20" r="1.5" fill="currentColor" stroke="none" />
          {/* right arabesque */}
          <path d="M144 20 q 12 -12 24 0 q -12 12 -24 0 z" />
          <path d="M168 20 q 12 -8 20 0 q -8 8 -20 0 z" opacity="0.7" />
          <circle cx="188" cy="20" r="1.5" fill="currentColor" stroke="none" />
        </g>
      </svg>
    </div>
  );
}

// A bespoke set of Arab-legal line-art icons — replaces the generic Lucide
// rounded-square tile treatment on landing/dashboard decorative sites.
type IconProps = SVGProps<SVGSVGElement> & { className?: string; size?: number };
const svgBase = (size?: number) => ({
  viewBox: "0 0 32 32",
  width: size ?? 24,
  height: size ?? 24,
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function IconScales({ size, ...p }: IconProps) {
  return (
    <svg {...svgBase(size)} {...p}>
      <path d="M16 5 V27" />
      <path d="M10 27 H22" />
      <path d="M7 10 H25" />
      <circle cx="16" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M7 10 L4 18 a4 4 0 0 0 6 0 Z" />
      <path d="M25 10 L22 18 a4 4 0 0 0 6 0 Z" />
    </svg>
  );
}
export function IconSeal({ size, ...p }: IconProps) {
  return (
    <svg {...svgBase(size)} {...p}>
      <path d="M16 3 L20 6 L24 4 L25 9 L29 11 L26 15 L28 20 L23 21 L21 25 L16 23 L11 25 L9 21 L4 20 L6 15 L3 11 L7 9 L8 4 L12 6 Z" />
      <circle cx="16" cy="14" r="4" />
      <path d="M13 20 L16 28 L19 20" />
    </svg>
  );
}
export function IconLattice({ size, ...p }: IconProps) {
  return (
    <svg {...svgBase(size)} {...p}>
      <path d="M16 3 L28 10 V22 L16 29 L4 22 V10 Z" />
      <path d="M16 3 V29 M4 10 L28 22 M28 10 L4 22" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}
export function IconScroll({ size, ...p }: IconProps) {
  return (
    <svg {...svgBase(size)} {...p}>
      <path d="M7 6 h15 a3 3 0 0 1 3 3 v14 a3 3 0 0 1 -3 3 H10 a3 3 0 0 1 -3 -3 V6 z" />
      <path d="M25 9 h3 v14 a3 3 0 0 1 -3 3" />
      <path d="M11 11 h10 M11 15 h10 M11 19 h6" />
    </svg>
  );
}
export function IconGavel({ size, ...p }: IconProps) {
  return (
    <svg {...svgBase(size)} {...p}>
      <path d="M6 20 l10 -10 l6 6 l-10 10 z" />
      <path d="M11 5 l8 8 M15 3 l8 8 M4 26 h12" />
    </svg>
  );
}
export function IconCrescent({ size, ...p }: IconProps) {
  return (
    <svg {...svgBase(size)} {...p}>
      <path d="M22 6 a12 12 0 1 0 4 20 a10 10 0 1 1 -4 -20 z" />
      <path d="M12 16 l2 1 l-1 -2 l1 -2 l-2 1 l-2 -1 l1 2 l-1 2 z" fill="currentColor" stroke="none" opacity="0.6" />
    </svg>
  );
}

// Hexagonal frame that hosts the icon — the recurring "seal" motif that
// replaces the flat rounded-square tile treatment.
export function SealFrame({
  children, tone = "gold", className,
}: { children: ReactNode; tone?: "gold" | "teal" | "sand"; className?: string }) {
  const tones = {
    gold: "text-gold bg-gold/10",
    teal: "text-primary bg-primary/10",
    sand: "text-primary bg-champagne/40",
  } as const;
  return (
    <span className={cn("relative inline-grid size-11 place-items-center", className)}>
      <svg viewBox="0 0 40 40" className={cn("absolute inset-0 size-full", tones[tone])} aria-hidden>
        <path d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z" fill="currentColor" opacity="0.14" />
        <path d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
        <path d="M20 8 L30 13.5 V24.5 L20 30 L10 24.5 V13.5 Z" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
      </svg>
      <span className={cn("relative", tones[tone].split(" ")[0])}>{children}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  ManuscriptFrame — illuminated-border container for section cards   */
/* ------------------------------------------------------------------ */

function ManuscriptCorner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const rot = pos === "tl" ? 0 : pos === "tr" ? 90 : pos === "br" ? 180 : 270;
  const place = {
    tl: "top-0 left-0",
    tr: "top-0 right-0",
    bl: "bottom-0 left-0",
    br: "bottom-0 right-0",
  }[pos];
  return (
    <svg
      aria-hidden
      viewBox="0 0 96 96"
      className={cn("pointer-events-none absolute h-20 w-20 md:h-24 md:w-24", place)}
      style={{ transform: `rotate(${rot}deg)`, transformOrigin: "center" }}
    >
      {/* gold filigree — arabesque tendrils on both edges */}
      <g fill="none" stroke="#b8860b" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 8 L92 8" opacity="0.9" />
        <path d="M8 8 L8 92" opacity="0.9" />
        <path d="M12 12 L72 12" opacity="0.45" />
        <path d="M12 12 L12 72" opacity="0.45" />
        <path d="M8 26 Q26 26 26 8" />
        <path d="M8 40 Q40 40 40 8" opacity="0.7" />
        <path d="M8 56 Q56 56 56 8" opacity="0.35" />
        <path d="M18 18 q8 -2 12 3 q5 5 3 12" />
        <path d="M30 30 q6 5 14 3" opacity="0.7" />
        <path d="M30 30 q5 6 3 14" opacity="0.7" />
      </g>
      {/* champagne petals */}
      <g fill="#c9962a" opacity="0.85">
        <path d="M46 6 q4 5 0 10 q-4 -5 0 -10 Z" />
        <path d="M6 46 q5 4 10 0 q-5 -4 -10 0 Z" />
        <path d="M62 8 q3 4 0 8 q-3 -4 0 -8 Z" opacity="0.65" />
        <path d="M8 62 q4 3 8 0 q-4 -3 -8 0 Z" opacity="0.65" />
      </g>
      {/* indigo diamond bosses with gilded pinpoints */}
      <g>
        <path d="M18 18 l5 -5 l5 5 l-5 5 z" fill="#1e3a8f" />
        <path d="M18 18 l2 -2 l2 2 l-2 2 z" fill="#f5d16a" />
        <path d="M34 8 l3.5 -3.5 l3.5 3.5 l-3.5 3.5 z" fill="#1e3a8f" opacity="0.9" />
        <path d="M8 34 l3.5 -3.5 l3.5 3.5 l-3.5 3.5 z" fill="#1e3a8f" opacity="0.9" />
        <path d="M52 8 l2.5 -2.5 l2.5 2.5 l-2.5 2.5 z" fill="#1e3a8f" opacity="0.7" />
        <path d="M8 52 l2.5 -2.5 l2.5 2.5 l-2.5 2.5 z" fill="#1e3a8f" opacity="0.7" />
        <circle cx="70" cy="8" r="0.9" fill="#1e3a8f" opacity="0.55" />
        <circle cx="8" cy="70" r="0.9" fill="#1e3a8f" opacity="0.55" />
      </g>
    </svg>
  );
}

export function ManuscriptFrame({
  children,
  className,
  padding = "p-8 md:p-10",
}: { children: ReactNode; className?: string; padding?: string }) {
  return (
    <div className={cn("relative rounded-2xl bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]", padding, className)}>
      {/* Inset double gold rule that hugs the illuminated corners */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-lg"
        style={{
          boxShadow:
            "inset 0 0 0 1px color-mix(in oklch, #b8860b, transparent 55%), inset 0 0 0 3px var(--card), inset 0 0 0 4px color-mix(in oklch, #b8860b, transparent 78%)",
        }}
      />
      <ManuscriptCorner pos="tl" />
      <ManuscriptCorner pos="tr" />
      <ManuscriptCorner pos="bl" />
      <ManuscriptCorner pos="br" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Count-up hook — respects prefers-reduced-motion                    */
/* ------------------------------------------------------------------ */

function parseNumeric(v: string): { prefix: string; num: number | null; suffix: string } {
  // Match a number (with commas / decimals) anywhere in the string.
  const m = /^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/.exec(v);
  if (!m) return { prefix: v, num: null, suffix: "" };
  const num = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(num)) return { prefix: v, num: null, suffix: "" };
  return { prefix: m[1], num, suffix: m[3] };
}

function CountUp({ value }: { value: string }) {
  const parsed = parseNumeric(value);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState<string>(reduce || parsed.num == null ? value : `${parsed.prefix}0${parsed.suffix}`);

  useEffect(() => {
    if (parsed.num == null || reduce || !inView) return;
    const controls = animate(mv, parsed.num, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsub = mv.on("change", (latest) => {
      const rounded = parsed.num! % 1 === 0 ? Math.round(latest) : Number(latest.toFixed(1));
      setDisplay(`${parsed.prefix}${rounded.toLocaleString()}${parsed.suffix}`);
    });
    return () => { controls.stop(); unsub(); };
  }, [inView, reduce, parsed.num]);

  if (parsed.num == null) return <span>{value}</span>;
  return <span ref={ref}>{display}</span>;
}

/* ------------------------------------------------------------------ */
/*  PageHeader — used on every dashboard route                         */
/* ------------------------------------------------------------------ */

import { Link } from "@tanstack/react-router";

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-8 flex flex-wrap items-end justify-between gap-4"
    >
      <CornerFlourish className="absolute -left-1 -top-2 text-gold/70 rtl:right-[-0.25rem] rtl:left-auto rtl:-scale-x-100" />
      <div className="ps-8">
        <OrnamentalRule className="mb-3 w-24" />
        <h1 className="font-serif text-3xl leading-tight tracking-tight text-primary md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatTile — hex-seal icon frame + animated count-up + hover lift    */
/* ------------------------------------------------------------------ */

export function StatTile({
  label, value, delta, icon, tone = "default", index = 0, to,
}: {
  label: string; value: string; delta?: string;
  icon?: ReactNode; tone?: "default" | "gold" | "success" | "warning"; index?: number;
  to?: string;
}) {
  const sealTone = tone === "gold" ? "gold" : tone === "warning" ? "sand" : "teal";
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow duration-300 hover:shadow-[0_20px_50px_-20px_oklch(0.30_0.08_195/0.35)]",
        to && "cursor-pointer hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
      )}
    >
      {/* Mashrabiya corner watermark */}
      <svg
        viewBox="0 0 80 80"
        className="pointer-events-none absolute -right-4 -top-4 size-24 text-gold/[0.09] transition-transform duration-500 group-hover:rotate-12 rtl:right-auto rtl:-left-4"
        aria-hidden
        fill="none" stroke="currentColor" strokeWidth="1"
      >
        <path d="M40 4 L72 22 V58 L40 76 L8 58 V22 Z" />
        <path d="M40 4 V76 M8 22 L72 58 M72 22 L8 58" />
        <circle cx="40" cy="40" r="10" />
        <path d="M40 24 L46 38 L60 40 L46 42 L40 56 L34 42 L20 40 L34 38 Z" />
      </svg>
      <CornerFlourish className="absolute right-2 top-2 size-4 text-gold/40 rtl:left-2 rtl:right-auto rtl:-scale-x-100" size={16} />

      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        {icon && <SealFrame tone={sealTone}>{icon}</SealFrame>}
      </div>
      <div className="mt-3 font-serif text-3xl tracking-tight text-primary">
        <CountUp value={value} />
      </div>
      {delta && <div className="mt-1 text-xs text-success">{delta}</div>}
    </motion.div>
  );
  if (to) return <Link to={to as any} className="block">{inner}</Link>;
  return inner;
}

/* ------------------------------------------------------------------ */
/*  StatusBadge — unchanged palette (semantic)                         */
/* ------------------------------------------------------------------ */

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
