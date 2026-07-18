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
import { AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, Scale, Sparkles, Lock, Globe } from "lucide-react";
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
  if (m.includes("weak") || m.includes("pwned") || m.includes("known to be"))
    return ar
      ? "كلمة المرور شائعة أو مسرّبة سابقاً. اختر كلمة مرور أقوى (٨ أحرف أو أكثر، مع أرقام ورموز)."
      : "This password is too common or has appeared in a breach. Choose a stronger one (8+ chars with numbers & symbols).";
  if (m.includes("password should be") || (m.includes("password") && m.includes("6")))
    return ar ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل." : "Password must be at least 6 characters.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return ar ? "التسجيل مغلق حالياً. تواصل مع مسؤول المكتب." : "Signups are currently disabled. Contact your firm admin.";
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

const STR = {
  en: {
    eyebrow_signin: "Sign in",
    eyebrow_signup: "Get started",
    eyebrow_magic: "Team access",
    eyebrow_forgot: "Account recovery",
    title_signin: ["Welcome", "back"],
    title_signup: ["Create your", "account"],
    title_magic: ["Team member", "sign-in"],
    title_forgot: ["Reset your", "password"],
    sub_signin: "Sign in to your private legal workspace.",
    sub_signup: "Set up your private legal workspace.",
    sub_magic: "Enter the email your firm invited. We'll send a one-time link.",
    sub_forgot: "Enter your email and we'll send you a reset link.",
    full_name: "Full name",
    email: "Email",
    password: "Password",
    forgot_short: "Forgot?",
    show_pw: "Show password",
    hide_pw: "Hide password",
    remember: "Remember me on this device",
    cta_signin: "Sign in securely",
    cta_signup: "Create account",
    cta_magic: "Send sign-in link",
    cta_forgot: "Send reset link",
    encrypted: "End-to-end encrypted",
    or: "or",
    back_signin: "Back to sign-in",
    invited: "Invited team member? Sign in without a password",
    back_pw: "Back to password sign-in",
    have_account: "Have an account? Sign in",
    new_here: "New here? Create an account",
    terms: "By continuing you agree to our terms & confidentiality policy.",
    // brand panel
    panel_eyebrow: "Mohkam · Legal OS",
    panel_line1a: "Practice with",
    panel_line1b: "precision.",
    panel_line2a: "Move with",
    panel_line2b: "confidence.",
    panel_body: "A discreet, editorial workspace for modern law firms — cases, clients, drafting and collections, unified under one signature.",
    feat_security: "Bank-grade encryption & role-based access",
    feat_region: "Built for firms across the region",
    feat_ai: "Intelligent drafting, timelines & reminders",
    // toasts
    toast_signup: "Account created. Check your email if confirmation is required.",
    toast_magic: "Sign-in link sent. Check your email — open it on this device to set your password.",
    toast_reset: "Password reset link sent. Check your email.",
    lang_switch: "العربية",
  },
  ar: {
    eyebrow_signin: "تسجيل الدخول",
    eyebrow_signup: "ابدأ الآن",
    eyebrow_magic: "دخول أعضاء الفريق",
    eyebrow_forgot: "استعادة الحساب",
    title_signin: ["مرحباً بعودتك", ""],
    title_signup: ["أنشئ", "حسابك"],
    title_magic: ["دخول عضو", "الفريق"],
    title_forgot: ["إعادة تعيين", "كلمة المرور"],
    sub_signin: "سجّل الدخول إلى مساحة العمل القانونية الخاصة بك.",
    sub_signup: "أنشئ مساحة العمل القانونية الخاصة بك.",
    sub_magic: "أدخل البريد الإلكتروني الذي دعاك به مكتبك. سنرسل رابطاً لمرة واحدة.",
    sub_forgot: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.",
    full_name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    forgot_short: "نسيتها؟",
    show_pw: "إظهار كلمة المرور",
    hide_pw: "إخفاء كلمة المرور",
    remember: "تذكّرني على هذا الجهاز",
    cta_signin: "دخول آمن",
    cta_signup: "إنشاء الحساب",
    cta_magic: "أرسل رابط الدخول",
    cta_forgot: "أرسل رابط إعادة التعيين",
    encrypted: "تشفير من الطرف إلى الطرف",
    or: "أو",
    back_signin: "العودة لتسجيل الدخول",
    invited: "عضو فريق مدعو؟ سجّل الدخول بدون كلمة مرور",
    back_pw: "العودة للدخول بكلمة المرور",
    have_account: "لديك حساب؟ سجّل الدخول",
    new_here: "جديد هنا؟ أنشئ حساباً",
    terms: "بالمتابعة فإنك توافق على شروط الاستخدام وسياسة السرية.",
    panel_eyebrow: "محكم · منظومة العمل القانوني",
    panel_line1a: "مارس القانون",
    panel_line1b: "بدقّة.",
    panel_line2a: "تحرّك",
    panel_line2b: "بثقة.",
    panel_body: "مساحة عمل هادئة وأنيقة لمكاتب المحاماة الحديثة — القضايا والعملاء والصياغة والتحصيل، كلها تحت توقيع واحد.",
    feat_security: "تشفير بمستوى المصارف وصلاحيات دقيقة",
    feat_region: "مصمَّمة لمكاتب المنطقة",
    feat_ai: "صياغة ذكية، جداول زمنية وتذكيرات",
    toast_signup: "تم إنشاء الحساب. تحقق من بريدك إذا لزم التأكيد.",
    toast_magic: "تم إرسال رابط الدخول. افتحه على هذا الجهاز لضبط كلمة المرور.",
    toast_reset: "تم إرسال رابط إعادة تعيين كلمة المرور. تحقق من بريدك.",
    lang_switch: "English",
  },
} as const;

