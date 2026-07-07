import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandMark } from "@/components/brand-mark";
import { useI18n } from "@/lib/i18n";
import { AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, Scale, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

const REMEMBER_KEY = "mohkam.remember_me";

function AuthErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const msg = String(error?.message || "");
  const isChunk = /Loading chunk|Failed to fetch dynamically imported module|ChunkLoadError|Importing a module script failed/i.test(msg);
  useEffect(() => {
    if (isChunk && typeof window !== "undefined") {
      const key = "__mohkam_auth_chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [isChunk]);
  return (
    <div className="min-h-screen grid place-items-center bg-pearl px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 card-elev text-center">
        <div className="mb-6 flex justify-center"><BrandMark /></div>
        <h1 className="font-serif text-2xl mb-2">Sign-in couldn't load</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isChunk
            ? "A newer version was deployed. We'll refresh and try again."
            : "Something went wrong loading this page. Please retry."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="gold"
            onClick={() => {
              try { sessionStorage.removeItem("__mohkam_auth_chunk_reload"); } catch {}
              reset();
              setTimeout(() => { if (typeof window !== "undefined") window.location.reload(); }, 400);
            }}
          >
            Try again
          </Button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth")({ component: AuthPage, errorComponent: AuthErrorBoundary });

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
  if (m.includes("password should be") || (m.includes("password") && m.includes("6")))
    return ar ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل." : "Password must be at least 6 characters.";
  if (m.includes("rate limit") || m.includes("too many"))
    return ar ? "محاولات كثيرة. حاول مرة أخرى بعد قليل." : "Too many attempts. Please try again shortly.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return ar ? "تعذّر الاتصال بالخادم. تحقق من الاتصال." : "Network error — check your connection and try again.";
  return ar ? "تعذّر إتمام العملية. حاول مرة أخرى." : "Something went wrong. Please try again.";
}

/** When "remember me" is off, move the persisted session to sessionStorage so it clears on tab close. */
function applyRememberPreference(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    if (!remember) {
      // Find the supabase auth token in localStorage and move it to sessionStorage.
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
          const val = localStorage.getItem(k);
          if (val) {
            sessionStorage.setItem(k, val);
            localStorage.removeItem(k);
          }
          break;
        }
      }
    }
  } catch {}
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
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(REMEMBER_KEY);
    return v === null ? true : v === "1";
  });

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
        applyRememberPreference(remember);
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
        applyRememberPreference(remember);
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
    "Sign in to your private legal workspace.";

  return (
    <div className="min-h-screen bg-pearl">
      <div className="mx-auto grid min-h-screen w-full max-w-[1400px] lg:grid-cols-2">
        {/* Left — editorial brand panel */}
        <aside className="relative hidden overflow-hidden lg:block">
          <div className="hero-gradient absolute inset-0" />
          <div className="arabesque absolute inset-0 opacity-40" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-between p-12 text-pearl">
            <div className="flex items-center gap-3">
              <BrandMark variant="dark" />
            </div>

            <div className="max-w-md">
              <div className="landing-eyebrow mb-5">Mohkam · Legal OS</div>
              <h2 className="font-serif text-5xl leading-[1.05] tracking-tight">
                Practice with <em className="text-gilded">precision.</em>
                <br />
                Move with <em className="text-gilded">confidence.</em>
              </h2>
              <div className="gold-rule my-8 w-24" />
              <p className="text-base leading-relaxed text-pearl/85">
                A discreet, editorial workspace for modern law firms — cases, clients, drafting and collections, unified under one signature.
              </p>

              <ul className="mt-10 space-y-4 text-sm text-pearl/80">
                <li className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full ring-1 ring-gold/50 bg-gold/10">
                    <ShieldCheck className="size-4 text-gold" />
                  </span>
                  Bank-grade encryption &amp; role-based access
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full ring-1 ring-gold/50 bg-gold/10">
                    <Scale className="size-4 text-gold" />
                  </span>
                  Built for firms across the region
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full ring-1 ring-gold/50 bg-gold/10">
                    <Sparkles className="size-4 text-gold" />
                  </span>
                  Intelligent drafting, timelines &amp; reminders
                </li>
              </ul>
            </div>

            <div className="text-xs uppercase tracking-[0.32em] text-pearl/50">
              © {new Date().getFullYear()} Mohkam
            </div>
          </div>
        </aside>

        {/* Right — auth card */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <BrandMark />
            </div>

            <div className="relative rounded-2xl border border-border/70 bg-card/95 p-8 shadow-[var(--shadow-elev-3)] backdrop-blur">
              <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

              <div className="mb-6">
                <div className="eyebrow mb-3 text-gold/80">
                  {mode === "signup" ? "Get started" :
                   mode === "magic" ? "Team access" :
                   mode === "forgot" ? "Account recovery" : "Sign in"}
                </div>
                <h1 className="font-serif text-3xl leading-tight tracking-tight">
                  {title.split(" ").slice(0, -1).join(" ")}{" "}
                  <em className="text-gilded">{title.split(" ").slice(-1)}</em>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                {errMsg && (
                  <Alert variant="destructive" className="border-destructive/40 bg-destructive/5 text-destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription className="text-[13px] leading-relaxed">{errMsg}</AlertDescription>
                  </Alert>
                )}
                {mode === "signup" && (
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 h-11" />
                  </div>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 h-11" />
                </div>
                {mode !== "magic" && mode !== "forgot" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs font-medium text-gold hover:underline"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "signin" && (
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(v === true)}
                      className="border-gold/60 data-[state=checked]:bg-gold data-[state=checked]:text-gold-foreground data-[state=checked]:border-gold"
                    />
                    <span>
                      {locale === "ar" ? "تذكّرني على هذا الجهاز" : "Remember me on this device"}
                    </span>
                  </label>
                )}

                <Button type="submit" variant="gold" className="h-11 w-full text-sm font-medium tracking-wide" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {mode === "signup" ? "Create account" :
                   mode === "magic" ? "Send sign-in link" :
                   mode === "forgot" ? "Send reset link" : "Sign in securely"}
                </Button>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
                  <Lock className="size-3" />
                  <span>End-to-end encrypted</span>
                </div>
              </form>

              <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
                <div className="h-px flex-1 bg-border" />
                <span>or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2 text-center text-sm">
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

            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our terms &amp; confidentiality policy.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
