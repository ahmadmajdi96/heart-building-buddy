import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JITSI_DOMAIN, JITSI_EXTERNAL_API_URL } from "@/lib/jitsi-config";


export const Route = createFileRoute("/app/meetings/join/$room")({ component: JoinRoom });

function JoinRoom() {
  const { locale } = useI18n();
  const { room } = useParams({ from: "/app/meetings/join/$room" });
  const holder = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setName(data.user.user_metadata?.full_name || data.user.email || "");
    })();
  }, []);

  function join() {
    if (!name.trim()) return;
    setJoined(true);
    const ensureScript = () => new Promise<void>((resolve, reject) => {
      if ((window as any).JitsiMeetExternalAPI) return resolve();
      const s = document.createElement("script");
      s.src = JITSI_EXTERNAL_API_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Jitsi"));
      document.head.appendChild(s);
    });
    setTimeout(() => {
      ensureScript().then(() => {
        if (!holder.current) return;
        apiRef.current = new (window as any).JitsiMeetExternalAPI(JITSI_DOMAIN, {

          roomName: room,
          parentNode: holder.current,
          width: "100%", height: "100%",
          userInfo: { displayName: name },
          configOverwrite: { prejoinPageEnabled: false },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false },
        });
      });
    }, 50);
  }

  useEffect(() => () => { try { apiRef.current?.dispose(); } catch {} }, []);

  return (
    <div className="min-h-screen bg-background">
      {!joined ? (
        <div className="grid min-h-screen place-items-center p-6">
          <div className="card-elev w-full max-w-md rounded-xl border bg-card p-6 space-y-4">
            <h1 className="font-serif text-2xl">{locale === "ar" ? "انضم إلى الاجتماع" : "Join meeting"}</h1>
            <p className="text-sm text-muted-foreground">{locale === "ar" ? "أدخل اسمك للانضمام." : "Enter your name to join."}</p>
            <Input placeholder={locale === "ar" ? "الاسم" : "Your name"} value={name} onChange={(e) => setName(e.target.value)} />
            <Button variant="gold" onClick={join} className="w-full">{locale === "ar" ? "انضم" : "Join"}</Button>
          </div>
        </div>
      ) : (
        <div ref={holder} className="h-screen w-screen" />
      )}
    </div>
  );
}
