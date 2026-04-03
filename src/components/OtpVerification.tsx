import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OtpVerificationProps {
  email: string;
  onBack: () => void;
  onVerified: () => void;
}

export function OtpVerification({ email, onBack, onVerified }: OtpVerificationProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  }, [otp]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  }, [otp]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
    }
  }, []);

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) { toast.error("Please enter the full 6-digit code"); return; }
    if (attempts >= 5) { toast.error("Too many attempts. Please request a new code."); return; }

    setLoading(true);
    try {
      // Get pending signup data from sessionStorage
      const pendingRaw = sessionStorage.getItem("pending_signup");
      if (!pendingRaw) {
        toast.error("Session expired. Please sign up again.");
        onBack();
        return;
      }

      const pending = JSON.parse(pendingRaw);
      
      // Check if OTP expired
      if (Date.now() > pending.expires) {
        toast.error("Code has expired. Please request a new one.");
        setAttempts((a) => a + 1);
        return;
      }

      // Verify OTP
      if (code !== pending.otp) {
        setAttempts((a) => a + 1);
        toast.error("Invalid code. Please try again.");
        return;
      }

      // OTP verified! Now create the actual account
      const { data, error } = await supabase.auth.signUp({
        email: pending.email,
        password: pending.password,
        options: { 
          emailRedirectTo: window.location.origin,
          data: { email_verified: true }
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Clear pending signup
      sessionStorage.removeItem("pending_signup");

      // Send welcome email
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/send-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "welcome",
              to: pending.email,
              data: {
                name: pending.email.split("@")[0],
                email: pending.email,
              },
            }),
          }
        );
      } catch {
        // Welcome email is non-critical
      }

      toast.success("Email verified! Account created successfully!");
      onVerified();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const pendingRaw = sessionStorage.getItem("pending_signup");
      if (!pendingRaw) {
        toast.error("Session expired. Please sign up again.");
        onBack();
        return;
      }

      const pending = JSON.parse(pendingRaw);
      
      // Generate new OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      pending.otp = newOtp;
      pending.expires = Date.now() + 600000;
      sessionStorage.setItem("pending_signup", JSON.stringify(pending));

      // Send new OTP email
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "verification", to: email, data: { otp: newOtp } }),
        }
      );

      if (!res.ok) throw new Error("Failed to resend");

      toast.success("New verification code sent!");
      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      setAttempts(0);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Verify your email</h1>
          <p className="text-sm text-muted-foreground mt-1">
            We sent a 6-digit code to
          </p>
          <p className="text-sm font-medium text-foreground mt-0.5">{email}</p>
        </div>

        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className={cn(
                "w-11 h-12 text-center text-lg font-display font-bold bg-card border rounded-lg text-foreground focus:outline-none focus:ring-2 transition-all",
                digit ? "border-primary focus:ring-primary/30" : "border-border focus:ring-ring/30"
              )}
            />
          ))}
        </div>

        {attempts >= 5 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5 mb-4 text-center">
            <p className="text-xs text-destructive">Too many attempts. Please request a new code.</p>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length !== 6 || attempts >= 5}
          className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Verify & Create Account
        </button>

        <div className="text-center mt-4">
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className={cn(
              "text-sm font-medium transition-colors",
              resendCooldown > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:underline"
            )}
          >
            {resendCooldown > 0 ? (
              <>Resend code in <span className="font-mono-data">{resendCooldown}s</span></>
            ) : (
              "Resend verification code"
            )}
          </button>
        </div>

        <div className="text-center mt-4">
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign up
          </button>
        </div>
      </motion.div>
    </div>
  );
}
