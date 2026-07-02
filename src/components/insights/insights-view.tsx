"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  LineChart, Line,
} from "recharts";
import {
  Sparkles, TrendingUp, AlertTriangle, Brain, Calendar, Loader2, RefreshCw,
  CheckCircle2, XCircle, Trophy, Lightbulb, Target, Activity, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency, getCategoryIcon, getCategoryColor } from "@/lib/constants";
import { toast } from "sonner";

interface SpendingAnalysis {
  summary: string;
  insights: { type: "positive" | "negative" | "neutral"; title: string; description: string }[];
}

interface PredictionData {
  nextExpense: { value: number; confidence: number; month: string; details?: string; series?: { month: string; actual: number | null; predicted: number | null }[] };
  expectedSavings: { value: number; confidence: number; month: string; details?: string };
  futureBalance: { value: number; confidence: number; month: string; details?: string };
  categoryPredictions: { category: string; predicted: number; trend: number; confidence: number }[];
}

interface WeeklyReport {
  summary: string;
  positiveHabits: string[];
  negativeHabits: string[];
  suggestions: string[];
  achievements: string[];
  warnings: string[];
}

interface HealthData {
  score: number;
  grade: string;
  breakdown: Record<string, number>;
  recommendations: string[];
  metrics: { savingsRate: number; totalIncome: number; totalExpense: number; remainingBalance: number; monthlyBudget: number; goalsCount: number };
}

interface AnomalyData {
  anomalies: {
    type: "high_amount" | "frequency_spike" | "new_category" | "unusual_timing";
    severity: "warning" | "danger" | "info";
    transaction: { id: string; category: string; amount: number; date: string; note: string | null };
    reason: string;
    expectedAmount?: number;
    actualAmount: number;
  }[];
  summary: string;
  stats: { total: number; danger: number; warning: number; info: number; totalAmount: number };
  baselineCategories: number;
}

