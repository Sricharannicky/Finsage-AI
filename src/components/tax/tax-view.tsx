"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Receipt, TrendingDown, Lightbulb, Loader2, CheckCircle2, AlertCircle, Info, IndianRupee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";

interface TaxData {
  financialYear: string;
  summary: string;
  sections: {
    "80C": { limit: number; used: number; remaining: number; breakdown?: { instrument: string; amount: number }[] };
    "80D": { limit: number; used: number; remaining: number };
    "80CCD(1B)": { limit: number; used: number; remaining: number };
    "80E": { limit: number | null; used: number };
  };
  totalPotentialSavings: number;
  estimatedTaxSaved: number;
  taxBracket: string;
  recommendations: { section: string; title: string; description: string; potentialSaving: number; priority: string }[];
  totalRecommendationSaving: number;
}

export function TaxView() {
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<TaxData>("/api/ai/tax-suggestions");
      setData(res);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState message="Analyzing tax-saving opportunities..." />;
  if (!data) return <div className="text-center py-16 text-muted-foreground">Failed to load</div>;

  const sections = [
    { key: "80C", label: "Section 80C", desc: "PPF, ELSS, FD, LIC, Home Loan Principal", color: "#10b981", data: data.sections["80C"] },
    { key: "80D", label: "Section 80D", desc: "Health Insurance Premiums", color: "#06b6d4", data: data.sections["80D"] },
    { key: "80CCD(1B)", label: "80CCD(1B) NPS", desc: "Additional NPS Contribution", color: "#8b5cf6", data: data.sections["80CCD(1B)"] },
    { key: "80E", label: "Section 80E", desc: "Education Loan Interest", color: "#f59e0b", data: { limit: 0, used: data.sections["80E"].used, remaining: 0 } },
  ];

  const chartData = sections.filter((s) => s.key !== "80E").map((s) => ({
    section: s.key,
    Used: s.data.used,
    Remaining: s.data.remaining,
    limit: s.data.limit,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Saving Advisor"
        subtitle={`Optimize your taxes for ${data.financialYear}`}
        icon={Receipt}
      />

      {/* Hero savings card */}
      <Card className="relative overflow-hidden border-0 shadow-xl">
        <div className="absolute inset-0 gradient-emerald opacity-95" />
        <div className="absolute -right-10 -top-10 size-64 rounded-full bg-white/10 blur-3xl" />
        <CardContent className="relative p-6 lg:p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider flex items-center gap-1">
                <IndianRupee className="size-3" /> Potential Additional Tax Savings
              </p>
              <p className="text-4xl lg:text-5xl font-bold mt-2 tracking-tight">
                {formatCurrency(data.totalPotentialSavings)}
              </p>
              <p className="text-sm text-white/80 mt-2">
                Already saved: <b>{formatCurrency(data.estimatedTaxSaved)}</b> ({data.taxBracket})
              </p>
            </div>
            <div className="lg:text-right">
              <p className="text-xs text-white/70 uppercase tracking-wider">Total from Recommendations</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(data.totalRecommendationSaving)}</p>
              <p className="text-xs text-white/70 mt-1">{data.financialYear}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="shadow-sm border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Info className="size-4 text-emerald-500" />
            </div>
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Section utilization chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Section Utilization</CardTitle>
          <CardDescription className="text-xs">Used vs Remaining for each tax-saving section</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="section" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="Used" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Remaining" stackId="a" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-sm bg-emerald-500" /> Used</div>
            <div className="flex items-center gap-1.5"><div className="size-2.5 rounded-sm bg-slate-200" /> Remaining</div>
          </div>
        </CardContent>
      </Card>

      {/* Section breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
        {sections.map((s, i) => {
          const used = s.data.used;
          const limit = s.data.limit;
          const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
          const isFullyUsed = limit > 0 && used >= limit;
          const noLimit = s.key === "80E";
          return (
            <motion.div key={s.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-semibold text-sm">{s.label}</span>
                    </div>
                    {isFullyUsed ? (
                      <Badge variant="outline" className="text-[10px] py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <CheckCircle2 className="size-2.5 mr-0.5" /> Maxed
                      </Badge>
                    ) : noLimit ? (
                      <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-500/20">No Limit</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">{pct.toFixed(0)}% used</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">{s.desc}</p>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      Used {formatCurrency(used)}
                      {limit > 0 && ` of ${formatCurrency(limit)}`}
                    </span>
                    {limit > 0 && !isFullyUsed && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatCurrency(s.data.remaining)} left
                      </span>
                    )}
                  </div>
                  {limit > 0 && <Progress value={pct} className="h-1.5" />}
                  {s.data.breakdown && s.data.breakdown.length > 0 && (
                    <div className="mt-2 pt-2 border-t space-y-1">
                      {s.data.breakdown.map((b) => (
                        <div key={b.instrument} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{b.instrument}</span>
                          <span className="font-medium tabular-nums">{formatCurrency(b.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* AI Recommendations */}
      <Card className="shadow-sm border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="size-6 rounded-lg gradient-violet flex items-center justify-center">
              <Lightbulb className="size-3.5 text-white" />
            </div>
            AI Tax-Saving Recommendations
          </CardTitle>
          <CardDescription className="text-xs">Personalized actions to maximize your tax savings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recommendations.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-3 p-3 rounded-lg bg-card/50 border border-violet-500/10"
            >
              <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                r.priority === "high" ? "bg-rose-500/15 text-rose-500" :
                r.priority === "medium" ? "bg-amber-500/15 text-amber-500" :
                "bg-emerald-500/15 text-emerald-500"
              }`}>
                {r.priority === "high" ? <AlertCircle className="size-4" /> : <TrendingDown className="size-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] py-0">Section {r.section}</Badge>
                  <Badge variant="outline" className={`text-[9px] py-0 ${r.priority === "high" ? "text-rose-600 border-rose-500/20" : "text-amber-600 border-amber-500/20"}`}>{r.priority}</Badge>
                </div>
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase">Save</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(r.potentialSaving)}</p>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        Tax calculations are estimates based on FY 2024-25 Indian tax slabs (30% bracket + 4% cess). Consult a tax professional for personalized advice.
      </p>
    </div>
  );
}
