import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, Loader2, Eye, EyeOff, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, ShieldCheck, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { OtpVerification } from "@/components/OtpVerification";
import loginIllustration1 from "@/assets/login-illustration.gif";
import loginIllustration2 from "@/assets/login-illustration-2.gif";

/* ───────── password helpers ───────── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-destructive" };
  if (score <= 3) return { score, label: "Medium", color: "bg-yellow-500" };
  return { score, label: "Strong", color: "bg-green-500" };
}

function getPasswordChecks(pw: string) {
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "Lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "Number", ok: /\d/.test(pw) },
    { label: "Special character", ok: /[^a-zA-Z0-9]/.test(pw) },
  ];
}

/* ───────── rate limit tracker ───────── */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const isLocked = Date.now() < lockedUntil;
  const lockRemaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLocked) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [isLocked]);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);

  const validateEmail = useCallback(() => {
    if (!email) { setEmailError(""); return; }
    if (!emailValid) setEmailError("Invalid email format");
    else setEmailError("");
  }, [email, emailValid]);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const allChecksPass = checks.every((c) => c.ok);
  const confirmMatch = confirmPassword === password && confirmPassword.length > 0;

  const canSubmitLogin = emailValid && password.length >= 6 && !isLocked;
  const canSubmitSignup = emailValid && allChecksPass && confirmMatch && !isLocked;
  const canSubmitForgot = emailValid && !isLocked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) { toast.error(`Too many attempts. Try again in ${lockRemaining}s`); return; }
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent! Check your email.");
        return;
      }

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAttempts((a) => {
            const next = a + 1;
            if (next >= MAX_ATTEMPTS) {
              setLockedUntil(Date.now() + LOCKOUT_MS);
              toast.error("Too many failed attempts. Locked for 60 seconds.");
            }
            return next;
          });
          if (error.message.includes("Invalid login")) throw new Error("Incorrect email or password");
          throw error;
        }
        setAttempts(0);
        toast.success("Signed in!");
      }

      if (mode === "signup") {
        setLoading(true);
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        sessionStorage.setItem("pending_signup", JSON.stringify({ email, password, otp, expires: Date.now() + 600000 }));
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/send-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "verification", to: email, data: { otp } }),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to send verification email");
        }
        setOtpEmail(email);
        setShowOtp(true);
        return;
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "signup" | "forgot") => {
    setMode(m);
    setEmailError("");
    setPasswordTouched(false);
    setConfirmTouched(false);
  };

  if (showOtp) {
    return (
      <OtpVerification
        email={otpEmail}
        onBack={() => setShowOtp(false)}
        onVerified={() => {
          toast.success("Email verified! You can now sign in.");
          setShowOtp(false);
          setMode("login");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left: Form Side ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md"
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Cloud className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">YoCloud</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {mode === "login"
                ? "Enter your credentials to access your cloud"
                : mode === "signup"
                ? "Start managing your files securely"
                : "Enter your email to get a reset link"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  onBlur={validateEmail}
                  onKeyDown={(e) => { if (e.key === "Enter" && mode !== "forgot") passwordRef.current?.focus(); }}
                  className={cn(
                    "w-full h-12 pl-11 pr-4 bg-card border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all",
                    emailError ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-ring/30"
                  )}
                />
              </div>
              <AnimatePresence>
                {emailError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-destructive flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" /> {emailError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "login" ? 6 : 8}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (!passwordTouched) setPasswordTouched(true); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && mode === "signup") confirmRef.current?.focus(); }}
                    className="w-full h-12 pl-11 pr-11 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {mode === "signup" && passwordTouched && password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 h-full rounded-full transition-colors duration-300",
                              i <= strength.score ? strength.color : "bg-secondary"
                            )}
                          />
                        ))}
                      </div>
                      <span className={cn("text-[10px] font-semibold min-w-[48px] text-right",
                        strength.score <= 1 ? "text-destructive" : strength.score <= 3 ? "text-yellow-600" : "text-green-600"
                      )}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {checks.map((c) => (
                        <div key={c.label} className="flex items-center gap-1.5">
                          {c.ok ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn("text-[10px]", c.ok ? "text-green-600" : "text-muted-foreground")}>
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Confirm password */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={confirmRef}
                    type={showConfirm ? "text" : "password"}
                    required
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (!confirmTouched) setConfirmTouched(true); }}
                    className={cn(
                      "w-full h-12 pl-11 pr-11 bg-card border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all",
                      confirmTouched && !confirmMatch && confirmPassword
                        ? "border-destructive focus:ring-destructive/30"
                        : "border-border focus:ring-ring/30"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <AnimatePresence>
                  {confirmTouched && confirmPassword && !confirmMatch && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-destructive flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Passwords don't match
                    </motion.p>
                  )}
                  {confirmTouched && confirmMatch && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-green-600 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Forgot password link */}
            {mode === "login" && (
              <div className="text-right -mt-1">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Lock warning */}
            <AnimatePresence>
              {isLocked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3"
                >
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">
                    Too many attempts. Try again in <span className="font-mono font-bold">{lockRemaining}s</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                loading ||
                isLocked ||
                (mode === "login" && !canSubmitLogin) ||
                (mode === "signup" && !canSubmitSignup) ||
                (mode === "forgot" && !canSubmitForgot)
              }
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </button>
          </form>

          {/* Footer links */}
          <div className="text-center mt-8">
            {mode === "forgot" ? (
              <button
                onClick={() => switchMode("login")}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            )}
          </div>

          {/* Terms */}
          <p className="text-[10px] text-muted-foreground/60 text-center mt-6">
            By continuing, you agree to YoCloud's Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </div>

      {/* ── Right: Illustration Side (desktop only) ── */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-background relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative z-10 max-w-lg p-8 flex flex-col items-center gap-6"
        >
          <img
            src={mode === "signup" ? loginIllustration2 : loginIllustration1}
            alt={mode === "signup" ? "YoCloud signup illustration" : "YoCloud login illustration"}
            className="w-72 h-auto"
          />
          <div className="text-center mt-4">
            <h2 className="text-xl font-bold text-foreground">
              {mode === "signup" ? "Join YoCloud today" : "Your files, everywhere"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              {mode === "signup"
                ? "Create your account and start managing files securely in the cloud."
                : "Securely store, share, and collaborate on files with YoCloud's powerful workspace."}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
