"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Wallet, TrendingUp, PiggyBank, Coins, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";

interface NetWorthData {
  series: { month: string; cumulativeSavings: number; investmentValue: number; netWorth: number }[];
  current: { netWorth: number; savings: number; investments: number; invested: number; investmentGain: number };
  changes: { monthly: number; monthlyPct: number; yearly: number; yearlyPct: number };
  breakdown: { savings: number; investments: number; savingsPct: number; investmentsPct: number };
}

export function NetWorthView() {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<NetWorthData>("/api/networth");
      setData(res);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState message="Calculating net worth..." />;
  if (!data) return <div className="text-center py-16 text-muted-foreground">Failed to load</div>;

  const nwPositive = data.changes.monthly >= 0;
  const yearlyPositive = data.changes.yearly >= 0;
  const breakdownData = [
    { name: "Savings", value: Math.max(0, data.breakdown.savings), color: "#10b981" },
    { name: "Investments", value: Math.max(0, data.breakdown.investments), color: "#8b5cf6" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Net Worth Tracker"
        subtitle="Your complete financial picture over time"
        icon={Wallet}
      />

      {/* Hero net worth card */}
      <Card className="relative overflow-hidden border-0 shadow-xl">
        <div className="absolute inset-0 gradient-emerald opacity-95" />
        <div className="absolute -right-10 -top-10 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 size-64 rounded-full bg-white/5 blur-3xl" />
        <CardContent className="relative p-6 lg:p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">Current Net Worth</p>
              <p className="text-4xl lg:text-5xl font-bold mt-2 tracking-tight">{formatCurrency(data.current.netWorth)}</p>
              <div className="flex items-center gap-3 mt-3">
                <Badge className="bg-white/20 text-white border-0 gap-0.5">
                  {nwPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {formatCurrency(Math.abs(data.changes.monthly))} this month
                </Badge>
                <span className="text-xs text-white/70">({data.changes.monthlyPct > 0 ? "+" : ""}{data.changes.monthlyPct.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] text-white/70 uppercase tracking-wider">12-Month Growth</p>
                <p className={`text-2xl font-bold mt-1 ${yearlyPositive ? "text-white" : "text-rose-100"}`}>
                  {yearlyPositive ? "+" : ""}{formatCurrency(data.changes.yearly)}
                </p>
                <p className="text-xs text-white/70 mt-0.5">({data.changes.yearlyPct > 0 ? "+" : ""}{data.changes.yearlyPct.toFixed(1)}%)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Composition cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-emerald opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider flex items-center gap-1"><PiggyBank className="size-3" /> Savings</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(data.current.savings)}</p>
              </div>
              <span className="text-xs text-white/70">{data.breakdown.savingsPct.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-violet opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider flex items-center gap-1"><Coins className="size-3" /> Investments</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(data.current.investments)}</p>
              </div>
              <span className="text-xs text-white/70">{data.breakdown.investmentsPct.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 ${data.current.investmentGain >= 0 ? "gradient-teal" : "gradient-rose"} opacity-95`} />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider flex items-center gap-1"><TrendingUp className="size-3" /> Investment Gain</p>
                <p className="text-xl font-bold mt-1">{data.current.investmentGain >= 0 ? "+" : ""}{formatCurrency(data.current.investmentGain)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net worth trend chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Net Worth Over Time (12 months)</CardTitle>
          <CardDescription className="text-xs">Cumulative savings + investment value</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area type="monotone" dataKey="netWorth" stroke="#10b981" strokeWidth={2.5} fill="url(#nwGrad)" name="Net Worth" />
              <Area type="monotone" dataKey="investmentValue" stroke="#8b5cf6" strokeWidth={2} fill="url(#invGrad)" name="Investments" />
              <Area type="monotone" dataKey="cumulativeSavings" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="4 4" name="Savings" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Allocation breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Asset Allocation</CardTitle>
            <CardDescription className="text-xs">How your net worth is distributed</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdownData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {breakdownData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {breakdownData.map((b) => (
                    <div key={b.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                          <span className="font-medium">{b.name}</span>
                        </div>
                        <span className="font-semibold tabular-nums">{formatCurrency(b.value)}</span>
                      </div>
                      <Progress value={b.name === "Savings" ? data.breakdown.savingsPct : data.breakdown.investmentsPct} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{(b.name === "Savings" ? data.breakdown.savingsPct : data.breakdown.investmentsPct).toFixed(1)}% of net worth</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">No assets to allocate yet</div>
            )}
          </CardContent>
        </Card>

        {/* Monthly progression */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Progression</CardTitle>
            <CardDescription className="text-xs">Net worth change month over month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
              {data.series.slice().reverse().map((s, i, arr) => {
                const prev = arr[i + 1];
                const change = prev ? s.netWorth - prev.netWorth : 0;
                const isPositive = change >= 0;
                return (
                  <motion.div
                    key={s.month}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-xs font-medium w-12 text-muted-foreground">{s.month}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(s.netWorth)}</p>
                      <p className="text-[10px] text-muted-foreground">Savings {formatCurrency(s.cumulativeSavings)} · Inv {formatCurrency(s.investmentValue)}</p>
                    </div>
                    {prev && (
                      <span className={`text-xs font-medium ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {isPositive ? "+" : ""}{formatCurrency(change)}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
