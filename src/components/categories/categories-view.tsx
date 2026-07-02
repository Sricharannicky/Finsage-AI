"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { PieChart as PieIcon, TrendingUp, Loader2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency, getCategoryColor, getCategoryIcon } from "@/lib/constants";
import { toast } from "sonner";

interface CategoryData {
  category: string;
  total: number;
  count: number;
  avgPerTransaction: number;
  byMonth: Record<string, number>;
  byPayment?: Record<string, number>;
  samples?: { date: string; amount: number; note: string | null }[];
}

interface CategoryResponse {
  expenseCategories: CategoryData[];
  incomeCategories: CategoryData[];
  totalExpense: number;
  totalIncome: number;
  months: number;
}

export function CategoriesView() {
  const [data, setData] = useState<CategoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<CategoryResponse>("/api/categories?months=6");
      setData(res);
      if (res.expenseCategories[0]) setSelected(res.expenseCategories[0].category);
    } catch (err: any) {
      toast.error(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState message="Analyzing categories..." />;
  if (!data || (data.expenseCategories.length === 0 && data.incomeCategories.length === 0)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Category Analytics" subtitle="Deep dive into spending by category" icon={Layers} />
        <Card className="shadow-sm"><CardContent><EmptyState icon={Layers} title="No data yet" description="Add transactions to see category analytics" /></CardContent></Card>
      </div>
    );
  }

  const selectedCat = data.expenseCategories.find((c) => c.category === selected);
  const monthsList = selectedCat ? Object.keys(selectedCat.byMonth).sort() : [];
  const seriesData = selectedCat ? monthsList.map((mk) => {
    const [y, m] = mk.split("-").map(Number);
    return { month: new Date(y, m - 1).toLocaleDateString("en-IN", { month: "short" }), amount: selectedCat.byMonth[mk] };
  }) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Category Analytics"
        subtitle="Deep dive into spending patterns by category (last 6 months)"
        icon={Layers}
      />

      <Tabs defaultValue="expense">
        <TabsList>
          <TabsTrigger value="expense" className="text-xs">Expense Categories</TabsTrigger>
          <TabsTrigger value="income" className="text-xs">Income Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Category list */}
            <Card className="shadow-sm lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Categories</CardTitle>
                <CardDescription className="text-xs">Click to drill down</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 max-h-[500px] overflow-y-auto scrollbar-thin">
                {data.expenseCategories.map((c, i) => {
                  const pct = data.totalExpense > 0 ? (c.total / data.totalExpense) * 100 : 0;
                  return (
                    <button
                      key={c.category}
                      onClick={() => setSelected(c.category)}
                      className={`w-full text-left p-3 rounded-lg transition-colors border ${
                        selected === c.category ? "bg-accent border-emerald-500/30" : "border-transparent hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ backgroundColor: `${getCategoryColor(c.category)}20` }}>
                          {getCategoryIcon(c.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.category}</p>
                          <p className="text-[11px] text-muted-foreground">{c.count} txns · {pct.toFixed(0)}% of total</p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{formatCurrency(c.total)}</span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Selected category detail */}
            <div className="lg:col-span-2 space-y-4">
              {selectedCat && (
                <>
                  <Card className="shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5" style={{ backgroundColor: getCategoryColor(selectedCat.category) }} />
                    <CardHeader className="pb-2 relative">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{getCategoryIcon(selectedCat.category)}</span>
                        {selectedCat.category}
                        <Badge variant="outline" className="text-[10px] py-0">{selectedCat.count} transactions</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">6-month total: {formatCurrency(selectedCat.total)} · avg {formatCurrency(selectedCat.avgPerTransaction)}/txn</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Monthly Trend</CardTitle>
                      <CardDescription className="text-xs">Spending over last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {seriesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={seriesData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                            <Line type="monotone" dataKey="amount" stroke={getCategoryColor(selectedCat.category)} strokeWidth={2.5} dot={{ r: 4, fill: getCategoryColor(selectedCat.category) }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="py-10 text-center text-sm text-muted-foreground">No trend data</div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">By Payment Method</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedCat.byPayment && Object.keys(selectedCat.byPayment).length > 0 ? (
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={Object.entries(selectedCat.byPayment).map(([k, v]) => ({ method: k, amount: v }))} layout="vertical" margin={{ left: 0, right: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickFormatter={(v) => `${v / 1000}k`} />
                              <YAxis type="category" dataKey="method" stroke="var(--muted-foreground)" fontSize={10} width={70} />
                              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                              <Bar dataKey="amount" radius={[0, 6, 6, 0]} fill={getCategoryColor(selectedCat.category)} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-xs text-muted-foreground py-4 text-center">No data</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Recent Transactions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
                        {selectedCat.samples && selectedCat.samples.length > 0 ? (
                          selectedCat.samples.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate flex-1">{s.note || selectedCat.category}</span>
                              <span className="font-medium tabular-nums ml-2">{formatCurrency(s.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground py-4 text-center">No samples</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="income" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Income Categories (6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.incomeCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No income recorded</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.incomeCategories.map((c) => ({ category: c.category, total: c.total, count: c.count }))} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="category" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {data.incomeCategories.map((entry, i) => (
                        <Cell key={i} fill={getCategoryColor(entry.category)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
