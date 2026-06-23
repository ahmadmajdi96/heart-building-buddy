import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/set-password")({ component: SetPasswordPage });

function SetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        toast.error("Open the invite link from your email to set a password.");
        navigate({ to: "/auth" });
        return;
      }
      setEmail(data.user.email ?? null);
      setReady(true);
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirm) return toast.error("Passwords don't match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password set. Welcome aboard!");
      navigate({ to: "/app/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-gold" /></div>;

  return (
    <div className="min-h-screen grid place-items-center bg-pearl px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 card-elev">
        <div className="mb-6 flex justify-center"><BrandMark /></div>
        <h1 className="font-serif text-3xl text-center mb-1">Choose your password</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {email ? `Set a password for ${email}` : "Finish setting up your account."}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cf">Confirm password</Label>
            <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="mt-1" />
          </div>
          <Button type="submit" variant="gold" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Save password & continue
          </Button>
        </form>
      </div>
    </div>
  );
}
