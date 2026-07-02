"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  ArrowDownCircle, Plus, Search, Pencil, Trash2, Download, Filter, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { TransactionDialog } from "@/components/shared/transaction-dialog";
import { api } from "@/lib/api-client";
import { INCOME_CATEGORIES, formatCurrency, formatDate, getCategoryColor } from "@/lib/constants";
import { getCurrentMonthKey } from "@/lib/finance";
import { toast } from "sonner";
import type { Income, IncomeCategory } from "@/lib/types";

export function IncomeView() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Income | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [month, setMonth] = useState(getCurrentMonthKey());

  useEffect(() => {
    loadIncomes();
  }, [month, categoryFilter, search]);

  async function loadIncomes() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (search) params.set("search", search);
      const res = await api.get<{ incomes: Income[] }>(`/api/income?${params}`);
      setIncomes(res.incomes);
    } catch (err: any) {
      toast.error(err.message || "Failed to load income");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/api/income?id=${deleteId}`);
      toast.success("Income deleted");
      setDeleteId(null);
      loadIncomes();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  }

  const total = incomes.reduce((s, i) => s + i.amount, 0);
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of incomes) map[i.category] = (map[i.category] || 0) + i.amount;
    return Object.entries(map).map(([category, amount]) => ({ category, amount, color: getCategoryColor(category) }));
  }, [incomes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        subtitle="Track and manage all your earnings"
        icon={ArrowDownCircle}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={`/api/export?type=income&month=${month}`} download>
                <Download className="size-3.5" /> Export
              </a>
            </Button>
            <Button size="sm" className="gap-1.5 gradient-emerald text-white border-0" onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
              <Plus className="size-3.5" /> Add Income
            </Button>
          </>
        }
      />

      {/* Summary + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-emerald opacity-95" />
          <CardContent className="relative p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/80 uppercase tracking-wider">Total Income</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(total)}</p>
              </div>
              <div className="size-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <TrendingUp className="size-5 text-white" />
              </div>
            </div>
            <p className="text-xs text-white/70 mt-3">
              {incomes.length} transactions this month
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Income by Category</CardTitle>
            <CardDescription className="text-xs">Breakdown for selected month</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byCategory} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                  <YAxis type="category" dataKey="category" stroke="var(--muted-foreground)" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                    {byCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by source, category, note..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44 h-10">
                <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {INCOME_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full sm:w-40 h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Income</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : incomes.length === 0 ? (
            <EmptyState
              icon={ArrowDownCircle}
              title="No income found"
              description="Add your first income source to start tracking your earnings"
              action={<Button size="sm" className="gradient-emerald text-white border-0 gap-1.5" onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="size-3.5" /> Add Income</Button>}
            />
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto scrollbar-thin">
              {incomes.map((income, i) => (
                <motion.div
                  key={income.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <div className="size-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${getCategoryColor(income.category)}20` }}>
                    {INCOME_CATEGORIES.find((c) => c.value === income.category)?.icon || "💰"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{income.source || income.category}</p>
                      {income.recurring && <Badge variant="outline" className="text-[10px] py-0">Recurring</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {income.category} · {formatDate(income.date)}
                      {income.note && ` · ${income.note}`}
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{formatCurrency(income.amount)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditing(income); setDialogOpen(true); }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-rose-500 hover:text-rose-600" onClick={() => setDeleteId(income.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog type="income" open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={loadIncomes} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this income?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The income record will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
