import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type NumberInputProps = Omit<React.ComponentProps<"input">, "type" | "onChange" | "value"> & {
  value: number | string;
  onValueChange: (v: number) => void;
  /** Step used by the +/- buttons and keyboard arrows. Defaults to 1. */
  step?: number;
  min?: number;
  max?: number;
  /** Decimal places kept when stepping. Defaults to 2 for money-like values. */
  precision?: number;
};

/**
 * Themed numeric field. Native browser spinners are hidden (see styles.css) and
 * replaced with design-system +/- buttons so the control matches the platform theme.
 * `min` defaults to 0 so negative money values can never be entered.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onValueChange, step = 1, min = 0, max, precision = 2, disabled, ...props }, ref) => {
    const round = (n: number) => Number(n.toFixed(precision));
    const clamp = (n: number) => {
      let v = n;
      if (min != null && v < min) v = min;
      if (max != null && v > max) v = max;
      return round(v);
    };
    const current = () => {
      const n = typeof value === "number" ? value : parseFloat(String(value));
      return Number.isFinite(n) ? n : min ?? 0;
    };
    const bump = (dir: 1 | -1) => onValueChange(clamp(current() + dir * step));

    return (
      <div className={cn("flex h-9 w-full items-stretch overflow-hidden rounded-md border border-input bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-ring", disabled && "opacity-50", className)}>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrease"
          disabled={disabled}
          onClick={() => bump(-1)}
          className="grid w-8 shrink-0 place-items-center border-e border-input/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          ref={ref}
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") { onValueChange(min ?? 0); return; }
            const n = parseFloat(raw);
            if (Number.isFinite(n)) onValueChange(n);
          }}
          onBlur={(e) => {
            const n = parseFloat(e.target.value);
            onValueChange(Number.isFinite(n) ? clamp(n) : clamp(min ?? 0));
            props.onBlur?.(e);
          }}
          className="min-w-0 flex-1 bg-transparent px-3 py-1 text-center text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm"
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increase"
          disabled={disabled}
          onClick={() => bump(1)}
          className="grid w-8 shrink-0 place-items-center border-s border-input/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";
