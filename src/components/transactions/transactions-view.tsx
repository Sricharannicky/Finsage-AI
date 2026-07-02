"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight, Search, Filter, Download, ArrowDownCircle, ArrowUpCircle, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate, getCategoryIcon } from "@/lib/constants";
import { getCurrentMonthKey } from "@/lib/finance";
import type { Income, Expense } from "@/lib/types";
import type { ViewType } from "@/components/layout/app-shell";

type Txn = (Income & { _type: "income" }) | (Expense & { _type: "expense" });

export function TransactionsView({ onViewChange }: { onViewChange: (v: ViewType) => void }) {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [month, setMonth] = useState(getCurrentMonthKey());

  useEffect(() => {
    loadTransactions();
  }, [month]);

  async function loadTransactions() {
    setLoading(true);
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        api.get<{ incomes: Income[] }>(`/api/income?month=${month}`),
        api.get<{ expenses: Expense[] }>(`/api/expenses?month=${month}`),
      ]);
      const combined: Txn[] = [
        ...incomeRes.incomes.map((i) => ({ ...i, _type: "income" as const })),
        ...expenseRes.expenses.map((e) => ({ ...e, _type: "expense" as const })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTxns(combined);
    } catch {
      setTxns([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = txns;
    if (typeFilter !== "all") result = result.filter((t) => t._type === typeFilter);
    if (categoryFilter !== "all") result = result.filter((t) => t.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.category.toLowerCase().includes(q) ||
        (t.note?.toLowerCase().includes(q)) ||
        ("source" in t && t.source?.toLowerCase().includes(q)) ||
        ("paymentMethod" in t && t.paymentMethod?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [txns, typeFilter, categoryFilter, search]);

  const totalIncome = filtered.filter((t) => t._type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t._type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    txns.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [txns]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Transactions"
        subtitle="Unified view of income and expenses"
        icon={ArrowLeftRight}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={`/api/export?type=all&month=${month}`} download>
              <Download className="size-3.5" /> Export CSV
            </a>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-emerald opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Income</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(totalIncome)}</p>
              </div>
              <ArrowDownCircle className="size-5 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-rose opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Expense</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(totalExpense)}</p>
              </div>
              <ArrowUpCircle className="size-5 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 ${net >= 0 ? "gradient-teal" : "gradient-amber"} opacity-95`} />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Net</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(net)}</p>
              </div>
              <Calendar className="size-5 text-white/80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)} className="flex-1">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="income" className="text-xs">Income</TabsTrigger>
                <TabsTrigger value="expense" className="text-xs">Expense</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
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
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>{getCategoryIcon(c)} {c}</SelectItem>
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

      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Transactions</CardTitle>
            <CardDescription className="text-xs">{filtered.length} of {txns.length} shown</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No transactions found"
              description="Try changing filters or add transactions using the + button"
            />
          ) : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto scrollbar-thin">
              {filtered.map((t, i) => {
                const isIncome = t._type === "income";
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="size-9 rounded-lg">
                      <AvatarFallback className={`rounded-lg text-sm ${
                        isIncome ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      }`}>
                        {getCategoryIcon(t.category)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {"source" in t && t.source ? t.source : t.note || t.category}
                        </p>
                        <Badge variant="outline" className={`text-[10px] py-0 ${isIncome ? "text-emerald-600 border-emerald-500/20" : "text-rose-600 border-rose-500/20"}`}>
                          {isIncome ? "Income" : "Expense"}
                        </Badge>
                        {"recurring" in t && t.recurring && <Badge variant="outline" className="text-[10px] py-0">Recurring</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.category}
                        {"paymentMethod" in t && t.paymentMethod ? ` · ${t.paymentMethod}` : ""}
                        {"source" in t && t.source && t.note ? ` · ${t.note}` : ""}
                        {" · "}{formatDate(t.date)}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                      {isIncome ? "+" : "-"}{formatCurrency(t.amount)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
