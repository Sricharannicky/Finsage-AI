"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Eye, EyeOff, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Mail } from "lucide-react";

function ResetForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token && (!email || otp.length !== 6)) {
      toast.error("Please enter your registered email and the 6-digit OTP code");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const payload: any = { password };
      if (token) {
        payload.token = token;
      } else {
        payload.email = email;
        payload.otp = otp;
      }
      const res = await api.post<{ success: boolean; message?: string }>("/api/auth/reset", payload);
      setDone(true);
      toast.success(res.message || "Password updated!");
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      toast.error(err?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Password updated!</h2>
        <p className="text-sm text-muted-foreground mt-2">Taking you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!token && (
        <>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Registered Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10 h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <Label className="text-xs text-muted-foreground">6-Digit Verification Code</Label>
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
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="new-password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-10 pr-10 h-11"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="confirm-password"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="pl-10 h-11"
            required
            minLength={6}
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading || (!token && otp.length !== 6) || password.length < 6}
        className="w-full h-11 gradient-emerald text-white border-0 hover:opacity-90 shadow-lg shadow-emerald-500/25"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Set new password"}
      </Button>
    </form>
  );
}

function ResetPageInner() {
  const params = useSearchParams();
  const token = params.get("token");
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 shadow-2xl shadow-emerald-500/5">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="size-10 rounded-2xl gradient-emerald flex items-center justify-center">
              <Brain className="size-5 text-white" />
            </div>
            <span className="font-bold text-lg">FinSage AI</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-center">Reset your password</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6 text-center">
            {token ? "Enter your new password below." : "Enter your email and 6-digit OTP code to reset your password."}
          </p>
          <ResetForm token={token} />
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPageInner />
    </Suspense>
  );
}