export function InsightsView() {
  const [tab, setTab] = useState("analysis");
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [anomaly, setAnomaly] = useState<AnomalyData | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingAnomaly, setLoadingAnomaly] = useState(false);

  useEffect(() => {
    loadHealth();
    loadAnalysis();
  }, []);

  async function loadAnalysis() {
    setLoadingAnalysis(true);
    try {
      const res = await api.get<SpendingAnalysis>("/api/ai/analysis");
      setAnalysis(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load analysis");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function loadPrediction() {
    setLoadingPrediction(true);
    try {
      const res = await api.get<PredictionData>("/api/ai/prediction");
      setPrediction(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load predictions");
    } finally {
      setLoadingPrediction(false);
    }
  }

  async function loadWeekly() {
    setLoadingWeekly(true);
    try {
      const res = await api.get<WeeklyReport>("/api/ai/weekly-report");
      setWeekly(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load weekly report");
    } finally {
      setLoadingWeekly(false);
    }
  }

  async function loadHealth() {
    setLoadingHealth(true);
    try {
      const res = await api.get<HealthData>("/api/ai/health-score");
      setHealth(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load health score");
    } finally {
      setLoadingHealth(false);
    }
  }

  async function loadAnomaly() {
    setLoadingAnomaly(true);
    try {
      const res = await api.get<AnomalyData>("/api/ai/anomaly");
      setAnomaly(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load anomalies");
    } finally {
      setLoadingAnomaly(false);
    }
  }

  function onTabChange(v: string) {
    setTab(v);
    if (v === "prediction" && !prediction) loadPrediction();
    if (v === "weekly" && !weekly) loadWeekly();
    if (v === "anomaly" && !anomaly) loadAnomaly();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        subtitle="Deep financial intelligence powered by AI & ML"
        icon={Sparkles}
      />

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
          <TabsTrigger value="analysis" className="gap-1.5 py-2 text-xs sm:text-sm"><Activity className="size-3.5" /> Analysis</TabsTrigger>
          <TabsTrigger value="prediction" className="gap-1.5 py-2 text-xs sm:text-sm"><Brain className="size-3.5" /> Predictions</TabsTrigger>
          <TabsTrigger value="weekly" className="gap-1.5 py-2 text-xs sm:text-sm"><Calendar className="size-3.5" /> Weekly Report</TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5 py-2 text-xs sm:text-sm"><TrendingUp className="size-3.5" /> Health Score</TabsTrigger>
          <TabsTrigger value="anomaly" className="gap-1.5 py-2 text-xs sm:text-sm"><AlertTriangle className="size-3.5" /> Anomalies</TabsTrigger>
        </TabsList>

        {/* Spending Analysis */}
        <TabsContent value="analysis" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="size-4 text-emerald-500" /> AI Spending Analysis</h3>
              <p className="text-xs text-muted-foreground">Natural language summary of your spending patterns this month</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={loadAnalysis} disabled={loadingAnalysis}>
              {loadingAnalysis ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh
            </Button>
          </div>

          {loadingAnalysis && !analysis ? (
            <Card className="shadow-sm"><CardContent className="py-12"><LoadingState message="Analyzing your spending patterns..." /></CardContent></Card>
          ) : analysis ? (
            <>
              <Card className="shadow-sm border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl gradient-emerald flex items-center justify-center flex-shrink-0">
                      <Sparkles className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Monthly Summary</p>
                      <p className="text-sm leading-relaxed">{analysis.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.insights.map((insight, i) => {
                  const config = {
                    positive: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Positive" },
                    negative: { icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "Needs Attention" },
                    neutral: { icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Insight" },
                  }[insight.type];
                  const Icon = config.icon;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className={`shadow-sm ${config.border} ${config.bg}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`size-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`size-4 ${config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{insight.title}</p>
                                <Badge variant="outline" className={`text-[9px] py-0 ${config.color} ${config.border}`}>{config.label}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Predictions */}
        <TabsContent value="prediction" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Brain className="size-4 text-violet-500" /> ML Expense Predictions</h3>
              <p className="text-xs text-muted-foreground">Linear regression & moving average forecasts for next month</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={loadPrediction} disabled={loadingPrediction}>
              {loadingPrediction ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh
            </Button>
          </div>

          {loadingPrediction && !prediction ? (
            <Card className="shadow-sm"><CardContent className="py-12"><LoadingState message="Running prediction models..." /></CardContent></Card>
          ) : prediction ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
                <PredictionCard
                  title="Next Month Expense"
                  value={prediction.nextExpense.value}
                  confidence={prediction.nextExpense.confidence}
                  details={prediction.nextExpense.details}
                  month={prediction.nextExpense.month}
                  gradient="gradient-rose"
                  icon={ArrowUpRight}
                />
                <PredictionCard
                  title="Expected Savings"
                  value={prediction.expectedSavings.value}
                  confidence={prediction.expectedSavings.confidence}
                  details={prediction.expectedSavings.details}
                  month={prediction.expectedSavings.month}
                  gradient="gradient-emerald"
                  icon={ArrowDownRight}
                />
                <PredictionCard
                  title="Projected Balance"
                  value={prediction.futureBalance.value}
                  confidence={prediction.futureBalance.confidence}
                  details={prediction.futureBalance.details}
                  month={prediction.futureBalance.month}
                  gradient="gradient-teal"
                  icon={TrendingUp}
                />
              </div>

              {prediction.nextExpense.series && prediction.nextExpense.series.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Expense Forecast</CardTitle>
                    <CardDescription className="text-xs">Historical actuals vs predicted next month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={prediction.nextExpense.series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                        <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2.5} fill="url(#actualGrad)" name="Actual" />
                        <Area type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="5 5" fill="url(#predictedGrad)" name="Predicted" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {prediction.categoryPredictions.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Category-Level Predictions</CardTitle>
                    <CardDescription className="text-xs">Forecasted spend per category next month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={prediction.categoryPredictions.slice(0, 8)} margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="category" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                        <Bar dataKey="predicted" radius={[6, 6, 0, 0]}>
                          {prediction.categoryPredictions.slice(0, 8).map((entry, i) => (
                            <Cell key={i} fill={getCategoryColor(entry.category)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        {/* Weekly Report */}
        <TabsContent value="weekly" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Calendar className="size-4 text-amber-500" /> AI Weekly Report</h3>
              <p className="text-xs text-muted-foreground">Your financial coach's summary of the past 7 days</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={loadWeekly} disabled={loadingWeekly}>
              {loadingWeekly ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Generate
            </Button>
          </div>

          {loadingWeekly && !weekly ? (
            <Card className="shadow-sm"><CardContent className="py-12"><LoadingState message="Generating your weekly report..." /></CardContent></Card>
          ) : weekly ? (
            <>
              <Card className="shadow-sm border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl gradient-amber flex items-center justify-center flex-shrink-0">
                      <Calendar className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Weekly Summary</p>
                      <p className="text-sm leading-relaxed">{weekly.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ReportSection title="Positive Habits" items={weekly.positiveHabits} icon={CheckCircle2} color="emerald" />
                <ReportSection title="Negative Habits" items={weekly.negativeHabits} icon={XCircle} color="rose" />
                <ReportSection title="Suggestions" items={weekly.suggestions} icon={Lightbulb} color="amber" />
                <ReportSection title="Achievements" items={weekly.achievements} icon={Trophy} color="violet" />
                <div className="md:col-span-2">
                  <ReportSection title="Warnings" items={weekly.warnings} icon={AlertTriangle} color="rose" />
                </div>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Health Score */}
        <TabsContent value="health" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="size-4 text-emerald-500" /> Financial Health Score</h3>
              <p className="text-xs text-muted-foreground">Comprehensive wellness score from 0-100</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={loadHealth} disabled={loadingHealth}>
              {loadingHealth ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh
            </Button>
          </div>

          {loadingHealth && !health ? (
            <Card className="shadow-sm"><CardContent className="py-12"><LoadingState message="Calculating your financial health..." /></CardContent></Card>
          ) : health ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 mesh-bg opacity-50" />
                  <CardContent className="relative p-6 flex flex-col items-center justify-center">
                    <HealthGauge score={health.score} grade={health.grade} />
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Score Breakdown</CardTitle>
                    <CardDescription className="text-xs">How your score is calculated</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Savings Ratio", val: health.breakdown.savings, max: 30, color: "#10b981", desc: "20%+ savings rate target" },
                      { label: "Expense Control", val: health.breakdown.expenses, max: 20, color: "#f59e0b", desc: "Keep expenses under 80% income" },
                      { label: "Budget Discipline", val: health.breakdown.budget, max: 20, color: "#06b6d4", desc: "Stay within set budgets" },
                      { label: "Goal Progress", val: health.breakdown.goals, max: 15, color: "#a855f7", desc: "Savings goals completion" },
                      { label: "Emergency Fund", val: health.breakdown.emergency, max: 15, color: "#ec4899", desc: "3× monthly expenses buffer" },
                    ].map((b) => (
                      <div key={b.label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div>
                            <span className="font-medium">{b.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">{b.desc}</span>
                          </div>
                          <span className="font-semibold tabular-nums" style={{ color: b.color }}>{b.val}/{b.max}</span>
                        </div>
                        <Progress value={(b.val / b.max) * 100} className="h-1.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="size-4 text-amber-500" /> Recommendations</CardTitle>
                  <CardDescription className="text-xs">Personalized tips to improve your score</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {health.recommendations.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3 p-3 rounded-lg bg-accent/30 border">
                      <Target className="size-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{r}</p>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard label="Savings Rate" value={`${health.metrics.savingsRate.toFixed(1)}%`} />
                <MetricCard label="Income" value={formatCurrency(health.metrics.totalIncome)} />
                <MetricCard label="Expense" value={formatCurrency(health.metrics.totalExpense)} />
                <MetricCard label="Balance" value={formatCurrency(health.metrics.remainingBalance)} />
                <MetricCard label="Budget" value={formatCurrency(health.metrics.monthlyBudget)} />
                <MetricCard label="Goals" value={health.metrics.goalsCount.toString()} />
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Anomaly Detection */}
        <TabsContent value="anomaly" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="size-4 text-rose-500" /> Spending Anomaly Detection</h3>
              <p className="text-xs text-muted-foreground">Statistical analysis flags unusual transactions</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={loadAnomaly} disabled={loadingAnomaly}>
              {loadingAnomaly ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh
            </Button>
          </div>

          {loadingAnomaly && !anomaly ? (
            <Card className="shadow-sm"><CardContent className="py-12"><LoadingState message="Detecting anomalies..." /></CardContent></Card>
          ) : anomaly ? (
            <>
              {/* Summary card */}
              <Card className={`shadow-sm ${anomaly.stats.danger > 0 ? "border-rose-500/30 bg-rose-500/5" : anomaly.stats.warning > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      anomaly.stats.danger > 0 ? "bg-rose-500/15" : anomaly.stats.warning > 0 ? "bg-amber-500/15" : "bg-emerald-500/15"
                    }`}>
                      {anomaly.stats.danger > 0 ? <AlertTriangle className="size-5 text-rose-500" /> : anomaly.stats.warning > 0 ? <AlertTriangle className="size-5 text-amber-500" /> : <CheckCircle2 className="size-5 text-emerald-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{anomaly.summary}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {anomaly.stats.danger > 0 && <Badge variant="outline" className="text-[10px] py-0 bg-rose-500/10 text-rose-600 border-rose-500/20">{anomaly.stats.danger} critical</Badge>}
                        {anomaly.stats.warning > 0 && <Badge variant="outline" className="text-[10px] py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">{anomaly.stats.warning} warnings</Badge>}
                        {anomaly.stats.info > 0 && <Badge variant="outline" className="text-[10px] py-0 bg-blue-500/10 text-blue-600 border-blue-500/20">{anomaly.stats.info} info</Badge>}
                        <span className="text-xs text-muted-foreground">Baseline: {anomaly.baselineCategories} categories</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Anomaly list */}
              {anomaly.anomalies.length > 0 ? (
                <div className="space-y-2">
                  {anomaly.anomalies.map((a, i) => {
                    const config = {
                      danger: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/5", border: "border-rose-500/20", icon: "🚨", label: "Critical" },
                      warning: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/20", icon: "⚠️", label: "Warning" },
                      info: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/20", icon: "ℹ️", label: "Info" },
                    }[a.severity];
                    const typeLabel = { high_amount: "High Amount", frequency_spike: "Frequency Spike", new_category: "New Category", unusual_timing: "Unusual Timing" }[a.type];
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className={`shadow-sm ${config.border} ${config.bg}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <span className="text-xl flex-shrink-0">{config.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-[10px] py-0 ${config.color} ${config.border}`}>{config.label}</Badge>
                                  <Badge variant="outline" className="text-[10px] py-0">{typeLabel}</Badge>
                                  <span className="text-xs text-muted-foreground">{new Date(a.transaction.date).toLocaleDateString("en-IN")}</span>
                                </div>
                                <p className="text-sm font-medium">{getCategoryIcon(a.transaction.category)} {a.transaction.category} — {formatCurrency(a.actualAmount)}</p>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.reason}</p>
                                {a.expectedAmount && (
                                  <p className="text-[11px] text-muted-foreground mt-1">Expected: ~{formatCurrency(a.expectedAmount)} · Actual: {formatCurrency(a.actualAmount)}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <Card className="shadow-sm">
                  <CardContent className="py-8 text-center">
                    <CheckCircle2 className="size-10 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-medium">No anomalies detected</p>
                    <p className="text-xs text-muted-foreground mt-1">Your spending patterns look normal this month.</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PredictionCard({ title, value, confidence, details, month, gradient, icon: Icon }: any) {
  const confPct = Math.round(confidence * 100);
  const confColor = confPct >= 70 ? "text-emerald-500" : confPct >= 50 ? "text-amber-500" : "text-rose-500";
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg">
      <div className={`absolute inset-0 ${gradient} opacity-95`} />
      <CardContent className="relative p-5 text-white">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-white/80 uppercase tracking-wider">{title}</p>
          <div className="size-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <Icon className="size-4 text-white" />
          </div>
        </div>
        <p className="text-2xl lg:text-3xl font-bold">{formatCurrency(value)}</p>
        <p className="text-xs text-white/70 mt-1">{month}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-white/70">Confidence</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${confPct}%` }} transition={{ duration: 1 }} />
          </div>
          <span className="text-[10px] font-semibold">{confPct}%</span>
        </div>
        {details && <p className="text-[10px] text-white/60 mt-2 leading-relaxed">{details}</p>}
      </CardContent>
    </Card>
  );
}

function ReportSection({ title, items, icon: Icon, color }: { title: string; items: string[]; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    rose: "border-rose-500/20 bg-rose-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    violet: "border-violet-500/20 bg-violet-500/5",
  };
  const iconColor: Record<string, string> = {
    emerald: "text-emerald-500",
    rose: "text-rose-500",
    amber: "text-amber-500",
    violet: "text-violet-500",
  };
  return (
    <Card className={`shadow-sm ${colorMap[color]}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`size-4 ${iconColor[color]}`} /> {title}
          <Badge variant="outline" className="text-[10px] py-0 ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nothing to report</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className={`mt-1.5 size-1.5 rounded-full flex-shrink-0 ${iconColor[color].replace("text-", "bg-")}`} />
              <p className="leading-relaxed">{item}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function HealthGauge({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : score >= 30 ? "#f97316" : "#ef4444";
  return (
    <div className="relative size-48">
      <svg className="size-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="70" fill="none" stroke="var(--muted)" strokeWidth="10" />
        <motion.circle cx="80" cy="80" r="70" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="text-5xl font-bold tracking-tight" style={{ color }}>{score}</motion.span>
        <span className="text-xs text-muted-foreground">/ 100</span>
        <Badge className="mt-1.5" style={{ backgroundColor: `${color}20`, color }}>{grade}</Badge>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
      </CardContent>
    </Card>
  );
}
