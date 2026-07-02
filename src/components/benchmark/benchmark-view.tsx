"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Activity, Loader2, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";

interface Benchmark {
  key: string; label: string; icon: string; userValue: number; unit: string;
  recommended: string; min: number; max: number; ideal: number;
  description: string; advice: string;
}
interface BenchmarkData {
  benchmarks: Benchmark[];
  overallScore: number;
  grade: string;
  summary: string;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

export function BenchmarkView() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<BenchmarkData>("/api/ai/benchmark");
      setData(res);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState message="Benchmarking your finances..." />;
  if (!data) return <div className="text-center py-16 text-muted-foreground">Failed to load</div>;

  const inRangeCount = data.benchmarks.filter((b) => b.userValue >= b.min && b.userValue <= b.max).length;
  const scoreColor = data.overallScore >= 85 ? "#10b981" : data.overallScore >= 70 ? "#22c55e" : data.overallScore >= 50 ? "#f59e0b" : "#ef4444";

  const chartData = data.benchmarks.map((b) => ({
    name: b.label.substring(0, 12),
    user: Math.round(b.userValue * 10) / 10,
    min: b.min,
    max: b.max,
    ideal: b.ideal,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Benchmarking"
        subtitle="How your finances compare to recommended standards"
        icon={Activity}
      />

      {/* Hero score card */}
      <Card className="relative overflow-hidden border-0 shadow-xl">
        <div className="absolute inset-0 gradient-emerald opacity-95" />
        <div className="absolute -right-10 -top-10 size-64 rounded-full bg-white/10 blur-3xl" />
        <CardContent className="relative p-6 lg:p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">Financial Health Score</p>
              <div className="flex items-baseline gap-3 mt-2">
                <p className="text-5xl font-bold tracking-tight">{data.overallScore}</p>
                <p className="text-2xl text-white/70">/ 100</p>
                <Badge className="ml-2 text-sm bg-white/20 text-white border-0">{data.grade}</Badge>
              </div>
              <p className="text-sm text-white/80 mt-2">{data.summary}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:text-right">
              <div>
                <p className="text-[10px] text-white/70 uppercase tracking-wider">In Range</p>
                <p className="text-2xl font-bold mt-1">{inRangeCount}/{data.benchmarks.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/70 uppercase tracking-wider">Net Worth</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(data.netWorth)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Ratios vs Recommended Range</CardTitle>
          <CardDescription className="text-xs">Bars show your value; lines show recommended min/max</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} />
              <Bar dataKey="user" radius={[6, 6, 0, 0]} name="Your Value">
                {chartData.map((entry, i) => {
                  const inRange = entry.user >= entry.min && entry.user <= entry.max;
                  return <Cell key={i} fill={inRange ? "#10b981" : "#f43f5e"} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-sm bg-emerald-500" /> In Range</div>
            <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-sm bg-rose-500" /> Out of Range</div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {data.benchmarks.map((b, i) => {
          const inRange = b.userValue >= b.min && b.userValue <= b.max;
          return (
            <motion.div key={b.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`shadow-sm hover:shadow-md transition-shadow ${inRange ? "border-emerald-500/20" : "border-rose-500/20"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{b.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{b.label}</p>
                        <p className="text-[10px] text-muted-foreground">{b.description}</p>
                      </div>
                    </div>
                    {inRange ? (
                      <CheckCircle2 className="size-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="size-4 text-rose-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-2xl font-bold ${inRange ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {b.userValue.toFixed(1)}{b.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] mb-2">
                    <span className="text-muted-foreground">Recommended:</span>
                    <Badge variant="outline" className="text-[10px] py-0">{b.recommended}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{b.advice}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
