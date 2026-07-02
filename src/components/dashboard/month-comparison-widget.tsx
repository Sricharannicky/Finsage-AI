"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { formatCurrency, getCategoryIcon } from "@/lib/constants";
import { LoadingState } from "@/components/shared";

interface ComparisonData {
  current: { month: string; income: number; expense: number; savings: number; savingsRate: number };
  previous: { month: string; income: number; expense: number; savings: number; savingsRate: number };
  changes: { income: number; expense: number; savings: number; savingsRate: number; incomePct: number; expensePct: number };
  categoryChanges: { category: string; current: number; previous: number; change: number; changePct: number }[];
}

function ChangeBadge({ value, pct, invert = false }: { value: number; pct: number; invert?: boolean }) {
  // invert=true means a decrease is good (e.g., expenses)
  const isPositive = invert ? value < 0 : value > 0;
  const isZero = value === 0;
  const Icon = isZero ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const color = isZero ? "text-muted-foreground" : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="size-3" />
      {sign}{formatCurrency(Math.abs(value))}
      {pct !== 0 && <span className="opacity-70">({pct > 0 ? "+" : ""}{pct.toFixed(1)}%)</span>}
    </span>
  );
}

export function MonthComparisonWidget() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ComparisonData>("/api/dashboard/comparison")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Month vs Last Month</CardTitle></CardHeader>
        <CardContent><div className="h-40 flex items-center justify-center"><div className="size-6 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" /></div></CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const currMonth = new Date(data.current.month + "-01").toLocaleDateString("en-IN", { month: "short" });
  const prevMonth = new Date(data.previous.month + "-01").toLocaleDateString("en-IN", { month: "short" });

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-500" /> Month vs Last Month
        </CardTitle>
        <CardDescription className="text-xs">{currMonth} compared to {prevMonth}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Comparison rows */}
        <div className="space-y-2">
          <ComparisonRow label="Income" current={data.current.income} previous={data.previous.income} change={data.changes.income} pct={data.changes.incomePct} />
          <ComparisonRow label="Expense" current={data.current.expense} previous={data.previous.expense} change={data.changes.expense} pct={data.changes.expensePct} invert />
          <ComparisonRow label="Savings" current={data.current.savings} previous={data.previous.savings} change={data.changes.savings} pct={0} />
          <ComparisonRow label="Savings Rate" current={data.current.savingsRate} previous={data.previous.savingsRate} change={data.changes.savingsRate} pct={0} isPercent />
        </div>

        {/* Category changes */}
        {data.categoryChanges.length > 0 && data.categoryChanges.some((c) => c.change !== 0) && (
          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Category Changes</p>
            <div className="space-y-1.5">
              {data.categoryChanges.filter((c) => c.change !== 0).slice(0, 3).map((c) => {
                const increased = c.change > 0;
                return (
                  <div key={c.category} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate">{getCategoryIcon(c.category)} {c.category}</span>
                    <span className="text-muted-foreground tabular-nums">{formatCurrency(c.previous)}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium tabular-nums">{formatCurrency(c.current)}</span>
                    <Badge variant="outline" className={`text-[9px] py-0 ${increased ? "text-rose-600 border-rose-500/20" : "text-emerald-600 border-emerald-500/20"}`}>
                      {increased ? <TrendingDown className="size-2.5 mr-0.5" /> : <TrendingUp className="size-2.5 mr-0.5" />}
                      {c.changePct > 0 ? "+" : ""}{c.changePct.toFixed(0)}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonRow({ label, current, previous, change, pct, invert, isPercent }: any) {
  const fmt = (v: number) => isPercent ? `${v.toFixed(1)}%` : formatCurrency(v);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">{fmt(previous)}</span>
      <span className="text-muted-foreground">→</span>
      <span className="text-sm font-semibold tabular-nums flex-1">{fmt(current)}</span>
      <div className="w-28 text-right">
        {!isPercent && <ChangeBadge value={change} pct={pct} invert={invert} />}
        {isPercent && (
          <span className={`text-xs font-medium inline-flex items-center gap-0.5 ${change > 0 ? "text-emerald-600 dark:text-emerald-400" : change < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
            {change > 0 ? <ArrowUpRight className="size-3" /> : change < 0 ? <ArrowDownRight className="size-3" /> : <Minus className="size-3" />}
            {change > 0 ? "+" : ""}{change.toFixed(1)}pp
          </span>
        )}
      </div>
    </div>
  );
}
