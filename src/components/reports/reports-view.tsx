"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  BarChart3, Download, FileText, TrendingUp, TrendingDown, Wallet, Calendar, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency, getCategoryColor, getCategoryIcon } from "@/lib/constants";
import { getCurrentMonthKey } from "@/lib/finance";
import { toast } from "sonner";

interface ReportData {
  period: string;
  totalIncome: number;
  totalExpense: number;
  series: any[];
  categoryBreakdown?: { category: string; amount: number }[];
}

export function ReportsView() {
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const month = getCurrentMonthKey();

  useEffect(() => {
    loadReport();
  }, [period]);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await api.get<ReportData>(`/api/reports?period=${period}&month=${month}`);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  const savings = (data?.totalIncome || 0) - (data?.totalExpense || 0);
  const savingsRate = data && data.totalIncome > 0 ? (savings / data.totalIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Visualize your financial trends over time"
        icon={BarChart3}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={`/api/export?type=all&month=${month}`} download>
              <Download className="size-3.5" /> Export CSV
            </a>
          </Button>
        }
      />

      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
          <TabsTrigger value="yearly" className="text-xs">Yearly</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-emerald opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Total Income</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(data?.totalIncome || 0)}</p>
              </div>
              <TrendingUp className="size-5 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-rose opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Total Expense</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(data?.totalExpense || 0)}</p>
              </div>
              <TrendingDown className="size-5 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-teal opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Net Savings</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(savings)}</p>
              </div>
              <Wallet className="size-5 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-amber opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Savings Rate</p>
                <p className="text-xl font-bold mt-1">{savingsRate.toFixed(1)}%</p>
              </div>
              <Calendar className="size-5 text-white/80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card className="shadow-sm"><CardContent className="py-16"><LoadingState message="Generating report..." /></CardContent></Card>
      ) : data ? (
        <>
          {/* Trend chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Income vs Expense Trend</CardTitle>
              <CardDescription className="text-xs capitalize">{period} view</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey={Object.keys(data.series[0] || {})[0]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fill="url(#rIncome)" name="Income" />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#rExpense)" name="Expense" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Savings bar chart */}
          {data.series[0]?.savings !== undefined && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Savings Trend</CardTitle>
                <CardDescription className="text-xs">Net savings over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey={Object.keys(data.series[0])[0]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                    <Bar dataKey="savings" radius={[6, 6, 0, 0]}>
                      {data.series.map((entry, i) => (
                        <Cell key={i} fill={entry.savings >= 0 ? "#10b981" : "#f43f5e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Category breakdown for current month */}
          {data.categoryBreakdown && data.categoryBreakdown.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Category Breakdown (Current Month)</CardTitle>
                <CardDescription className="text-xs">Spending distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={data.categoryBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                        {data.categoryBreakdown.map((entry, i) => (
                          <Cell key={i} fill={getCategoryColor(entry.category)} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
                    {data.categoryBreakdown.map((c) => {
                      const total = data.categoryBreakdown!.reduce((s, x) => s + x.amount, 0);
                      const pct = total > 0 ? (c.amount / total) * 100 : 0;
                      return (
                        <div key={c.category} className="flex items-center gap-2 text-sm">
                          <span className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(c.category) }} />
                          <span className="flex-1 truncate">{getCategoryIcon(c.category)} {c.category}</span>
                          <span className="text-muted-foreground text-xs">{pct.toFixed(0)}%</span>
                          <span className="font-medium tabular-nums w-16 text-right">{formatCurrency(c.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
