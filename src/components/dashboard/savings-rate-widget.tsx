"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Target, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";

interface SavingsRateData {
  series: { month: string; savingsRate: number; income: number; expense: number; savings: number; target: number }[];
  current: number;
  target: number;
  avgRate: number;
  bestMonth: { month: string; rate: number };
  monthsOnTarget: number;
  totalMonths: number;
  trend: number;
}

export function SavingsRateWidget() {
  const [data, setData] = useState<SavingsRateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SavingsRateData>("/api/dashboard/savings-rate")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Savings Rate Tracker</CardTitle></CardHeader>
        <CardContent><div className="h-40 flex items-center"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div></CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const onTarget = data.current >= data.target;
  const trendPositive = data.trend >= 0;
  const color = onTarget ? "#10b981" : data.current >= 10 ? "#f59e0b" : "#ef4444";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="size-4 text-emerald-500" />
            Savings Rate Tracker
          </span>
          <Badge variant="outline" className="text-[10px] py-0" style={{ color, borderColor: `${color}40` }}>
            {data.current.toFixed(1)}% / {data.target}%
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">6-month history vs 20% target</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase">Average</p>
            <p className="text-sm font-bold" style={{ color: data.avgRate >= 20 ? "#10b981" : data.avgRate >= 10 ? "#f59e0b" : "#ef4444" }}>{data.avgRate.toFixed(1)}%</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase">Best Month</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{data.bestMonth.rate.toFixed(1)}%</p>
            <p className="text-[9px] text-muted-foreground">{data.bestMonth.month}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground uppercase">On Target</p>
            <p className="text-sm font-bold">{data.monthsOnTarget}/{data.totalMonths}</p>
            <p className="text-[9px] text-muted-foreground">months</p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data.series} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="srGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
              formatter={(v: any, name: any) => name === "savingsRate" ? [`${v}%`, "Savings Rate"] : [v, name]}
            />
            <ReferenceLine y={data.target} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Target", fill: "#10b981", fontSize: 9, position: "right" }} />
            <Area type="monotone" dataKey="savingsRate" stroke={color} strokeWidth={2.5} fill="url(#srGrad)" name="savingsRate" />
          </AreaChart>
        </ResponsiveContainer>

        {/* Trend indicator */}
        <div className="flex items-center justify-between mt-2 text-[11px]">
          <span className="text-muted-foreground">6-month trend</span>
          <span className={`flex items-center gap-0.5 font-medium ${trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {trendPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trendPositive ? "+" : ""}{data.trend.toFixed(1)}pp
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
