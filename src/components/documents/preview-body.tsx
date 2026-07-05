import { Download } from "lucide-react";

/** Shared document preview body used across Documents page and Case profile. */
export function DocumentPreviewBody({ url, name, mime, locale }: { url: string; name: string; mime: string | null; locale: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = (mime ?? "").startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isPdf = mime === "application/pdf" || ext === "pdf";
  if (isImage) {
    return (
      <div className="grid place-items-center bg-muted/30 rounded-md overflow-hidden">
        <img src={url} alt={name} className="max-h-[75vh] w-auto" />
      </div>
    );
  }
  if (isPdf) {
    return <iframe src={url} title={name} className="w-full h-[75vh] rounded-md border bg-muted/20" />;
  }
  return (
    <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
      <p>{locale === "ar"
        ? "لا يمكن عرض هذا النوع من الملفات في المتصفح. يمكنك تنزيله لعرضه."
        : "This file type can't be previewed in the browser. Download it to view."}</p>
      <a href={url} download={name} className="inline-flex items-center gap-1.5 text-gold hover:underline">
        <Download className="size-4" />{locale === "ar" ? "تنزيل الملف" : "Download file"}
      </a>
    </div>
  );
}
