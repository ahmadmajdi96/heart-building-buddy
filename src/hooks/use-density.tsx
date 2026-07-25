import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Density = "comfortable" | "cozy" | "compact";

const KEY = "mohkam.table-density";

const DensityContext = createContext<{
  density: Density;
  setDensity: (d: Density) => void;
}>({ density: "comfortable", setDensity: () => {} });

export function DensityProvider({ children }: { children: ReactNode }) {
  // Read on the client only — SSR must render the default to avoid hydration drift.
  const [density, setDensityState] = useState<Density>("comfortable");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Density | null;
      if (saved === "comfortable" || saved === "cozy" || saved === "compact") setDensityState(saved);
    } catch { /* storage blocked */ }
  }, []);
  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    try { localStorage.setItem(KEY, d); } catch { /* ignore */ }
  }, []);
  return <DensityContext.Provider value={{ density, setDensity }}>{children}</DensityContext.Provider>;
}

export function useDensity() {
  return useContext(DensityContext);
}

/** Tailwind classes for a table row/cell at the current density. */
export function densityClasses(density: Density) {
  switch (density) {
    case "compact":
      return { cell: "px-2 py-1 text-[11px]", head: "px-2 py-1.5 text-[10px]", row: "h-8" };
    case "cozy":
      return { cell: "px-3 py-2 text-xs", head: "px-3 py-2 text-[11px]", row: "h-10" };
    default:
      return { cell: "px-4 py-3 text-sm", head: "px-4 py-2.5 text-xs", row: "h-12" };
  }
}

/** Convenience: classes for the current density. */
export function useDensityClasses() {
  const { density } = useDensity();
  return densityClasses(density);
}
