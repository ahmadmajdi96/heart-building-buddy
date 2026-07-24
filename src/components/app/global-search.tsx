import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search, Users, Briefcase, FileText, Receipt, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { globalSearch, type GlobalSearchHit } from "@/lib/global-search.functions";

const ICONS: Record<GlobalSearchHit["type"], any> = {
  client: Users,
  case: Briefcase,
  invoice: Receipt,
  document: FileText,
  debt_case: Scale,
};

const GROUP_LABEL: Record<GlobalSearchHit["type"], { en: string; ar: string }> = {
  client: { en: "Clients", ar: "العملاء" },
  case: { en: "Cases", ar: "القضايا" },
  invoice: { en: "Invoices", ar: "الفواتير" },
  document: { en: "Documents", ar: "المستندات" },
  debt_case: { en: "Debt collection", ar: "التحصيل" },
};

export function GlobalSearch({ lang = "en" }: { lang?: "en" | "ar" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const run = useServerFn(globalSearch);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) { setQ(""); setHits([]); return; }
  }, [open]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setHits([]); setLoading(false); return; }
    const mySeq = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await run({ data: { q: query } });
        if (mySeq === seq.current) setHits(res);
      } catch {
        if (mySeq === seq.current) setHits([]);
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, run]);

  const grouped = useMemo(() => {
    const g: Record<string, GlobalSearchHit[]> = {};
    for (const h of hits) (g[h.type] ||= []).push(h);
    return g;
  }, [hits]);

  const isAr = lang === "ar";

  const go = (href: string) => {
    setOpen(false);
    navigate({ to: href });
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex h-9 min-w-[220px] justify-between gap-3 rounded-full border-border/70 bg-background/70 px-3 text-muted-foreground hover:text-foreground"
        aria-label={isAr ? "بحث شامل" : "Search everywhere"}
      >
        <span className="inline-flex items-center gap-2">
          <Search className="size-4" />
          <span className="text-[13px]">{isAr ? "بحث شامل…" : "Search everywhere…"}</span>
        </span>
        <kbd className="pointer-events-none rounded border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K"}
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label={isAr ? "بحث" : "Search"}
      >
        <Search className="size-5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={isAr ? "ابحث عن عميل، قضية، فاتورة، مستند…" : "Search clients, cases, invoices, documents…"}
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          {loading && q.length >= 2 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {isAr ? "جارٍ البحث…" : "Searching…"}
            </div>
          )}
          {!loading && q.length >= 2 && hits.length === 0 && (
            <CommandEmpty>{isAr ? "لا نتائج." : "No results."}</CommandEmpty>
          )}
          {!loading && q.length < 2 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {isAr ? "اكتب حرفين على الأقل للبحث." : "Type at least 2 characters."}
            </div>
          )}
          {Object.entries(grouped).map(([type, items], idx) => {
            const Icon = ICONS[type as GlobalSearchHit["type"]];
            const label = GROUP_LABEL[type as GlobalSearchHit["type"]][isAr ? "ar" : "en"];
            return (
              <div key={type}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup heading={label}>
                  {items.map((h) => (
                    <CommandItem
                      key={`${h.type}-${h.id}`}
                      value={`${h.type}-${h.id}-${h.title}`}
                      onSelect={() => go(h.href)}
                      className="flex items-center gap-3"
                    >
                      <Icon className="size-4 text-gold" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">{h.title}</span>
                        {h.subtitle && (
                          <span className="truncate text-xs text-muted-foreground">{h.subtitle}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
