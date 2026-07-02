"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw, ArrowDownCircle, ArrowUpCircle, Calendar, Loader2, Zap, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate, getCategoryIcon } from "@/lib/constants";
import { toast } from "sonner";

interface RecurringItem {
  id: string; type: "income" | "expense"; category: string; source: string;
  amount: number; note: string | null; paymentMethod?: string;
  lastDate: string; nextDate: string; frequency: string;
}
interface RecurringData {
  recurring: RecurringItem[];
  stats: {
    incomeCount: number; expenseCount: number; totalMonthlyIncome: number;
    totalMonthlyExpense: number; netRecurring: number; upcomingCount: number;
  };
}

export function RecurringView() {
  const [data, setData] = useState<RecurringData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<RecurringData>("/api/recurring-list");
      setData(res);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function toggleRecurring(item: RecurringItem, recurring: boolean) {
    try {
      await api.put("/api/recurring-list", { type: item.type, id: item.id, recurring });
      toast.success(`${item.source} ${recurring ? "set as recurring" : "set as one-time"}`);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  if (loading) return <LoadingState message="Loading recurring transactions..." />;

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Transactions"
        subtitle="Manage all your recurring income and expenses"
        icon={RefreshCw}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-emerald opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Monthly Income</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(stats?.totalMonthlyIncome || 0)}</p>
              </div>
              <ArrowDownCircle className="size-5 text-white/80" />
            </div>
            <p className="text-[10px] text-white/70 mt-1">{stats?.incomeCount} recurring sources</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-rose opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Monthly Expense</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(stats?.totalMonthlyExpense || 0)}</p>
              </div>
              <ArrowUpCircle className="size-5 text-white/80" />
            </div>
            <p className="text-[10px] text-white/70 mt-1">{stats?.expenseCount} recurring bills</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 ${(stats?.netRecurring || 0) >= 0 ? "gradient-teal" : "gradient-amber"} opacity-95`} />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Net Recurring</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(stats?.netRecurring || 0)}</p>
              </div>
              <Zap className="size-5 text-white/80" />
            </div>
            <p className="text-[10px] text-white/70 mt-1">monthly cash flow</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-violet opacity-95" />
          <CardContent className="relative p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/80 uppercase tracking-wider">Due This Week</p>
                <p className="text-xl font-bold mt-1">{stats?.upcomingCount || 0}</p>
              </div>
              <Clock className="size-5 text-white/80" />
            </div>
            <p className="text-[10px] text-white/70 mt-1">within 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring list */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Recurring Items</CardTitle>
          <CardDescription className="text-xs">Toggle recurring status or check next occurrence</CardDescription>
        </CardHeader>
        <CardContent>
          {!data || data.recurring.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title="No recurring transactions"
              description="Mark transactions as recurring when adding them, and they'll appear here for easy management"
            />
          ) : (
            <div className="space-y-2">
              {data.recurring.map((item, i) => {
                const isIncome = item.type === "income";
                const nextDate = new Date(item.nextDate);
                const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isUpcoming = daysUntil <= 7 && daysUntil >= 0;
                const isOverdue = daysUntil < 0;
                return (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
                  >
                    <div className={`size-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                      isIncome ? "bg-emerald-500/15" : "bg-rose-500/15"
                    }`}>
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{item.source || item.category}</p>
                        <Badge variant="outline" className={`text-[10px] py-0 ${isIncome ? "text-emerald-600 border-emerald-500/20" : "text-rose-600 border-rose-500/20"}`}>
                          {isIncome ? "Income" : "Expense"}
                        </Badge>
                        {isUpcoming && (
                          <Badge variant="outline" className="text-[10px] py-0 bg-amber-500/10 text-amber-600 border-amber-500/20 gap-0.5">
                            <Clock className="size-2.5" /> {daysUntil === 0 ? "Today" : `${daysUntil}d`}
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge variant="outline" className="text-[10px] py-0 bg-rose-500/10 text-rose-600 border-rose-500/20">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.category}
                        {item.paymentMethod ? ` · ${item.paymentMethod}` : ""}
                        {` · Last: ${formatDate(item.lastDate)}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-semibold text-sm tabular-nums ${isIncome ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                        {isIncome ? "+" : "-"}{formatCurrency(item.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Next: {formatDate(item.nextDate)}
                      </p>
                    </div>
                    <Switch
                      defaultChecked
                      onCheckedChange={(checked) => toggleRecurring(item, checked)}
                      className="flex-shrink-0"
                    />
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
