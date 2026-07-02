"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Calendar, TrendingUp, TrendingDown, Wallet, Activity, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency, getCategoryColor, getCategoryIcon } from "@/lib/constants";
import { toast } from "sonner";

interface DayData {
  date: string;
  expense: number;
  income: number;
  count: number;
  topCategory: string | null;
}
interface CalendarResponse {
  days: DayData[];
  stats: {
    totalExpense: number;
    totalIncome: number;
    activeDays: number;
    noSpendDays: number;
    maxExpense: number;
    avgPerActiveDay: number;
    totalDays: number;
  };
  dowAvg: { day: string; avg: number }[];
}

export function CalendarView() {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState("3");
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  useEffect(() => {
    load();
  }, [months]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<CalendarResponse>(`/api/calendar?months=${months}`);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState message="Building spending calendar..." />;
  if (!data) return <div className="text-center py-16 text-muted-foreground">Failed to load</div>;

  const max = data.stats.maxExpense || 1;

  function getColor(expense: number): string {
    if (expense === 0) return "var(--muted)";
    const ratio = expense / max;
    if (ratio > 0.75) return "#dc2626"; // red-600
    if (ratio > 0.5) return "#f97316"; // orange-500
    if (ratio > 0.25) return "#f59e0b"; // amber-500
    return "#84cc16"; // lime-500
  }

  // Group days by week (columns) for calendar grid
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];
  if (data.days[0]) {
    const firstDow = new Date(data.days[0].date).getDay();
    for (let i = 0; i < firstDow; i++) currentWeek.push({ date: "", expense: 0, income: 0, count: 0, topCategory: null });
  }
  for (const day of data.days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spending Calendar"
        subtitle="Daily spending heatmap & patterns"
        icon={Calendar}
        actions={
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 month</SelectItem>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon={TrendingDown} label="Total Expense" value={formatCurrency(data.stats.totalExpense)} color="rose" />
        <StatCard icon={TrendingUp} label="Total Income" value={formatCurrency(data.stats.totalIncome)} color="emerald" />
        <StatCard icon={Activity} label="Avg / Active Day" value={formatCurrency(data.stats.avgPerActiveDay)} color="amber" />
        <StatCard icon={Flame} label="No-Spend Days" value={`${data.stats.noSpendDays}`} color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Heatmap calendar */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="size-4 text-emerald-500" /> Daily Heatmap
            </CardTitle>
            <CardDescription className="text-xs">Click a day to see details. Color intensity = spend amount.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 pr-1 text-[10px] text-muted-foreground pt-0.5">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="size-7 flex items-center justify-center">{d}</div>
                ))}
              </div>
              {/* Weeks */}
              <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-2 flex-1">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1 flex-shrink-0">
                    {week.map((day, di) => {
                      if (!day.date) return <div key={di} className="size-7" />;
                      const isSelected = selectedDay?.date === day.date;
                      return (
                        <motion.button
                          key={di}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedDay(day)}
                          title={`${new Date(day.date).toLocaleDateString("en-IN")}: ${day.expense > 0 ? formatCurrency(day.expense) : "no spend"}`}
                          className={`size-7 rounded-md transition-all relative ${isSelected ? "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background" : ""}`}
                          style={{
                            backgroundColor: getColor(day.expense),
                            opacity: day.expense === 0 ? 0.3 : Math.max(0.4, day.expense / max),
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="size-3 rounded-sm bg-muted opacity-30" />
                <div className="size-3 rounded-sm" style={{ backgroundColor: "#84cc16" }} />
                <div className="size-3 rounded-sm" style={{ backgroundColor: "#f59e0b" }} />
                <div className="size-3 rounded-sm" style={{ backgroundColor: "#f97316" }} />
                <div className="size-3 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
              </div>
              <span>More</span>
            </div>
          </CardContent>
        </Card>

        {/* Selected day detail */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Day Detail</CardTitle>
            <CardDescription className="text-xs">
              {selectedDay ? new Date(selectedDay.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "Click a day to inspect"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDay ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Calendar className="size-8 mx-auto mb-2 opacity-30" />
                Select any day in the heatmap
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase">Expense</p>
                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(selectedDay.expense)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase">Income</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedDay.income)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Transactions</span>
                  <span className="font-semibold">{selectedDay.count}</span>
                </div>
                {selectedDay.topCategory && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-xs text-muted-foreground">Top Category</span>
                    <Badge variant="outline" className="text-xs">
                      {getCategoryIcon(selectedDay.topCategory)} {selectedDay.topCategory}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Net</span>
                  <span className={`font-semibold ${selectedDay.income - selectedDay.expense >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatCurrency(selectedDay.income - selectedDay.expense)}
                  </span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Day of week pattern */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4 text-violet-500" /> Spending Pattern by Day of Week
          </CardTitle>
          <CardDescription className="text-xs">Average spend per weekday (helps spot weekend splurges)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.dowAvg} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                {data.dowAvg.map((entry, i) => {
                  const isWeekend = i === 0 || i === 6;
                  return <Cell key={i} fill={isWeekend ? "#f43f5e" : "#10b981"} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-emerald-500" /> Weekday
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm bg-rose-500" /> Weekend
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colorMap: Record<string, string> = {
    rose: "gradient-rose",
    emerald: "gradient-emerald",
    amber: "gradient-amber",
    violet: "gradient-violet",
  };
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg">
      <div className={`absolute inset-0 ${colorMap[color]} opacity-95`} />
      <CardContent className="relative p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/80 uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold mt-1">{value}</p>
          </div>
          <Icon className="size-5 text-white/80" />
        </div>
      </CardContent>
    </Card>
  );
}
