import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandMark } from "@/components/brand-mark";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type Mode = "signin" | "signup" | "magic" | "forgot";

function friendlyAuthError(raw: string, mode: Mode, locale: "ar" | "en"): string {
  const m = raw.toLowerCase();
  const ar = locale === "ar";
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("invalid email or password"))
    return ar ? "بريد إلكتروني أو كلمة مرور غير صحيحة." : "Invalid email or password. Please try again.";
  if (m.includes("email not confirmed"))
    return ar ? "لم يتم تأكيد البريد الإلكتروني بعد. تحقق من بريدك." : "Email not confirmed yet. Please check your inbox.";
  if (m.includes("user not found") || m.includes("no user found") || (mode === "magic" && m.includes("signups not allowed")))
    return ar ? "لا يوجد حساب بهذا البريد الإلكتروني." : "No account exists for this email.";
  if (m.includes("already registered") || m.includes("user already"))
    return ar ? "هذا البريد الإلكتروني مسجّل مسبقاً." : "This email is already registered. Try signing in.";
  if (m.includes("password should be") || m.includes("password") && m.includes("6"))
    return ar ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل." : "Password must be at least 6 characters.";
  if (m.includes("rate limit") || m.includes("too many"))
    return ar ? "محاولات كثيرة. حاول مرة أخرى بعد قليل." : "Too many attempts. Please try again shortly.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return ar ? "تعذّر الاتصال بالخادم. تحقق من الاتصال." : "Network error — check your connection and try again.";
  return ar ? "تعذّر إتمام العملية. حاول مرة أخرى." : "Something went wrong. Please try again.";
}


function AuthPage() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const [mode, setModeRaw] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const setMode = (m: Mode) => { setErrMsg(null); setModeRaw(m); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/app/dashboard", data: { full_name: name } },
        });
        if (error) throw error;
        toast.success(locale === "ar" ? "تم إنشاء الحساب." : "Account created. Check your email if confirmation is required.");
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
        toast.success(locale === "ar" ? "تم إرسال رابط تسجيل الدخول." : "Sign-in link sent. Check your email — open it on this device to set your password.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/set-password",
        });
        if (error) throw error;
        toast.success(locale === "ar" ? "تم إرسال رابط إعادة التعيين." : "Password reset link sent. Check your email.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app/dashboard" });
      }
    } catch (e) {
      const msg = friendlyAuthError((e as Error).message ?? "", mode, locale === "ar" ? "ar" : "en");
      setErrMsg(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  }


  const title =
    mode === "signup" ? "Create your account" :
    mode === "magic" ? "Team member sign-in" :
    mode === "forgot" ? "Reset your password" : "Welcome back";
  const subtitle =
    mode === "signup" ? "Set up your private legal workspace." :
    mode === "magic" ? "Enter the email your firm invited. We'll send a one-time link." :
    mode === "forgot" ? "Enter your email and we'll send you a reset link." :
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
          {mode !== "magic" && mode !== "forgot" && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1" />
            </div>
          )}
          <Button type="submit" variant="gold" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "signup" ? "Create account" :
             mode === "magic" ? "Send sign-in link" :
             mode === "forgot" ? "Send reset link" : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 space-y-2 text-center text-sm">
          {mode === "signin" && (
            <button onClick={() => setMode("forgot")} className="block w-full text-muted-foreground hover:text-foreground">
              Forgot your password?
            </button>
          )}
          {mode === "forgot" && (
            <button onClick={() => setMode("signin")} className="block w-full text-gold hover:underline">
              Back to sign-in
            </button>
          )}
          {mode !== "magic" && mode !== "forgot" ? (
            <button onClick={() => setMode("magic")} className="block w-full text-gold hover:underline">
              Invited team member? Sign in without a password
            </button>
          ) : mode === "magic" ? (
            <button onClick={() => setMode("signin")} className="block w-full text-gold hover:underline">
              Back to password sign-in
            </button>
          ) : null}
          {(mode === "signin" || mode === "signup") && (
            <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="block w-full text-muted-foreground hover:text-foreground">
              {mode === "signup" ? "Have an account? Sign in" : "New here? Create an account"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

