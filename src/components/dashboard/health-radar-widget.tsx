"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { Radar as RadarIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";

interface HealthData {
  score: number;
  grade: string;
  breakdown: Record<string, number>;
  recommendations: string[];
  metrics: { savingsRate: number; totalIncome: number; totalExpense: number; remainingBalance: number; monthlyBudget: number; goalsCount: number };
}

export function HealthRadarWidget() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<HealthData>("/api/ai/health-score")
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Financial Health Radar</CardTitle></CardHeader>
        <CardContent><div className="h-48 flex items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div></CardContent>
      </Card>
    );
  }
  if (!health) return null;

  // Radar chart data: each axis is normalized to 0-100
  const radarData = [
    { metric: "Savings", value: health.breakdown.savings, max: 30, pct: Math.round((health.breakdown.savings / 30) * 100) },
    { metric: "Expenses", value: health.breakdown.expenses, max: 20, pct: Math.round((health.breakdown.expenses / 20) * 100) },
    { metric: "Budget", value: health.breakdown.budget, max: 20, pct: Math.round((health.breakdown.budget / 20) * 100) },
    { metric: "Goals", value: health.breakdown.goals, max: 15, pct: Math.round((health.breakdown.goals / 15) * 100) },
    { metric: "Emergency", value: health.breakdown.emergency, max: 15, pct: Math.round((health.breakdown.emergency / 15) * 100) },
  ];

  const scoreColor = health.score >= 85 ? "#10b981" : health.score >= 70 ? "#22c55e" : health.score >= 50 ? "#f59e0b" : health.score >= 30 ? "#f97316" : "#ef4444";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <RadarIcon className="size-4 text-violet-500" />
            Financial Health Radar
          </span>
          <Badge variant="outline" className="text-[10px] py-0" style={{ color: scoreColor, borderColor: `${scoreColor}40` }}>
            {health.score}/100 · {health.grade}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">Multi-dimensional financial wellness</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} angle={90} tickCount={5} />
            <Radar
              name="Score"
              dataKey="pct"
              stroke={scoreColor}
              fill={scoreColor}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }}
              formatter={(v: any, _name: any, props: any) => [`${v}% (${props.payload.value}/${props.payload.max})`, props.payload.metric]}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-5 gap-1 mt-2 text-center">
          {radarData.map((d) => (
            <div key={d.metric}>
              <div className="text-sm font-bold" style={{ color: d.pct >= 70 ? "#10b981" : d.pct >= 50 ? "#f59e0b" : "#ef4444" }}>{d.pct}%</div>
              <div className="text-[9px] text-muted-foreground uppercase">{d.metric}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
