import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { documents } from "@/lib/mock-data";
import { FileText, FilePen, Gavel, FolderArchive, UploadCloud, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/documents")({ component: DocsPage });

const typeIcon = {
  contract: FilePen,
  brief: FileText,
  evidence: FolderArchive,
  judgment: Gavel,
  template: Sparkles,
} as const;

function DocsPage() {
  const { locale } = useI18n();
  return (
    <div className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "إدارة المستندات" : "Document Management"}
        subtitle={locale === "ar" ? "تخزين آمن، إصدارات، توقيع إلكتروني، واسترجاع ذكي." : "Secure storage, versioning, e-signature and intelligent retrieval."}
        actions={<Button size="sm" variant="gold" className="gap-1.5"><UploadCloud className="size-4" />{locale === "ar" ? "رفع مستند" : "Upload"}</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: locale === "ar" ? "إجمالي المستندات" : "Total documents", value: "4,128" },
          { label: locale === "ar" ? "في المراجعة" : "In review", value: "47" },
          { label: locale === "ar" ? "تواقيع معلّقة" : "Awaiting signature", value: "12" },
          { label: locale === "ar" ? "تخزين مستخدم" : "Storage used", value: "186 GB" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 card-elev">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-serif text-2xl">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((d) => {
          const Icon = typeIcon[d.type];
          return (
            <div key={d.id} className="group card-elev flex gap-4 rounded-xl border bg-card p-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{d.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {d.caseRef && <><span className="font-mono">{d.caseRef}</span> · </>}{d.author}
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{d.updated}</span>
                  <span className="tabular-nums">{d.size}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
