"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Gauge, TrendingUp, Loader2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";

interface VelocityData {
  totalSpent: number;
  dailyAvg: number;
  projectedTotal: number;
  projectedRemaining: number;
  daysElapsed: number;
  daysRemaining: number;
  daysInMonth: number;
  dailySeries: { day: string; amount: number }[];
  status: "normal" | "high" | "low";
  velocityRatio: number;
  expectedSpend: number;
  totalBudget: number;
}

export function SpendingVelocityWidget() {
  const [data, setData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<VelocityData>("/api/dashboard/velocity")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Spending Velocity</CardTitle></CardHeader>
        <CardContent><div className="h-20 flex items-center"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div></CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const statusConfig = {
    high: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "High", icon: "🔥", desc: "Spending faster than budgeted pace" },
    normal: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "On Pace", icon: "✅", desc: "Spending at expected rate" },
    low: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Low", icon: "💡", desc: "Spending slower than budgeted" },
  }[data.status];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Gauge className="size-4 text-violet-500" />
            Spending Velocity
          </span>
          <Badge variant="outline" className={`text-[10px] py-0 ${statusConfig.color} ${statusConfig.border}`}>
            {statusConfig.icon} {statusConfig.label}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">{statusConfig.desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Daily Avg</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(data.dailyAvg)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Projected</p>
            <p className={`text-lg font-bold tabular-nums ${data.projectedTotal > data.totalBudget && data.totalBudget > 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>{formatCurrency(data.projectedTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Days Left</p>
            <p className="text-lg font-bold tabular-nums">{data.daysRemaining}</p>
          </div>
        </div>

        {/* 14-day sparkline */}
        <ResponsiveContainer width="100%" height={60}>
          <AreaChart data={data.dailySeries}>
            <defs>
              <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
              formatter={(v: any) => formatCurrency(v)}
              labelStyle={{ display: "none" }}
            />
            <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} fill="url(#velGrad)" />
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
          <span>{data.dailySeries[0]?.day}</span>
          <span className="flex items-center gap-1">
            <Zap className="size-2.5" /> {data.velocityRatio}× pace
          </span>
          <span>Today</span>
        </div>

        {data.totalBudget > 0 && data.projectedTotal > data.totalBudget && (
          <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400">
            ⚠️ At current pace, you'll exceed your budget by {formatCurrency(data.projectedTotal - data.totalBudget)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
