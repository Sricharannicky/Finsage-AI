"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CreditCard, Snowflake, Mountain, Loader2, TrendingDown, Zap, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";

interface Debt {
  id: string; name: string; monthlyPayment: number; balance: number;
  interestRate: number; estimatedMonths: number;
}
interface Strategy {
  months: number; totalInterest: number; totalPaid: number;
  timeline: { month: number; debtPaid: number; remainingDebt: number; label: string }[];
  extraPayment: number;
}
interface DebtData {
  summary: string;
  hasDebt: boolean;
  debts: Debt[];
  totalDebt: number;
  totalMonthly: number;
  strategies: {
    snowball: Strategy;
    avalanche: Strategy;
    snowballExtra: Strategy;
    avalancheExtra: Strategy;
  };
}

export function DebtPayoffView() {
  const [data, setData] = useState<DebtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStrategy, setActiveStrategy] = useState<"avalanche" | "snowball">("avalanche");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<DebtData>("/api/ai/debt-payoff");
      setData(res);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState message="Calculating debt payoff strategies..." />;
  if (!data) return <div className="text-center py-16 text-muted-foreground">Failed to load</div>;

  if (!data.hasDebt) {
    return (
      <div className="space-y-6">
        <PageHeader title="Debt Payoff Planner" subtitle="Snowball vs Avalanche strategies" icon={CreditCard} />
        <Card className="shadow-sm border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-12 text-center">
            <Trophy className="size-12 mx-auto mb-3 text-emerald-500" />
            <p className="text-lg font-semibold">You're debt-free! 🎉</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{data.summary}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avalanche = data.strategies.avalanche;
  const snowball = data.strategies.snowball;
  const avalancheExtra = data.strategies.avalancheExtra;
  const snowballExtra = data.strategies.snowballExtra;

  // Chart data: compare avalanche vs snowball remaining debt over time
  const maxMonths = Math.max(avalanche.timeline.length, snowball.timeline.length);
  const chartData = [];
  for (let i = 0; i < maxMonths; i++) {
    const a = avalanche.timeline[i];
    const s = snowball.timeline[i];
    chartData.push({
      month: a?.month || s?.month || i * 6,
      avalanche: a?.remainingDebt ?? null,
      snowball: s?.remainingDebt ?? null,
    });
  }

  const saved = snowball.totalInterest - avalanche.totalInterest;
  const savedMonths = snowball.months - avalanche.months;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debt Payoff Planner"
        subtitle="Compare snowball vs avalanche strategies"
        icon={CreditCard}
      />

      {/* Hero total debt card */}
      <Card className="relative overflow-hidden border-0 shadow-xl">
        <div className="absolute inset-0 gradient-rose opacity-95" />
        <div className="absolute -right-10 -top-10 size-64 rounded-full bg-white/10 blur-3xl" />
        <CardContent className="relative p-6 lg:p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">Total Debt</p>
              <p className="text-4xl lg:text-5xl font-bold mt-2 tracking-tight">{formatCurrency(data.totalDebt)}</p>
              <p className="text-sm text-white/80 mt-2">{data.debts.length} debts · {formatCurrency(data.totalMonthly)}/month in payments</p>
            </div>
            <div className="lg:text-right">
              <p className="text-xs text-white/70 uppercase tracking-wider">Best Strategy Saves</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(saved)}</p>
              <p className="text-xs text-white/70 mt-0.5">{savedMonths} months sooner</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="shadow-sm border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
        <CardContent className="p-4">
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </CardContent>
      </Card>

      {/* Strategy comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
        {/* Avalanche (recommended) */}
        <Card className={`shadow-sm cursor-pointer transition-all ${activeStrategy === "avalanche" ? "border-emerald-500/40 ring-2 ring-emerald-500/20" : "hover:shadow-md"}`} onClick={() => setActiveStrategy("avalanche")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Mountain className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-sm flex items-center gap-1">Avalanche <Badge variant="outline" className="text-[9px] py-0 bg-emerald-500/10 text-emerald-600">Best</Badge></p>
                <p className="text-[10px] text-muted-foreground">Highest interest first</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Time to debt-free</span>
                <span className="font-semibold">{Math.ceil(avalanche.months / 12)}y {avalanche.months % 12}m</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total interest</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(avalanche.totalInterest)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total paid</span>
                <span className="font-semibold">{formatCurrency(avalanche.totalPaid)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Snowball */}
        <Card className={`shadow-sm cursor-pointer transition-all ${activeStrategy === "snowball" ? "border-blue-500/40 ring-2 ring-blue-500/20" : "hover:shadow-md"}`} onClick={() => setActiveStrategy("snowball")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Snowflake className="size-4 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Snowball</p>
                <p className="text-[10px] text-muted-foreground">Smallest balance first</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Time to debt-free</span>
                <span className="font-semibold">{Math.ceil(snowball.months / 12)}y {snowball.months % 12}m</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total interest</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(snowball.totalInterest)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total paid</span>
                <span className="font-semibold">{formatCurrency(snowball.totalPaid)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payoff timeline chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Debt Payoff Timeline</CardTitle>
          <CardDescription className="text-xs">Remaining debt over time — Avalanche vs Snowball</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `M${v}`} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => v !== null ? formatCurrency(v) : "—"} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="avalanche" stroke="#10b981" strokeWidth={3} dot={false} name="Avalanche" connectNulls />
              <Line type="monotone" dataKey="snowball" stroke="#3b82f6" strokeWidth={3} dot={false} name="Snowball" connectNulls strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Extra payment impact */}
      <Card className="shadow-sm border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="size-4 text-amber-500" /> Accelerate with ₹2,000/month Extra
          </CardTitle>
          <CardDescription className="text-xs">See how adding just ₹2,000/month speeds up your payoff</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-card/50 border border-amber-500/10">
              <p className="text-[10px] text-muted-foreground uppercase">Avalanche + Extra</p>
              <p className="text-lg font-bold mt-1">{Math.ceil(avalancheExtra.months / 12)}y {avalancheExtra.months % 12}m</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Save {avalanche.months - avalancheExtra.months} months & {formatCurrency(avalanche.totalInterest - avalancheExtra.totalInterest)}</p>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-amber-500/10">
              <p className="text-[10px] text-muted-foreground uppercase">Snowball + Extra</p>
              <p className="text-lg font-bold mt-1">{Math.ceil(snowballExtra.months / 12)}y {snowballExtra.months % 12}m</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Save {snowball.months - snowballExtra.months} months & {formatCurrency(snowball.totalInterest - snowballExtra.totalInterest)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debt list */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Debts</CardTitle>
          <CardDescription className="text-xs">Click a strategy above to see its payoff order</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.debts.map((d, i) => {
            const order = activeStrategy === "avalanche"
              ? [...data.debts].sort((a, b) => b.interestRate - a.interestRate).findIndex((x) => x.id === d.id)
              : [...data.debts].sort((a, b) => a.balance - b.balance).findIndex((x) => x.id === d.id);
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                <div className="size-8 rounded-lg bg-rose-500/15 flex items-center justify-center text-sm font-bold text-rose-500 flex-shrink-0">
                  {order + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">Balance: {formatCurrency(d.balance)} · {d.interestRate.toFixed(0)}% interest</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm tabular-nums">{formatCurrency(d.monthlyPayment)}/mo</p>
                  <p className="text-[10px] text-muted-foreground">~{Math.ceil(d.estimatedMonths / 12)}y remaining</p>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        Debt balances and interest rates are estimated from your EMI payments. For precise calculations, input actual loan details in Settings.
      </p>
    </div>
  );
}
