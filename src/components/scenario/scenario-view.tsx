"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { GitCompare, Loader2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";

interface Scenario {
  id: string; title: string; icon: string; description: string;
  income: number; expense: number; savings: number; savingsRate: number;
  monthlyChange: number; yearlyImpact: number; note?: string;
}
interface ScenarioData {
  current: { income: number; expense: number; savings: number; savingsRate: number; netWorth: number };
  scenarios: Scenario[];
}

export function ScenarioView() {
  const [data, setData] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<ScenarioData>("/api/ai/scenario");
      setData(res);
      if (res.scenarios[0]) setSelected(res.scenarios[0].id);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState message="Calculating scenarios..." />;
  if (!data) return <div className="text-center py-16 text-muted-foreground">Failed to load</div>;

  const selectedScenario = data.scenarios.find((s) => s.id === selected) || data.scenarios[0];
  const current = data.current;

  // Chart data: current vs selected scenario
  const chartData = [
    { name: "Current", income: current.income, expense: current.expense, savings: Math.max(0, current.savings) },
    { name: selectedScenario.title.substring(0, 15), income: selectedScenario.income, expense: selectedScenario.expense, savings: Math.max(0, selectedScenario.savings) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario Simulator"
        subtitle="What-if analysis: see the impact of financial changes"
        icon={GitCompare}
      />

      {/* Current state card */}
      <Card className="relative overflow-hidden border-0 shadow-xl">
        <div className="absolute inset-0 gradient-emerald opacity-95" />
        <div className="absolute -right-10 -top-10 size-64 rounded-full bg-white/10 blur-3xl" />
        <CardContent className="relative p-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">Your Current Financials</p>
              <div className="flex items-baseline gap-4 mt-2">
                <div>
                  <p className="text-3xl font-bold">{formatCurrency(current.savings)}</p>
                  <p className="text-xs text-white/70">monthly savings</p>
                </div>
                <Badge className="bg-white/20 text-white border-0">{current.savingsRate}% rate</Badge>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[10px] text-white/70 uppercase">Income</p>
                <p className="text-xl font-bold">{formatCurrency(current.income)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/70 uppercase">Expense</p>
                <p className="text-xl font-bold">{formatCurrency(current.expense)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/70 uppercase">Net Worth</p>
                <p className="text-xl font-bold">{formatCurrency(current.netWorth)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.scenarios.map((s, i) => {
          const isSelected = s.id === selected;
          const isPositive = s.monthlyChange >= 0;
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card
                className={`shadow-sm cursor-pointer transition-all ${isSelected ? "border-emerald-500/40 ring-2 ring-emerald-500/20" : "hover:shadow-md"}`}
                onClick={() => setSelected(s.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl flex-shrink-0">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{s.title}</p>
                      <p className="text-[11px] text-muted-foreground">{s.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-lg font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {isPositive ? "+" : ""}{formatCurrency(s.monthlyChange)}/mo
                      </p>
                      <p className="text-[10px] text-muted-foreground">{isPositive ? "extra savings" : "reduction"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{s.savingsRate}%</p>
                      <p className="text-[10px] text-muted-foreground">savings rate</p>
                    </div>
                  </div>
                  {s.note && (
                    <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-2 bg-violet-500/5 p-1.5 rounded">{s.note}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Comparison chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comparison: Current vs {selectedScenario.title}</CardTitle>
          <CardDescription className="text-xs">Income, expense, and savings side by side</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expense" />
              <Bar dataKey="savings" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Savings" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Impact summary */}
      <Card className="shadow-sm border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-500" />
            Impact of "{selectedScenario.title}"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-card/50 border border-emerald-500/10">
              <p className="text-[10px] text-muted-foreground uppercase">Monthly Change</p>
              <p className={`text-lg font-bold ${selectedScenario.monthlyChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {selectedScenario.monthlyChange >= 0 ? "+" : ""}{formatCurrency(selectedScenario.monthlyChange)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-emerald-500/10">
              <p className="text-[10px] text-muted-foreground uppercase">Yearly Impact</p>
              <p className={`text-lg font-bold ${selectedScenario.yearlyImpact >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {selectedScenario.yearlyImpact >= 0 ? "+" : ""}{formatCurrency(selectedScenario.yearlyImpact)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-emerald-500/10">
              <p className="text-[10px] text-muted-foreground uppercase">New Savings Rate</p>
              <p className="text-lg font-bold">{selectedScenario.savingsRate}%</p>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-emerald-500/10">
              <p className="text-[10px] text-muted-foreground uppercase">5-Year Extra</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(selectedScenario.monthlyChange * 60)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
