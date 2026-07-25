import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  COURT_BRANCHES, CASE_TYPES, caseTypesFor, courtLevelsFor, estimateFees, type CourtBranch,
} from "@/lib/jordan-legal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calculator } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-JO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/**
 * Jordanian court-fee + JBA attorney-fee estimator.
 * Used standalone in Financials and embedded in the new-case wizard.
 */
export function CourtFeeCalculator({
  compact,
  defaultBranch = "civil",
  defaultLevel,
  defaultValue = 0,
  onEstimate,
}: {
  compact?: boolean;
  defaultBranch?: CourtBranch;
  defaultLevel?: string;
  defaultValue?: number;
  onEstimate?: (total: number, attorneyFee: number) => void;
}) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const [branch, setBranch] = useState<CourtBranch>(defaultBranch);
  const [level, setLevel] = useState(defaultLevel ?? courtLevelsFor(defaultBranch)[0]?.value ?? "conciliation");
  const [caseType, setCaseType] = useState(caseTypesFor(defaultBranch)[0]?.value ?? "");
  const [value, setValue] = useState(String(defaultValue || ""));
  const [includeAttorney, setIncludeAttorney] = useState(true);

  const monetary = CASE_TYPES.find((c) => c.value === caseType)?.monetary ?? true;
  const est = useMemo(() => {
    const e = estimateFees({ claimValue: Number(value) || 0, level, monetary, includeAttorney });
    onEstimate?.(e.totalUpfront, e.attorneyFee);
    return e;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, level, monetary, includeAttorney]);

  function pickBranch(b: CourtBranch) {
    setBranch(b);
    setLevel(courtLevelsFor(b)[0]?.value ?? "");
    setCaseType(caseTypesFor(b)[0]?.value ?? "");
  }

  return (
    <div className={compact ? "space-y-3" : "card-elev rounded-xl border bg-card p-5 space-y-4"}>
      {!compact && (
        <div className="flex items-center gap-2">
          <Calculator className="size-4 text-gold" />
          <h3 className="text-sm font-semibold">{ar ? "حاسبة الرسوم والأتعاب" : "Court fee & JBA fee calculator"}</h3>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{ar ? "الفرع القضائي" : "Judicial branch"}</Label>
          <Select value={branch} onValueChange={(v) => pickBranch(v as CourtBranch)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COURT_BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label[locale]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{ar ? "درجة المحكمة" : "Court level"}</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {courtLevelsFor(branch).map((c) => <SelectItem key={c.value} value={c.value}>{c.label[locale]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{ar ? "نوع الدعوى" : "Case type"}</Label>
          <Select value={caseType} onValueChange={setCaseType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {caseTypesFor(branch).map((c) => <SelectItem key={c.value} value={c.value}>{c.label[locale]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            {ar ? "قيمة المطالبة (د.أ)" : "Claim value (JOD)"}
          </Label>
          <Input
            className="h-9"
            inputMode="decimal"
            disabled={!monetary}
            value={monetary ? value : ""}
            placeholder={monetary ? "0.00" : (ar ? "دعوى غير مقدّرة القيمة" : "Non-monetary claim")}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <Switch checked={includeAttorney} onCheckedChange={setIncludeAttorney} />
        {ar ? "احتساب أتعاب المحاماة (الحد الأدنى النقابي)" : "Include attorney fee (JBA minimum)"}
      </label>

      <div className="rounded-lg border bg-background/60">
        <ul className="divide-y text-xs">
          {est.lines.map((l, i) => (
            <li key={i} className="flex items-start justify-between gap-3 px-3 py-2">
              <span>
                <span className="font-medium">{l.label[locale]}</span>
                {l.note ? <span className="block text-[10px] text-muted-foreground">{l.note[locale]}</span> : null}
              </span>
              <span className="tabular-nums font-semibold">{fmt(l.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t bg-gold/5 px-3 py-2.5 text-sm">
          <span className="font-semibold">{ar ? "الإجمالي التقديري" : "Estimated total"}</span>
          <span className="tabular-nums font-bold text-gold">{fmt(est.totalUpfront)} {ar ? "د.أ" : "JOD"}</span>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground">{est.disclaimer[locale]}</p>
    </div>
  );
}
