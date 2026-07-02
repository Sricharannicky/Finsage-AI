"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PiggyBank, Plus, Trash2, Sparkles, Loader2, Wand2, TrendingUp, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { EXPENSE_CATEGORIES, formatCurrency, getCategoryColor, getCategoryIcon } from "@/lib/constants";
import { toast } from "sonner";
import type { Budget } from "@/lib/types";

interface BudgetWithSpent extends Budget {
  spent: number;
  remaining: number;
  pct: number;
}

export function BudgetView() {
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestions: { category: string; amount: number; reason: string }[]; total: number; explanation: string } | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    loadBudgets();
  }, []);

  async function loadBudgets() {
    setLoading(true);
    try {
      const res = await api.get<{ budgets: Budget[]; month: string }>("/api/budgets");
      // Fetch current month spending per category
      const month = res.month;
      const expensesRes = await api.get<{ expenses: { category: string; amount: number }[] }>(`/api/expenses?month=${month}`);
      const spent: Record<string, number> = {};
      for (const e of expensesRes.expenses) spent[e.category] = (spent[e.category] || 0) + e.amount;

      const withSpent: BudgetWithSpent[] = res.budgets.map((b) => {
        const s = spent[b.category] || 0;
        return { ...b, spent: s, remaining: b.amount - s, pct: b.amount > 0 ? (s / b.amount) * 100 : 0 };
      });
      setBudgets(withSpent);
    } catch (err: any) {
      toast.error(err.message || "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newCategory || !newAmount) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await api.post("/api/budgets", { category: newCategory, amount: parseFloat(newAmount), period: "monthly" });
      toast.success("Budget added");
      setDialogOpen(false);
      setNewCategory("");
      setNewAmount("");
      loadBudgets();
    } catch (err: any) {
      toast.error(err.message || "Failed to add budget");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/budgets?id=${id}`);
      toast.success("Budget removed");
      loadBudgets();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  }

  async function handleAiSuggest() {
    setAiLoading(true);
    try {
      const res = await api.get<{ suggestions: { category: string; amount: number; reason: string }[]; total: number; explanation: string }>("/api/ai/budget-suggestion");
      setAiSuggestion(res);
      toast.success("AI budget suggestion ready!");
    } catch (err: any) {
      toast.error(err.message || "AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function applyAiSuggestion() {
    if (!aiSuggestion) return;
    try {
      await Promise.all(
        aiSuggestion.suggestions.map((s) =>
          api.post("/api/budgets", { category: s.category, amount: s.amount, period: "monthly" })
        )
      );
      toast.success("AI budget applied!");
      setAiSuggestion(null);
      loadBudgets();
    } catch (err: any) {
      toast.error(err.message || "Failed to apply");
    }
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Planning"
        subtitle="Set monthly budgets and let AI suggest allocations"
        icon={PiggyBank}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10" onClick={handleAiSuggest} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5 text-emerald-500" />}
              AI Suggest
            </Button>
            <Button size="sm" className="gap-1.5 gradient-emerald text-white border-0" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" /> Add Budget
            </Button>
          </>
        }
      />

      {/* Overall progress */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <Card className="sm:col-span-2 relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-teal opacity-95" />
          <CardContent className="relative p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-white/80 uppercase tracking-wider">Total Monthly Budget</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(totalBudget)}</p>
              </div>
              <div className="size-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <PiggyBank className="size-5 text-white" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-white/80 mb-1">
              <span>Spent: {formatCurrency(totalSpent)}</span>
              <span>{overallPct.toFixed(0)}% used</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, overallPct)}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="size-4 text-emerald-500" />
              <p className="text-sm font-medium">Budget Health</p>
            </div>
            <p className="text-2xl font-bold">
              {overallPct < 80 ? "On Track" : overallPct < 100 ? "Watch Out" : "Over Budget"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {budgets.filter((b) => b.pct > 100).length} categories over budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestion panel */}
      {aiSuggestion && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-sm border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="size-6 rounded-lg gradient-emerald flex items-center justify-center">
                      <Sparkles className="size-3.5 text-white" />
                    </div>
                    AI-Recommended Budget Allocation
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">{aiSuggestion.explanation}</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">Total: {formatCurrency(aiSuggestion.total)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiSuggestion.suggestions.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-card/50 border border-emerald-500/10">
                    <span className="text-lg">{getCategoryIcon(s.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.category}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{s.reason}</p>
                    </div>
                    <span className="font-semibold text-sm tabular-nums">{formatCurrency(s.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="gradient-emerald text-white border-0 gap-1.5" onClick={applyAiSuggestion}>
                  <CheckCircle2 className="size-3.5" /> Apply All
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAiSuggestion(null)}>Dismiss</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Budget list */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Category Budgets</CardTitle>
          <CardDescription className="text-xs">Current month spending vs budget</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : budgets.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No budgets set"
              description="Create category budgets or let AI suggest an allocation based on your spending"
              action={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30" onClick={handleAiSuggest}>
                    <Wand2 className="size-3.5 text-emerald-500" /> AI Suggest
                  </Button>
                  <Button size="sm" className="gradient-emerald text-white border-0 gap-1.5" onClick={() => setDialogOpen(true)}>
                    <Plus className="size-3.5" /> Add Budget
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {budgets.map((b, i) => {
                const over = b.pct > 100;
                const warning = b.pct > 80 && b.pct <= 100;
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(b.category)}</span>
                        <span className="font-medium text-sm">{b.category}</span>
                        {over && <Badge variant="outline" className="text-[10px] py-0 text-rose-600 border-rose-500/30"><AlertTriangle className="size-2.5 mr-0.5" />Over</Badge>}
                        {warning && <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-500/30">Near limit</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Spent {formatCurrency(b.spent)} of {formatCurrency(b.amount)}</span>
                      <span className={over ? "text-rose-500 font-semibold" : warning ? "text-amber-500 font-semibold" : ""}>{b.pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(100, b.pct)} className={`h-2 ${over ? "[&>div]:bg-rose-500" : warning ? "[&>div]:bg-amber-500" : ""}`} />
                    <p className="text-xs mt-2">
                      {b.remaining >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(b.remaining)} remaining</span>
                      ) : (
                        <span className="text-rose-500">{formatCurrency(Math.abs(b.remaining))} over budget</span>
                      )}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Budget</DialogTitle>
            <DialogDescription>Set a monthly spending limit for a category</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monthly Amount (₹)</Label>
              <Input id="amount" type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0" className="h-10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="gradient-emerald text-white border-0" onClick={handleAdd}>Add Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
