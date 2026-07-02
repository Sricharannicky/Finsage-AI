"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { Wallet, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";
import type { ViewType } from "@/components/layout/app-shell";

interface NetWorthData {
  series: { month: string; netWorth: number }[];
  current: { netWorth: number };
  changes: { monthly: number; monthlyPct: number };
}

export function NetWorthSparkline({ onViewChange }: { onViewChange: (v: ViewType) => void }) {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<NetWorthData>("/api/networth")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const positive = (data?.changes.monthly || 0) >= 0;

  return (
    <Card
      className="shadow-sm cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
      onClick={() => onViewChange("networth")}
    >
      <div className="absolute inset-0 mesh-bg opacity-40" />
      <CardHeader className="relative pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wallet className="size-4 text-emerald-500" />
            Net Worth
          </span>
          <Badge variant="outline" className="text-[9px] py-0">View →</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {loading ? (
          <div className="h-16 flex items-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div>
            <div className="flex items-end justify-between mb-2">
              <p className="text-2xl font-bold tracking-tight">{formatCurrency(data.current.netWorth)}</p>
              <span className={`text-xs font-medium flex items-center gap-0.5 ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {data.changes.monthlyPct > 0 ? "+" : ""}{data.changes.monthlyPct.toFixed(1)}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={50}>
              <AreaChart data={data.series}>
                <defs>
                  <linearGradient id="sparkNw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={positive ? "#10b981" : "#f43f5e"} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={positive ? "#10b981" : "#f43f5e"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(v: any) => formatCurrency(v)}
                  labelStyle={{ display: "none" }}
                />
                <Area type="monotone" dataKey="netWorth" stroke={positive ? "#10b981" : "#f43f5e"} strokeWidth={2} fill="url(#sparkNw)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Failed to load</p>
        )}
      </CardContent>
    </Card>
  );
}
