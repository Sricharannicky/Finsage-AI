"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Eye, EyeOff, Loader2, Mail, Lock, User, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import { api, ApiError } from "@/lib/api-client";
import { isGoogleLoginConfigured, signInWithGoogle } from "@/lib/firebase-client";
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
  const [forgotSent, setForgotSent] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const googleReady = isGoogleLoginConfigured();

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

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const res = await api.post<{ user: any; token?: string }>("/api/auth/google", { idToken });
      if (res?.user && res?.token) {
        setAuth(res.user, res.token);
        toast.success("Signed in with Google!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      toast.error(err?.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ message?: string }>("/api/auth/forgot", { email });
      setForgotSent(true);
      toast.success(res.message || "Reset link sent!");
    } catch (err: any) {
      toast.error(err?.message || "Request failed");
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
                {mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Reset password"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login"
                  ? "Sign in to continue managing your finances"
                  : mode === "register"
                    ? "Start your journey to financial freedom"
                    : "Enter your email and we'll send you a reset link"}
              </p>
            </div>

            {mode === "forgot" ? (
              forgotSent ? (
                <div className="text-center py-4">
                  <Mail className="size-10 text-emerald-500 mx-auto mb-3" />
                  <p className="font-medium">Check your inbox</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    If an account exists for {email || "that email"}, a reset link is on its way (valid 1 hour).
                  </p>
                  <button
                    onClick={() => {
                      setMode("login");
                      setForgotSent(false);
                    }}
                    className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
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
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 gradient-emerald text-white border-0 hover:opacity-90 shadow-lg shadow-emerald-500/25"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to sign in
                  </button>
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
                        setForgotSent(false);
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

            {googleReady && (
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
            )}

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
