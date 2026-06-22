import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useLogoUrl } from "@/lib/logo";

type Props = {
  value: string | null | undefined;
  onChange: (next: string) => void;
  /** Owner identifier used as the storage folder. Pass org id when editing an existing org, or `pending:{user_id}` while onboarding. */
  ownerKey: string;
  disabled?: boolean;
};

export function LogoPicker({ value, onChange, ownerKey, disabled }: Props) {
  const { locale } = useI18n();
  const display = useLogoUrl(value);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error(locale === "ar" ? "حجم الملف أكبر من 4 ميجابايت" : "File exceeds 4 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${ownerKey}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("org-assets").upload(path, file, {
      cacheControl: "3600", upsert: true, contentType: file.type,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    onChange(path);
    toast.success(locale === "ar" ? "تم رفع الشعار" : "Logo uploaded");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {display ? (
          <img src={display} alt="" className="h-16 w-16 rounded-lg border bg-white object-contain p-1"/>
        ) : (
          <div className="grid size-16 place-items-center rounded-lg border bg-gold/10 text-gold">
            <ImageIcon className="size-6"/>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {locale === "ar" ? "يظهر هذا الشعار في الفواتير وعروض الأسعار." : "Shown on invoices and quotes."}
        </div>
      </div>
      <Tabs defaultValue="upload">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="upload">{locale === "ar" ? "رفع ملف" : "Upload"}</TabsTrigger>
          <TabsTrigger value="url">{locale === "ar" ? "رابط" : "URL"}</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="pt-3">
          <input
            ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <Button type="button" variant="outline" disabled={disabled || uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin"/> : <Upload className="size-4"/>}
            {locale === "ar" ? "اختر صورة" : "Choose image"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">PNG · JPG · WEBP · SVG — max 4 MB</p>
        </TabsContent>
        <TabsContent value="url" className="pt-3 space-y-1.5">
          <Label className="sr-only">{locale === "ar" ? "رابط الشعار" : "Logo URL"}</Label>
          <Input
            placeholder="https://…/logo.png"
            value={value && /^https?:\/\//i.test(value) ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">{locale === "ar" ? "الصق رابطاً مباشراً للصورة." : "Paste a direct image link."}</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
