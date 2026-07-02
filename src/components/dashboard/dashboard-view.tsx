"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ArrowDownCircle, ArrowUpCircle, Wallet, PiggyBank, Sparkles, TrendingUp,
  Target, Plus, Activity, Bot, ChevronRight, Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api-client";
import { formatCurrency, formatRelativeTime, getCategoryIcon } from "@/lib/constants";
import { LoadingState, StatCardSkeleton, CardSkeleton, ListSkeleton } from "@/components/shared";
import type { ViewType } from "@/components/layout/app-shell";

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  remainingBalance: number;
  monthlyBudget: number;
  monthlySavings: number;
  savingsRate: number;
  healthScore: number;
  healthGrade: string;
  healthBreakdown: Record<string, number>;
  healthRecommendations: string[];
  recentTransactions: {
    id: string;
    type: "income" | "expense";
    amount: number;
    category: string;
    date: string;
    note: string | null;
  }[];
  incomeTrend: { month: string; income: number; expense: number }[];
  categoryBreakdown: { category: string; amount: number; color: string }[];
  goalsProgress: { id: string; title: string; progress: number; target: number; current: number }[];
  aiSuggestions: string[];
  unreadNotifications: number;
  month: string;
}

export function DashboardView({ onViewChange }: { onViewChange: (v: ViewType) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await api.get<DashboardData>("/api/dashboard/summary");
      setData(res);
      // Load AI insights lazily AFTER dashboard renders
      setInsightsLoading(true);
      api.get<{ insights: string[] }>("/api/ai/cached-insights")
        .then((r) => setInsights(r.insights))
        .catch(() => setInsights([]))
        .finally(() => setInsightsLoading(false));
    } catch (err: any) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <DashboardSkeleton />;
  if (!data) return <div className="text-center py-16 text-muted-foreground">Failed to load dashboard</div>;

  const budgetUsed = data.monthlyBudget > 0 ? (data.totalExpense / data.monthlyBudget) * 100 : 0;
  const monthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              {monthLabel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Your financial overview at a glance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onViewChange("expenses")} className="gap-1.5">
            <Plus className="size-3.5" /> Add Expense
          </Button>
          <Button size="sm" onClick={() => onViewChange("advisor")} className="gap-1.5 gradient-emerald text-white border-0">
            <Bot className="size-3.5" /> Ask AI
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow group">
            <div className="absolute inset-0 gradient-emerald opacity-95" />
            <div className="absolute -right-4 -top-4 size-24 rounded-full bg-white/15 blur-2xl" />
            <CardContent className="relative p-4 lg:p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs font-medium text-white/80 uppercase tracking-wider">Total Income</p>
                  <p className="text-xl lg:text-2xl font-bold mt-1 tracking-tight">{formatCurrency(data.totalIncome)}</p>
                </div>
                <div className="size-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <ArrowDownCircle className="size-5 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-white/70 mt-2">Earned this month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow group">
            <div className="absolute inset-0 gradient-rose opacity-95" />
            <div className="absolute -right-4 -top-4 size-24 rounded-full bg-white/15 blur-2xl" />
            <CardContent className="relative p-4 lg:p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs font-medium text-white/80 uppercase tracking-wider">Total Expense</p>
                  <p className="text-xl lg:text-2xl font-bold mt-1 tracking-tight">{formatCurrency(data.totalExpense)}</p>
                </div>
                <div className="size-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <ArrowUpCircle className="size-5 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-white/70 mt-2">
                {budgetUsed > 0 ? `${budgetUsed.toFixed(0)}% of budget` : "No budget set"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow group">
            <div className="absolute inset-0 gradient-teal opacity-95" />
            <div className="absolute -right-4 -top-4 size-24 rounded-full bg-white/15 blur-2xl" />
            <CardContent className="relative p-4 lg:p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs font-medium text-white/80 uppercase tracking-wider">Balance</p>
                  <p className="text-xl lg:text-2xl font-bold mt-1 tracking-tight">{formatCurrency(data.remainingBalance)}</p>
                </div>
                <div className="size-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Wallet className="size-5 text-white" />
                </div>
              </div>
              <p className="text-[11px] text-white/70 mt-2">Savings rate: {data.savingsRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow group">
            <div className="absolute inset-0 gradient-amber opacity-95" />
            <div className="absolute -right-4 -top-4 size-24 rounded-full bg-white/15 blur-2xl" />
            <CardContent className="relative p-4 lg:p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] lg:text-xs font-medium text-white/80 uppercase tracking-wider">Budget</p>
                  <p className="text-xl lg:text-2xl font-bold mt-1 tracking-tight">{formatCurrency(data.monthlyBudget)}</p>
                </div>
                <div className="size-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <PiggyBank className="size-5 text-white" />
                </div>
              </div>
              <div className="mt-2">
                <Progress value={Math.min(100, budgetUsed)} className="h-1.5 bg-white/20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left col - charts */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Income vs Expense trend */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="size-4 text-emerald-500" />
                  Income vs Expense
                </CardTitle>
                <CardDescription className="text-xs">Last 6 months trend</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onViewChange("reports")} className="text-xs gap-1">
                View reports <ChevronRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.incomeTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fill="url(#incomeGrad)" name="Income" />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#expenseGrad)" name="Expense" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="size-4 text-violet-500" />
                Spending by Category
              </CardTitle>
              <CardDescription className="text-xs">Where your money goes this month</CardDescription>
            </CardHeader>
            <CardContent>
              {data.categoryBreakdown.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No expenses recorded yet this month
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.categoryBreakdown.slice(0, 8)}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.categoryBreakdown.slice(0, 8).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(value: any) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                    {data.categoryBreakdown.slice(0, 8).map((c) => {
                      const pct = data.totalExpense > 0 ? (c.amount / data.totalExpense) * 100 : 0;
                      return (
                        <div key={c.category} className="flex items-center gap-2 text-sm">
                          <span className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="flex-1 truncate">{getCategoryIcon(c.category)} {c.category}</span>
                          <span className="text-muted-foreground text-xs">{pct.toFixed(0)}%</span>
                          <span className="font-medium tabular-nums w-16 text-right">{formatCurrency(c.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right col - health, AI, goals */}
        <div className="space-y-4 lg:space-y-6">
          {/* Financial Health Score */}
          <Card className="shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 mesh-bg opacity-50" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-500" />
                Financial Health
              </CardTitle>
              <CardDescription className="text-xs">Your financial wellness score</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-center justify-center">
                <HealthScoreGauge score={data.healthScore} grade={data.healthGrade} />
              </div>
              <div className="grid grid-cols-5 gap-1 mt-3 text-center">
                {[
                  { label: "Save", val: data.healthBreakdown.savings, max: 30, color: "#10b981" },
                  { label: "Spend", val: data.healthBreakdown.expenses, max: 20, color: "#f59e0b" },
                  { label: "Budget", val: data.healthBreakdown.budget, max: 20, color: "#06b6d4" },
                  { label: "Goals", val: data.healthBreakdown.goals, max: 15, color: "#a855f7" },
                  { label: "Fund", val: data.healthBreakdown.emergency, max: 15, color: "#ec4899" },
                ].map((b) => (
                  <div key={b.label}>
                    <div className="text-sm font-bold" style={{ color: b.color }}>{b.val}</div>
                    <div className="text-[9px] text-muted-foreground uppercase">{b.label}</div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3 text-xs gap-1" onClick={() => onViewChange("insights")}>
                View full breakdown <ChevronRight className="size-3" />
              </Button>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card className="shadow-sm border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="size-6 rounded-lg gradient-emerald flex items-center justify-center">
                  <Sparkles className="size-3.5 text-white" />
                </div>
                AI Quick Insights
              </CardTitle>
              <CardDescription className="text-xs">Personalized recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {insightsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-card/50 border border-emerald-500/10">
                      <div className="size-3.5 rounded bg-muted animate-pulse flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2 rounded bg-muted animate-pulse w-3/4" />
                        <div className="h-2 rounded bg-muted animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : insights.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Add transactions to unlock AI insights</p>
              ) : (
                insights.slice(0, 3).map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="flex gap-2 p-2.5 rounded-lg bg-card/50 border border-emerald-500/10"
                  >
                    <Lightbulb className="size-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">{s}</p>
                  </motion.div>
                ))
              )}
              <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => onViewChange("advisor")}>
                <Bot className="size-3.5" /> Chat with AI Advisor
              </Button>
            </CardContent>
          </Card>

          {/* Goals progress */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="size-4 text-rose-500" />
                Savings Goals
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onViewChange("goals")}>
                All <ChevronRight className="size-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.goalsProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">No goals yet. Create one!</p>
              ) : (
                data.goalsProgress.slice(0, 3).map((g) => (
                  <div key={g.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium truncate">{g.title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{g.progress}%</span>
                    </div>
                    <Progress value={g.progress} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatCurrency(g.current)} / {formatCurrency(g.target)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent transactions */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-emerald-500" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs">Latest transactions</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onViewChange("expenses")}>
            View all <ChevronRight className="size-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No transactions yet. Add your first income or expense!
            </div>
          ) : (
            <div className="space-y-1">
              {data.recentTransactions.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="size-9 rounded-lg">
                    <AvatarFallback className={`rounded-lg text-sm ${
                      t.type === "income" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    }`}>
                      {getCategoryIcon(t.category)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.note || t.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.category} · {formatRelativeTime(t.date)}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthScoreGauge({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : score >= 30 ? "#f97316" : "#ef4444";

  return (
    <div className="relative size-44">
      <svg className="size-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="70" fill="none" stroke="var(--muted)" strokeWidth="10" />
        <motion.circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold tracking-tight"
          style={{ color }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground">/ 100</span>
        <Badge className="mt-1 text-[10px]" style={{ backgroundColor: `${color}20`, color }}>{grade}</Badge>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-56 bg-muted/70 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-muted rounded animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <CardSkeleton className="lg:col-span-2 h-[320px]" />
        <CardSkeleton className="h-[320px]" />
      </div>
      <CardSkeleton className="h-[300px]" />
    </div>
  );
}
