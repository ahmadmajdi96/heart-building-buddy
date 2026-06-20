import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { hearings } from "@/lib/mock-data";
import { CalendarDays, Clock, MapPin, User, Plus } from "lucide-react";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const { locale } = useI18n();

  const weeks: (number | null)[][] = [
    [null, 1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12, 13],
    [14, 15, 16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25, 26, 27],
    [28, 29, 30, null, null, null, null],
  ];
  const eventDays = new Set(hearings.map((h) => parseInt(h.date.slice(8, 10))));

  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "جدول المحاكم" : "Court Calendar"}
        subtitle={locale === "ar" ? "الجلسات، المواعيد النهائية، والتذكيرات في مكان واحد." : "Hearings, deadlines and statute-of-limitation reminders."}
        actions={<Button size="sm" variant="gold" className="gap-1.5"><Plus className="size-4" />{locale === "ar" ? "موعد جديد" : "New event"}</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card-elev rounded-xl border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="font-serif text-2xl">{locale === "ar" ? "يونيو ٢٠٢٦" : "June 2026"}</div>
            <div className="flex gap-1"><Button variant="ghost" size="sm">‹</Button><Button variant="ghost" size="sm">›</Button></div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {(locale === "ar" ? ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"] : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]).map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((d, i) => (
              <div key={i} className={[
                "aspect-square rounded-lg p-1.5 text-sm",
                d == null ? "" : "border bg-secondary/30 hover:bg-secondary/60 transition-colors",
                d != null && eventDays.has(d) ? "ring-1 ring-gold/40 bg-gold/5" : "",
              ].join(" ")}>
                {d && (
                  <div className="flex h-full flex-col">
                    <div className={["text-xs font-medium", eventDays.has(d) ? "text-gold" : "text-foreground"].join(" ")}>{d}</div>
                    {eventDays.has(d) && <div className="mt-auto h-1 w-1 self-end rounded-full bg-gold" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold">{locale === "ar" ? "الجلسات القادمة" : "Upcoming events"}</div>
          {hearings.map((h) => (
            <div key={h.id} className="card-elev rounded-xl border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <div className="text-center leading-tight">
                    <div className="text-[10px] uppercase tracking-wider opacity-70">{h.date.slice(5, 7)}</div>
                    <div className="font-serif text-xl">{h.date.slice(8, 10)}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{h.type}</div>
                  <div className="mt-0.5 text-xs font-mono text-muted-foreground">{h.caseRef}</div>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Clock className="size-3.5" />{h.time}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="size-3.5" />{h.court}</div>
                    <div className="flex items-center gap-1.5"><User className="size-3.5" />{h.attendee}</div>
                  </div>
                </div>
                <CalendarDays className="size-4 text-gold" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
