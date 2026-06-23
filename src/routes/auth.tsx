import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type Mode = "signin" | "signup" | "magic";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/app/dashboard", data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
        navigate({ to: "/app/dashboard" });
      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin + "/set-password",
            shouldCreateUser: false,
          },
        });
        if (error) throw error;
        toast.success("Sign-in link sent. Check your email — open it on this device to set your password.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app/dashboard" });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  const title =
    mode === "signup" ? "Create your account" :
    mode === "magic" ? "Team member sign-in" : "Welcome back";
  const subtitle =
    mode === "signup" ? "Set up your private legal workspace." :
    mode === "magic" ? "Enter the email your firm invited. We'll send a one-time link." :
    "Sign in to your workspace.";

  return (
    <div className="min-h-screen grid place-items-center bg-pearl px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 card-elev">
        <div className="mb-6 flex justify-center"><BrandMark /></div>
        <h1 className="font-serif text-3xl text-center mb-1">{title}</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">{subtitle}</p>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          {mode !== "magic" && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1" />
            </div>
          )}
          <Button type="submit" variant="gold" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "signup" ? "Create account" : mode === "magic" ? "Send sign-in link" : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 space-y-2 text-center text-sm">
          {mode !== "magic" ? (
            <button onClick={() => setMode("magic")} className="block w-full text-gold hover:underline">
              Invited team member? Sign in without a password
            </button>
          ) : (
            <button onClick={() => setMode("signin")} className="block w-full text-gold hover:underline">
              Back to password sign-in
            </button>
          )}
          <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="block w-full text-muted-foreground hover:text-foreground">
            {mode === "signup" ? "Have an account? Sign in" : "New here? Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
}
