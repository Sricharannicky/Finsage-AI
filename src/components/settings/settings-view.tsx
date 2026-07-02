"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon, User, Save, Moon, Sun, Download, Upload, Database,
  Trash2, Shield, Bell, Loader2, Sparkles, LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";
import { getCurrentMonthKey } from "@/lib/finance";
import { toast } from "sonner";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { user, setUser, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState(user?.monthlyIncomeGoal?.toString() || "");
  const [savingsTarget, setSavingsTarget] = useState(user?.savingsTarget?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.put<{ user: any }>("/api/settings", {
        name,
        monthlyIncomeGoal: parseFloat(monthlyIncomeGoal || "0"),
        savingsTarget: parseFloat(savingsTarget || "0"),
      });
      setUser(res.user);
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await api.post<{ success: boolean; created: any }>("/api/seed");
      if (res.success) {
        toast.success(`Sample data added: ${res.created.incomes} incomes, ${res.created.expenses} expenses, ${res.created.goals} goals`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to seed data");
    } finally {
      setSeeding(false);
    }
  }

  const initials = user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, preferences, and data"
        icon={SettingsIcon}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><User className="size-4 text-emerald-500" /> Profile</CardTitle>
            <CardDescription className="text-xs">Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="gradient-emerald text-white text-xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Member since {new Date(user?.createdAt || "").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="incomeGoal">Monthly Income Goal (₹)</Label>
                <Input id="incomeGoal" type="number" value={monthlyIncomeGoal} onChange={(e) => setMonthlyIncomeGoal(e.target.value)} placeholder="100000" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="savingsTarget">Savings Target (₹)</Label>
                <Input id="savingsTarget" type="number" value={savingsTarget} onChange={(e) => setSavingsTarget(e.target.value)} placeholder="50000" className="h-10" />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="gradient-emerald text-white border-0 gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Moon className="size-4 text-violet-500" /> Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  <span className="text-sm">Dark Mode</span>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "light")} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="size-4 text-emerald-500" /> Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-emerald-500" />
                <span>JWT-secured sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-emerald-500" />
                <span>BCrypt password hashing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-emerald-500" />
                <span>HttpOnly cookies</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Data management */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Database className="size-4 text-amber-500" /> Data Management</CardTitle>
          <CardDescription className="text-xs">Export, import, or reset your financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start h-auto py-3 gap-3" asChild>
              <a href={`/api/export?type=all&month=${getCurrentMonthKey()}`} download>
                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Download className="size-4 text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Export CSV</p>
                  <p className="text-xs text-muted-foreground">Download all transactions</p>
                </div>
              </a>
            </Button>

            <Button variant="outline" className="justify-start h-auto py-3 gap-3" onClick={handleSeed} disabled={seeding}>
              <div className="size-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                {seeding ? <Loader2 className="size-4 text-violet-500 animate-spin" /> : <Sparkles className="size-4 text-violet-500" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Load Sample Data</p>
                <p className="text-xs text-muted-foreground">Generate demo transactions</p>
              </div>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="justify-start h-auto py-3 gap-3">
                  <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <Trash2 className="size-4 text-rose-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Sign Out</p>
                    <p className="text-xs text-muted-foreground">End your current session</p>
                  </div>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>You'll need to sign in again to access your financial data.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => logout()} className="bg-rose-500 hover:bg-rose-600 gap-1.5">
                    <LogOut className="size-3.5" /> Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="shadow-sm border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl gradient-emerald flex items-center justify-center flex-shrink-0">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">About FinSage AI</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                FinSage AI is your personal budget planning agent. It combines secure transaction tracking, AI-powered financial advice,
                ML-based expense predictions, and a real-time financial health score to help you make smarter money decisions.
                Built with Next.js, Prisma, Recharts, and the Z.ai LLM.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
