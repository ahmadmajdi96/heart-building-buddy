import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ScrollText, Gavel, Shield, Handshake, Stamp, Library, ChevronLeft, ChevronRight, Wand2, Loader2, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { bi } from "@/lib/jordan-legal";
import {
  WORKFLOWS, TEMPLATE_LIBRARY, getWorkflow,
  type Workflow, type WorkflowField, type WorkflowKind,
} from "@/lib/drafting-workflows";
import { generateStructuredDraft } from "@/lib/structured-drafting.functions";

const ICONS = { scroll: ScrollText, gavel: Gavel, shield: Shield, handshake: Handshake, stamp: Stamp, library: Library };

/** Grid of the five structured workflows + the template library. */
export function WorkflowPicker({ onPick }: { onPick: (kind: WorkflowKind) => void }) {
  const { locale } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {WORKFLOWS.map((w) => {
        const Icon = ICONS[w.icon];
        return (
          <button
            key={w.kind}
            onClick={() => onPick(w.kind)}
            className="group relative overflow-hidden rounded-xl border bg-card p-4 text-start transition hover:border-gold/60 hover:shadow-md"
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 arabesque opacity-0 transition group-hover:opacity-[0.09]" />
            <div className="relative flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-gold/40 bg-gold/5 text-gold">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{bi(w.label, locale)}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{bi(w.blurb, locale)}</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Searchable library of ready Jordanian templates. */
export function TemplateLibrary({ onSeed }: { onSeed: (kind: WorkflowKind, values: Record<string, string>) => void }) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TEMPLATE_LIBRARY;
    return TEMPLATE_LIBRARY.filter((t) =>
      [bi(t.title, locale), bi(t.summary, locale), bi(t.category, locale)].join(" ").toLowerCase().includes(needle));
  }, [q, locale]);
  const groups = useMemo(() => {
    const g = new Map<string, typeof TEMPLATE_LIBRARY>();
    for (const t of rows) {
      const k = bi(t.category, locale);
      g.set(k, [...(g.get(k) ?? []), t]);
    }
    return [...g.entries()];
  }, [rows, locale]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ar ? "ابحث في النماذج…" : "Search templates…"}
          className="h-9 ps-9"
        />
      </div>
      {groups.map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{cat}</div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <button
                key={t.id}
                onClick={() => onSeed(t.seed.kind, t.seed.values)}
                className="rounded-lg border bg-card p-3 text-start text-xs transition hover:border-gold/60 hover:bg-gold/5"
              >
                <div className="font-semibold">{bi(t.title, locale)}</div>
                <div className="mt-1 leading-relaxed text-muted-foreground">{bi(t.summary, locale)}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">{ar ? "لا نتائج." : "No matching templates."}</p>
      )}
    </div>
  );
}

function FieldControl({
  field, value, onChange,
}: { field: WorkflowField; value: string; onChange: (v: string) => void }) {
  const { locale } = useI18n();
  const label = bi(field.label, locale);
  const ph = field.placeholder ? bi(field.placeholder, locale) : undefined;

  const control = (() => {
    switch (field.type) {
      case "textarea":
        return <Textarea rows={4} value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} />;
      case "date":
        return <Input type="date" className="h-9" value={value} onChange={(e) => onChange(e.target.value)} />;
      case "number":
      case "money":
        return (
          <Input
            className="h-9"
            inputMode="decimal"
            value={value}
            placeholder={ph ?? (field.type === "money" ? "0.00" : undefined)}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          />
        );
      case "select":
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-9"><SelectValue placeholder={ph} /></SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((o) => (
                <SelectItem key={o.value} value={o.value}>{bi(o.label, locale)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multiselect": {
        const picked = value ? value.split(",").filter(Boolean) : [];
        return (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {(field.options ?? []).map((o) => {
              const on = picked.includes(o.value);
              return (
                <label
                  key={o.value}
                  className={`flex cursor-pointer items-start gap-2 rounded border px-2.5 py-1.5 text-xs transition ${on ? "border-gold bg-gold/5" : "hover:bg-secondary/40"}`}
                >
                  <Checkbox
                    checked={on}
                    onCheckedChange={() =>
                      onChange((on ? picked.filter((p) => p !== o.value) : [...picked, o.value]).join(","))
                    }
                  />
                  <span>{bi(o.label, locale)}</span>
                </label>
              );
            })}
          </div>
        );
      }
      default:
        return <Input className="h-9" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} />;
    }
  })();

  return (
    <div className={field.type === "textarea" || field.type === "multiselect" ? "space-y-1 md:col-span-2" : "space-y-1"}>
      <Label className="text-xs">
        {label}
        {field.required && <span className="ms-1 text-destructive">*</span>}
      </Label>
      {control}
      {field.help && <p className="text-[10px] leading-relaxed text-muted-foreground">{bi(field.help, locale)}</p>}
    </div>
  );
}

