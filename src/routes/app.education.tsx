import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatTile } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { courses } from "@/lib/mock-data";
import { GraduationCap, Star, Users, Award, Clock, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/app/education")({ component: EducationPage });

function EducationPage() {
  const { locale } = useI18n();
  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "الأكاديمية القانونية" : "Legal Academy"}
        subtitle={locale === "ar" ? "دورات معتمدة وشهادات للمحامين والطلاب والقضاة." : "Accredited courses and certifications for lawyers, students and judges."}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={locale === "ar" ? "دورات نشطة" : "Active courses"} value={String(courses.length)} icon={<GraduationCap className="size-4" />} />
        <StatTile label={locale === "ar" ? "المتدربون" : "Learners"} value="3,638" icon={<Users className="size-4" />} tone="gold" />
        <StatTile label={locale === "ar" ? "ساعات CPD" : "CPD hours"} value="132" icon={<Clock className="size-4" />} />
        <StatTile label={locale === "ar" ? "شهادات صادرة" : "Certificates issued"} value="1,284" icon={<Award className="size-4" />} tone="success" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => (
          <div key={c.id} className="card-elev group flex flex-col overflow-hidden rounded-xl border bg-card">
            <div className="relative h-32 bg-gradient-to-br from-primary via-primary to-gold/40">
              <div className="absolute inset-0 arabesque opacity-30" />
              <div className="absolute bottom-3 start-4 rounded-md bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">{c.level}</div>
              <PlayCircle className="absolute end-4 top-4 size-6 text-white/80" />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="font-serif text-lg leading-snug">{locale === "ar" ? c.titleAr : c.titleEn}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.instructor}</div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{c.hours} {locale === "ar" ? "ساعة" : "h"}</span>
                <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{c.enrolled.toLocaleString()}</span>
                <span className="inline-flex items-center gap-1 text-gold"><Star className="size-3.5 fill-current" />{c.rating}</span>
              </div>
              <Button className="mt-4" variant="outline" size="sm">{locale === "ar" ? "ابدأ الدورة" : "Start course"}</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
