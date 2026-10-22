"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Eye, EyeOff, Loader2, Mail, Lock, User, Sparkles, TrendingUp, ShieldCheck, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useAuthStore } from "@/lib/auth-store";
import { api, ApiError } from "@/lib/api-client";
import {
  isGoogleLoginConfigured,
  signInWithGoogle,
  friendlyGoogleError,
} from "@/lib/firebase-client";
import {
  getGoogleClientId,
  signInWithGIS,
} from "@/lib/google-auth";
import { toast } from "sonner";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7-.1.1C.5 8.9 0 10.4 0 12s.5 3.1 1.5 4.5l3.7-2.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.6c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.5 6.9l3.7 2.9c.9-2.9 3.6-5.2 6.8-5.2z"
      />
    </svg>
  );
}

export function AuthView() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const res = await api.post<{ user: any; token?: string; error?: string }>(endpoint, body);
      if (res?.user && res?.token) {
        setAuth(res.user, res.token);
        toast.success(mode === "login" ? "Welcome back!" : "Account created successfully!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      // Show the actual server error message (e.g. "An account with this email already exists")
      const msg = err?.message || "Authentication failed";
      toast.error(msg);
      // If email already exists, suggest switching to login
      if (msg.includes("already exists") && mode === "register") {
        setTimeout(() => {
          toast.info("Switching to Sign In — please use your password to log in.", { duration: 5000 });
          setMode("login");
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  const exchangeGoogleCredential = async (cred: { idToken?: string; accessToken?: string }) => {
    const res = await api.post<{ user: any; token?: string }>("/api/auth/google", cred);
    if (res?.user && res?.token) {
      setAuth(res.user, res.token);
      toast.success("Signed in with Google!");
    } else {
      throw new Error("Invalid response from server");
    }
  };

  const exchangeGoogleToken = async (idToken: string) => {
    return exchangeGoogleCredential({ idToken });
  };

  const handleGoogle = async () => {
    // 1. If Google GIS Client ID is configured in .env:
    if (getGoogleClientId()) {
      setGoogleLoading(true);
      try {
        const { accessToken } = await signInWithGIS();
        await exchangeGoogleCredential({ accessToken });
      } catch (err: any) {
        console.error("[google-login][gis] failed:", err);
        toast.error(err?.message || "Google sign-in failed");
      } finally {
        setGoogleLoading(false);
      }
      return;
    }

    // 2. If Firebase Google sign-in is configured:
    if (isGoogleLoginConfigured()) {
      // Trigger popup synchronously in click event stack to prevent popup blocker
      const loginPromise = signInWithGoogle();
      setGoogleLoading(true);
      loginPromise
        .then((idToken) => exchangeGoogleCredential({ idToken }))
        .catch((err) => {
          if (err?.code !== "auth/popup-blocked" && err?.code !== "auth/popup-closed-by-user") {
            console.error("[google-login][popup] failed:", err?.code || err?.message || err);
          } else {
            console.warn("[google-login][popup]:", err?.code || err?.message);
          }
          toast.error(friendlyGoogleError(err), { duration: 6000 });
        })
        .finally(() => {
          setGoogleLoading(false);
        });
      return;
    }

    // 3. Unconfigured fallback
    toast.error("Google sign-in is not configured. Please check your .env file.");
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      toast.error("Please enter your registered email address");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        message?: string;
        emailSent?: boolean;
        emailConfigured?: boolean;
        debugOtp?: string;
      }>("/api/auth/forgot", { email });

      setForgotStep("otp");
      setEmailSent(!!res?.emailSent);
      setDebugOtp(res?.debugOtp || null);
      setCountdown(60);

      if (res?.emailSent) {
        toast.success(`Verification code sent to ${email}`);
      } else if (res?.debugOtp) {
        toast.info(`Dev Mode: Your OTP is ${res.debugOtp}`, { duration: 10000 });
      } else {
        toast.success(res?.message || "Verification code generated");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP code");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        message?: string;
        user?: any;
        token?: string;
      }>("/api/auth/reset", {
        email,
        otp,
        password: newPassword,
      });

      if (res?.user && res?.token) {
        setAuth(res.user, res.token);
        toast.success("Password reset successfully! Welcome back.");
      } else {
        toast.success(res?.message || "Password updated! Please sign in.");
        setMode("login");
        setForgotStep("email");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };
  const handleDemo = async () => {
    setLoading(true);
    try {
      try {
        const res = await api.post<{ user: any; token?: string }>("/api/auth/login", {
          email: "demo@finsage.ai",
          password: "demo1234",
        });
        if (res?.user && res?.token) {
          setAuth(res.user, res.token);
          toast.success("Welcome to the FinSage demo!");
        } else {
          throw new Error("Login failed");
        }
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 404) {
          const res = await api.post<{ user: any; token?: string }>("/api/auth/register", {
            name: "Demo User",
            email: "demo@finsage.ai",
            password: "demo1234",
          });
          if (res?.user && res?.token) {
            setAuth(res.user, res.token);
          }
          try {
            await api.post("/api/seed");
            toast.success("Demo account created with sample data!");
          } catch {
            toast.success("Demo account created!");
          }
        } else {
          throw e;
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left - Branding */}
      <div className="relative lg:w-1/2 mesh-bg bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-950 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "4s" }} />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Brain className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FinSage AI</h1>
              <p className="text-xs text-muted-foreground">Personal Budget Planning Agent</p>
            </div>
          </div>

          <div className="max-w-md py-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl lg:text-5xl font-bold tracking-tight leading-tight"
            >
              Your AI-powered <span className="gradient-text">financial future</span> starts here.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-4 text-muted-foreground text-base lg:text-lg"
            >
              Track expenses, set smart budgets, predict your savings, and chat with an AI advisor that knows your money inside out.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 space-y-3"
            >
              {[
                { icon: Sparkles, text: "AI Financial Advisor that analyzes your real data" },
                { icon: TrendingUp, text: "ML-powered expense & savings predictions" },
                { icon: ShieldCheck, text: "Secure, private, and personalized to you" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-white/60 dark:bg-white/10 backdrop-blur flex items-center justify-center">
                    <f.icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm text-foreground/80">{f.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            <span>Bank-grade encryption • JWT secured • Your data stays private</span>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-3xl p-8 shadow-2xl shadow-emerald-500/5">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight">
                {mode === "login"
                  ? "Welcome back"
                  : mode === "register"
                  ? "Create your account"
                  : forgotStep === "otp"
                  ? "Enter Verification Code"
                  : "Reset password"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login"
                  ? "Sign in to continue managing your finances"
                  : mode === "register"
                  ? "Start your journey to financial freedom"
                  : forgotStep === "otp"
                  ? emailSent
                    ? `We sent a 6-digit verification code to ${email}`
                    : `Enter the 6-digit OTP code to reset password for ${email}`
                  : "Enter your registered email to receive a 6-digit verification code"}
              </p>
            </div>

            {mode === "forgot" ? (
              forgotStep === "email" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Registered Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-10 h-11"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full h-11 gradient-emerald text-white border-0 hover:opacity-90 shadow-lg shadow-emerald-500/25"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Send 6-Digit OTP"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setForgotStep("email");
                    }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="size-3.5" /> Back to sign in
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetWithOtp} className="space-y-4">
                  {debugOtp && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-amber-700 dark:text-amber-300">
                          Demo / Local OTP:{" "}
                          <span className="font-mono text-sm tracking-widest text-foreground font-bold ml-1">
                            {debugOtp}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {emailSent ? "Also sent to your email" : "Email provider is not configured in .env"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setOtp(debugOtp)}
                        className="h-7 text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shrink-0"
                      >
                        Auto-fill
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2 text-center">
                    <Label className="text-xs text-muted-foreground">Enter 6-digit OTP code</Label>
                    <div className="flex justify-center py-1">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 h-11"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || otp.length !== 6 || newPassword.length < 6}
                    className="w-full h-11 gradient-emerald text-white border-0 hover:opacity-90 shadow-lg shadow-emerald-500/25"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Reset Password & Sign In"}
                  </Button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setForgotStep("email")}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <ArrowLeft className="size-3" /> Change email
                    </button>

                    {countdown > 0 ? (
                      <span className="text-muted-foreground">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={loading}
                        className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="size-3" /> Resend OTP
                      </button>
                    )}
                  </div>
                </form>
              )
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setForgotStep("email");
                        setOtp("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setDebugOtp(null);
                      }}
                      className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 gradient-emerald text-white border-0 hover:opacity-90 shadow-lg shadow-emerald-500/25"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              onClick={handleGoogle}
              disabled={loading || googleLoading}
              variant="outline"
              className="w-full h-11 mb-3"
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GoogleIcon className="size-4" />
              )}
              Continue with Google
            </Button>

            <Button
              onClick={handleDemo}
              disabled={loading}
              variant="outline"
              className="w-full h-11 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-emerald-500" />}
              Try Demo with Sample Data
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