/** Multi-step guided wizard for one workflow. Calls back with generated Markdown. */
export function WorkflowWizard({
  kind, initialValues, onDone, onBack,
}: {
  kind: WorkflowKind;
  initialValues?: Record<string, string>;
  onDone: (markdown: string, suggestedTitle: string) => void;
  onBack: () => void;
}) {
  const { locale } = useI18n(); const ar = locale === "ar";
  const wf: Workflow = getWorkflow(kind);
  const run = useServerFn(generateStructuredDraft);

  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const stepFields = wf.fields.filter((f) => f.step === step + 1);
  const isLast = step === wf.steps.length - 1;
  const Icon = ICONS[wf.icon];

  function missingRequired() {
    return stepFields.filter((f) => f.required && !(values[f.name] ?? "").trim());
  }

  function next() {
    const missing = missingRequired();
    if (missing.length) {
      toast.error(`${ar ? "حقول مطلوبة" : "Required"}: ${missing.map((f) => bi(f.label, locale)).join("، ")}`);
      return;
    }
    setStep((s) => Math.min(s + 1, wf.steps.length - 1));
  }

  async function generate() {
    const missing = wf.fields.filter((f) => f.required && !(values[f.name] ?? "").trim());
    if (missing.length) {
      toast.error(`${ar ? "حقول مطلوبة" : "Required"}: ${missing.map((f) => bi(f.label, locale)).join("، ")}`);
      return;
    }
    setBusy(true);
    try {
      const res = await run({ data: { kind, locale, values, notes: notes || undefined, useCorpus: true } });
      const title = `${bi(wf.label, locale)}${values.subject ? ` — ${values.subject}` : values.defendant_name ? ` — ${values.defendant_name}` : ""}`;
      onDone(res.draft, title.slice(0, 90));
      if (!res.grounded) {
        toast.message(ar
          ? "صيغت المسودة دون مراجع من فهرس مكتبك — راجع الاستنادات القانونية."
          : "Drafted without firm-corpus authority — review the legal citations.");
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card-elev space-y-5 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-gold/40 bg-gold/5 text-gold">
            <Icon className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{bi(wf.label, locale)}</h2>
            <p className="text-xs text-muted-foreground">{bi(wf.blurb, locale)}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>{ar ? "تغيير النوع" : "Change type"}</Button>
      </div>

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-2 text-[11px]">
        {wf.steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition ${
                i === step ? "border-gold bg-gold/10 font-semibold text-gold"
                : i < step ? "border-gold/30 text-muted-foreground" : "text-muted-foreground"}`}
            >
              <span className={`grid size-4 place-items-center rounded-full text-[9px] ${i <= step ? "bg-gold text-white" : "bg-secondary"}`}>
                {i + 1}
              </span>
              {bi(s, locale)}
            </button>
            {i < wf.steps.length - 1 && <span className="text-muted-foreground/50">·</span>}
          </li>
        ))}
      </ol>

      <div className="grid gap-3 md:grid-cols-2">
        {stepFields.map((f) => (
          <FieldControl key={f.name} field={f} value={values[f.name] ?? ""} onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))} />
        ))}
        {stepFields.length === 0 && (
          <p className="text-xs text-muted-foreground md:col-span-2">{ar ? "لا حقول في هذه الخطوة." : "No fields in this step."}</p>
        )}
      </div>

      {isLast && (
        <div className="space-y-1">
          <Label className="text-xs">{ar ? "تعليمات إضافية (اختياري)" : "Additional instructions (optional)"}</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={ar ? "مثال: أضف بنداً للتحكيم في عمّان." : "e.g. add an arbitration clause seated in Amman."} />
        </div>
      )}

      {/* Outline preview so the user knows exactly what will be produced */}
      <details className="rounded-lg border bg-background/60 p-3 text-xs">
        <summary className="cursor-pointer font-medium">{ar ? "هيكل المستند الناتج" : "Output structure"}</summary>
        <ol className="mt-2 list-decimal space-y-0.5 ps-5 text-muted-foreground">
          {wf.outline.map((o, i) => <li key={i}>{bi(o, locale)}</li>)}
        </ol>
      </details>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          {ar ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          {ar ? "السابق" : "Back"}
        </Button>
        {isLast ? (
          <Button variant="gold" onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {ar ? "اصِغ المستند" : "Generate document"}
          </Button>
        ) : (
          <Button size="sm" onClick={next}>
            {ar ? "التالي" : "Next"}
            {ar ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
