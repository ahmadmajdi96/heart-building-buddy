import { useI18n, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LangToggle({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const { locale, setLocale } = useI18n();
  const next: Locale = locale === "ar" ? "en" : "ar";
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() => setLocale(next)}
      className="gap-1.5 font-medium"
    >
      <Languages className="size-4" />
      <span className="tabular-nums">{next === "ar" ? "العربية" : "EN"}</span>
    </Button>
  );
}
