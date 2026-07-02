"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ArrowUpCircle, Plus, Search, Pencil, Trash2, Download, Filter, TrendingDown, Flag,
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
import { EXPENSE_CATEGORIES, formatCurrency, formatDate, getCategoryColor, getCategoryIcon } from "@/lib/constants";
import { getCurrentMonthKey } from "@/lib/finance";
import { toast } from "sonner";
import type { Expense, ExpenseCategory } from "@/lib/types";

export function ExpenseView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [month, setMonth] = useState(getCurrentMonthKey());

  useEffect(() => {
    loadExpenses();
  }, [month, categoryFilter, search]);

  async function loadExpenses() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (search) params.set("search", search);
      const res = await api.get<{ expenses: Expense[] }>(`/api/expenses?${params}`);
      setExpenses(res.expenses);
    } catch (err: any) {
      toast.error(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/api/expenses?id=${deleteId}`);
      toast.success("Expense deleted");
      setDeleteId(null);
      loadExpenses();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) map[e.category] = (map[e.category] || 0) + e.amount;
    return Object.entries(map).map(([category, amount]) => ({ category, amount, color: getCategoryColor(category) })).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const avgTransaction = expenses.length > 0 ? total / expenses.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Track every rupee you spend"
        icon={ArrowUpCircle}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={`/api/export?type=expenses&month=${month}`} download>
                <Download className="size-3.5" /> Export
              </a>
            </Button>
            <Button size="sm" className="gap-1.5 gradient-rose text-white border-0" onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
              <Plus className="size-3.5" /> Add Expense
            </Button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-rose opacity-95" />
          <CardContent className="relative p-4 lg:p-5 text-white">
            <p className="text-xs text-white/80 uppercase tracking-wider">Total Expense</p>
            <p className="text-2xl lg:text-3xl font-bold mt-1">{formatCurrency(total)}</p>
            <p className="text-xs text-white/70 mt-2">{expenses.length} transactions</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-amber opacity-95" />
          <CardContent className="relative p-4 lg:p-5 text-white">
            <p className="text-xs text-white/80 uppercase tracking-wider">Avg / Transaction</p>
            <p className="text-2xl lg:text-3xl font-bold mt-1">{formatCurrency(avgTransaction)}</p>
            <p className="text-xs text-white/70 mt-2">{byCategory.length} categories</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-violet opacity-95" />
          <CardContent className="relative p-4 lg:p-5 text-white">
            <p className="text-xs text-white/80 uppercase tracking-wider">Top Category</p>
            <p className="text-2xl lg:text-3xl font-bold mt-1">
              {byCategory[0] ? `${getCategoryIcon(byCategory[0].category)} ${byCategory[0].category}` : "—"}
            </p>
            <p className="text-xs text-white/70 mt-2">
              {byCategory[0] ? formatCurrency(byCategory[0].amount) : "No expenses"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category Distribution</CardTitle>
            <CardDescription className="text-xs">Pie chart breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={byCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                    {byCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Categories</CardTitle>
            <CardDescription className="text-xs">By amount spent</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byCategory.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                  <YAxis type="category" dataKey="category" stroke="var(--muted-foreground)" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                    {byCategory.slice(0, 6).map((entry, i) => <Cell key={i} fill={entry.color} />)}
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
                placeholder="Search by category, note, payment method..."
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
                {EXPENSE_CATEGORIES.map((c) => (
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
          <CardTitle className="text-base">All Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={ArrowUpCircle}
              title="No expenses found"
              description="Add your first expense to start tracking your spending"
              action={<Button size="sm" className="gradient-rose text-white border-0 gap-1.5" onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="size-3.5" /> Add Expense</Button>}
            />
          ) : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto scrollbar-thin">
              {expenses.map((expense, i) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <div className="size-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${getCategoryColor(expense.category)}20` }}>
                    {getCategoryIcon(expense.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{expense.note || expense.category}</p>
                      {expense.recurring && <Badge variant="outline" className="text-[10px] py-0">Recurring</Badge>}
                      {expense.flagged && <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-500/30"><Flag className="size-2.5 mr-0.5" />Flagged</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {expense.category} · {expense.paymentMethod} · {formatDate(expense.date)}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">-{formatCurrency(expense.amount)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditing(expense); setDialogOpen(true); }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-rose-500 hover:text-rose-600" onClick={() => setDeleteId(expense.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog type="expense" open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={loadExpenses} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The expense record will be permanently removed.</AlertDialogDescription>
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