function AuthPage() {
  const navigate = useNavigate();
  const { locale, setLocale, dir } = useI18n();
  const t = STR[locale === "ar" ? "ar" : "en"];
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
        toast.success(t.toast_signup);
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
        toast.success(t.toast_magic);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/set-password",
        });
        if (error) throw error;
        toast.success(t.toast_reset);
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

  const eyebrow =
    mode === "signup" ? t.eyebrow_signup :
    mode === "magic" ? t.eyebrow_magic :
    mode === "forgot" ? t.eyebrow_forgot : t.eyebrow_signin;
  const titleParts =
    mode === "signup" ? t.title_signup :
    mode === "magic" ? t.title_magic :
    mode === "forgot" ? t.title_forgot : t.title_signin;
  const subtitle =
    mode === "signup" ? t.sub_signup :
    mode === "magic" ? t.sub_magic :
    mode === "forgot" ? t.sub_forgot : t.sub_signin;
  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-pearl" dir={dir}>
      {/* Language toggle — top corner, works in both LTR and RTL */}
      <button
        type="button"
        onClick={() => setLocale(isAr ? "en" : "ar")}
        className={`fixed top-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition hover:border-gold hover:text-gold ${isAr ? "left-4" : "right-4"}`}
        aria-label="Switch language"
      >
        <Globe className="size-3.5" />
        {t.lang_switch}
      </button>

      <div className="mx-auto grid min-h-screen w-full max-w-[1400px] lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden lg:block">
          <div className="hero-gradient absolute inset-0" />
          <div className="arabesque absolute inset-0 opacity-40" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-between p-12 text-pearl">
            <div className="flex items-center gap-3">
              <BrandMark tone="dark" />
            </div>

            <div className="max-w-md">
              <div className="landing-eyebrow mb-5">{t.panel_eyebrow}</div>
              <h2 className="font-serif text-5xl leading-[1.1] tracking-tight">
                {t.panel_line1a} <em className="text-gilded">{t.panel_line1b}</em>
                <br />
                {t.panel_line2a} <em className="text-gilded">{t.panel_line2b}</em>
              </h2>
              <div className="gold-rule my-8 w-24" />
              <p className="text-base leading-relaxed text-pearl/85">{t.panel_body}</p>

              <ul className="mt-10 space-y-4 text-sm text-pearl/80">
                {[
                  { icon: ShieldCheck, text: t.feat_security },
                  { icon: Scale, text: t.feat_region },
                  { icon: Sparkles, text: t.feat_ai },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full ring-1 ring-gold/50 bg-gold/10">
                      <Icon className="size-4 text-gold" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-xs uppercase tracking-[0.32em] text-pearl/50">
              © {new Date().getFullYear()} Mohkam
            </div>
          </div>
        </aside>

        {/* Auth card */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <BrandMark />
            </div>

            <div className="relative rounded-2xl border border-border/70 bg-card/95 p-8 shadow-[var(--shadow-elev-3)] backdrop-blur">
              <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

              <div className="mb-6">
                <div className="eyebrow mb-3 text-gold/80">{eyebrow}</div>
                <h1 className="font-serif text-3xl leading-tight tracking-tight">
                  {titleParts[0]} {titleParts[1] && <em className="text-gilded">{titleParts[1]}</em>}
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
                    <Label htmlFor="name">{t.full_name}</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 h-11" />
                  </div>
                )}
                <div>
                  <Label htmlFor="email">{t.email}</Label>
                  <Input id="email" type="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 h-11" />
                </div>
                {mode !== "magic" && mode !== "forgot" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{t.password}</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs font-medium text-gold hover:underline"
                        >
                          {t.forgot_short}
                        </button>
                      )}
                    </div>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        dir="ltr"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className={`h-11 ${isAr ? "pl-10" : "pr-10"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? t.hide_pw : t.show_pw}
                        className={`absolute inset-y-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground ${isAr ? "left-0" : "right-0"}`}
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
                    <span>{t.remember}</span>
                  </label>
                )}

                <Button type="submit" variant="gold" className="h-11 w-full text-sm font-medium tracking-wide" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {mode === "signup" ? t.cta_signup :
                   mode === "magic" ? t.cta_magic :
                   mode === "forgot" ? t.cta_forgot : t.cta_signin}
                </Button>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
                  <Lock className="size-3" />
                  <span>{t.encrypted}</span>
                </div>
              </form>

              <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-muted-foreground/70">
                <div className="h-px flex-1 bg-border" />
                <span>{t.or}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2 text-center text-sm">
                {mode === "forgot" && (
                  <button onClick={() => setMode("signin")} className="block w-full text-gold hover:underline">
                    {t.back_signin}
                  </button>
                )}
                {mode !== "magic" && mode !== "forgot" ? (
                  <button onClick={() => setMode("magic")} className="block w-full text-gold hover:underline">
                    {t.invited}
                  </button>
                ) : mode === "magic" ? (
                  <button onClick={() => setMode("signin")} className="block w-full text-gold hover:underline">
                    {t.back_pw}
                  </button>
                ) : null}
                {(mode === "signin" || mode === "signup") && (
                  <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="block w-full text-muted-foreground hover:text-foreground">
                    {mode === "signup" ? t.have_account : t.new_here}
                  </button>
                )}
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">{t.terms}</p>
          </div>
        </main>
      </div>
    </div>
  );
}

