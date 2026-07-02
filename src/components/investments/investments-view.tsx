"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  TrendingUp, Plus, Trash2, Pencil, TrendingDown, Wallet, PieChart as PieIcon, Loader2, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate, CHART_COLORS } from "@/lib/constants";
import { toast } from "sonner";

const INVESTMENT_TYPES = [
  { value: "stock", label: "Stock", icon: "📈" },
  { value: "mutual_fund", label: "Mutual Fund", icon: "📊" },
  { value: "etf", label: "ETF", icon: "🎯" },
  { value: "crypto", label: "Crypto", icon: "₿" },
  { value: "fixed_deposit", label: "Fixed Deposit", icon: "🏦" },
  { value: "ppf", label: "PPF", icon: "🏛️" },
  { value: "gold", label: "Gold", icon: "🥇" },
  { value: "other", label: "Other", icon: "💼" },
];

interface Investment {
  id: string; name: string; type: string; investedAmount: number; currentValue: number;
  units: number; purchaseDate: string; note: string | null;
  gain: number; gainPct: number;
}
interface InvestmentsData {
  investments: Investment[];
  stats: { totalInvested: number; totalValue: number; totalGain: number; totalGainPct: number; count: number };
  byType: { type: string; invested: number; value: number; count: number }[];
}

interface InsightsData {
  summary: string;
  insights: { type: "positive" | "negative" | "neutral"; title: string; description: string }[];
  recommendations: { type: string; priority: string; title: string; description: string; action?: string }[];
  riskScore: number;
  diversificationScore: number;
  stats: { totalInvested: number; totalValue: number; totalGain: number; gainPct: number; typeCount: number; holdingCount: number; maxConcentration: number };
}

export function InvestmentsView() {
  const [data, setData] = useState<InvestmentsData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("mutual_fund");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [units, setUnits] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<InvestmentsData>("/api/investments");
      setData(res);
      // Load AI insights lazily
      setInsightsLoading(true);
      api.get<InsightsData>("/api/ai/investment-insights")
        .then(setInsights)
        .catch(() => setInsights(null))
        .finally(() => setInsightsLoading(false));
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  function openAdd() {
    setEditing(undefined);
    setName(""); setType("mutual_fund"); setInvestedAmount(""); setCurrentValue(""); setUnits("");
    setPurchaseDate(new Date().toISOString().split("T")[0]); setNote("");
    setDialogOpen(true);
  }
  function openEdit(inv: Investment) {
    setEditing(inv);
    setName(inv.name); setType(inv.type); setInvestedAmount(inv.investedAmount.toString());
    setCurrentValue(inv.currentValue.toString()); setUnits(inv.units.toString());
    setPurchaseDate(new Date(inv.purchaseDate).toISOString().split("T")[0]); setNote(inv.note || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name || !investedAmount || !currentValue) { toast.error("Fill required fields"); return; }
    try {
      const body = {
        name, type, investedAmount: parseFloat(investedAmount), currentValue: parseFloat(currentValue),
        units: parseFloat(units || "0"), purchaseDate, note: note || null,
      };
      if (editing) {
        await api.put("/api/investments", { id: editing.id, ...body });
        toast.success("Investment updated");
      } else {
        await api.post("/api/investments", body);
        toast.success("Investment added");
      }
      setDialogOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/api/investments?id=${deleteId}`);
      toast.success("Investment removed");
      setDeleteId(null);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  if (loading) return <LoadingState message="Loading portfolio..." />;

  const stats = data?.stats;
  const gainPositive = (stats?.totalGain || 0) >= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investment Portfolio"
        subtitle="Track your investments and monitor performance"
        icon={TrendingUp}
        actions={<Button size="sm" className="gap-1.5 gradient-emerald text-white border-0" onClick={openAdd}><Plus className="size-3.5" /> Add Investment</Button>}
      />

      {/* Portfolio summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-teal opacity-95" />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Invested</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(stats?.totalInvested || 0)}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 ${gainPositive ? "gradient-emerald" : "gradient-rose"} opacity-95`} />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Current Value</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(stats?.totalValue || 0)}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 ${gainPositive ? "gradient-emerald" : "gradient-rose"} opacity-95`} />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">{gainPositive ? "Total Gain" : "Total Loss"}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(stats?.totalGain || 0)}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className={`absolute inset-0 ${gainPositive ? "gradient-emerald" : "gradient-rose"} opacity-95`} />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Returns</p>
            <p className="text-xl font-bold mt-1">{(stats?.totalGainPct || 0).toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Investment Insights */}
      <Card className="shadow-sm border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="size-6 rounded-lg gradient-violet flex items-center justify-center">
              <Sparkles className="size-3.5 text-white" />
            </div>
            AI Portfolio Insights
          </CardTitle>
          <CardDescription className="text-xs">Diversification & risk analysis with rebalancing suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          {insightsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-card/50 border border-violet-500/10">
                  <div className="size-4 rounded bg-muted animate-pulse flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2.5 rounded bg-muted animate-pulse w-2/3" />
                    <div className="h-2 rounded bg-muted animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : insights && (
            <div className="space-y-3">
              {/* Score gauges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-card/50 border border-violet-500/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Diversification</span>
                    <span className={`text-sm font-bold ${insights.diversificationScore >= 60 ? "text-emerald-600 dark:text-emerald-400" : insights.diversificationScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>{insights.diversificationScore}/100</span>
                  </div>
                  <Progress value={insights.diversificationScore} className="h-1.5" />
                </div>
                <div className="p-3 rounded-lg bg-card/50 border border-violet-500/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Risk Level</span>
                    <span className={`text-sm font-bold ${insights.riskScore <= 40 ? "text-emerald-600 dark:text-emerald-400" : insights.riskScore <= 70 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>{insights.riskScore}/100</span>
                  </div>
                  <Progress value={insights.riskScore} className="h-1.5" />
                </div>
              </div>

              {/* Insights list */}
              {insights.insights.length > 0 && (
                <div className="space-y-1.5">
                  {insights.insights.slice(0, 4).map((ins, i) => {
                    const color = ins.type === "positive" ? "text-emerald-600 dark:text-emerald-400" : ins.type === "negative" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400";
                    const icon = ins.type === "positive" ? "✅" : ins.type === "negative" ? "⚠️" : "💡";
                    return (
                      <div key={i} className="flex gap-2 p-2 rounded-lg bg-card/50 border border-violet-500/10">
                        <span className="text-sm flex-shrink-0">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${color}`}>{ins.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{ins.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <div className="pt-2 border-t border-violet-500/10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recommendations</p>
                  {insights.recommendations.slice(0, 3).map((r, i) => (
                    <div key={i} className="flex gap-2 p-2 rounded-lg bg-violet-500/5 border border-violet-500/10 mb-1">
                      <Badge variant="outline" className={`text-[9px] py-0 h-4 ${r.priority === "high" ? "text-rose-600 border-rose-500/20" : r.priority === "medium" ? "text-amber-600 border-amber-500/20" : "text-emerald-600 border-emerald-500/20"}`}>{r.priority}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{r.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Allocation pie */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><PieIcon className="size-4 text-violet-500" /> Allocation</CardTitle>
            <CardDescription className="text-xs">By current value</CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.byType.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.byType.map((t) => ({ name: t.type, value: t.value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                    {data.byType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">No investments yet</div>
            )}
          </CardContent>
        </Card>

        {/* By type bar */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Invested vs Current by Type</CardTitle>
            <CardDescription className="text-xs">Performance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.byType.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byType.map((t) => ({ type: t.type, invested: t.invested, current: t.value }))} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="type" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="invested" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Invested" />
                  <Bar dataKey="current" fill="#10b981" radius={[4, 4, 0, 0]} name="Current" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">No data to display</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holdings list */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Holdings</CardTitle></CardHeader>
        <CardContent>
          {!data || data.investments.length === 0 ? (
            <EmptyState icon={Wallet} title="No investments tracked"
              description="Add your stocks, mutual funds, FDs, or crypto to monitor performance"
              action={<Button size="sm" className="gradient-emerald text-white border-0 gap-1.5" onClick={openAdd}><Plus className="size-3.5" /> Add Investment</Button>} />
          ) : (
            <div className="space-y-2">
              {data.investments.map((inv, i) => {
                const gain = inv.gain;
                const gainPos = gain >= 0;
                const typeInfo = INVESTMENT_TYPES.find((t) => t.value === inv.type);
                return (
                  <motion.div key={inv.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group">
                    <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-lg flex-shrink-0">{typeInfo?.icon || "💼"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{inv.name}</p>
                        <Badge variant="outline" className="text-[10px] py-0">{typeInfo?.label || inv.type}</Badge>
                        {inv.units > 0 && <span className="text-[10px] text-muted-foreground">{inv.units} units</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Invested {formatCurrency(inv.investedAmount)} · Since {formatDate(inv.purchaseDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm tabular-nums">{formatCurrency(inv.currentValue)}</p>
                      <p className={`text-xs font-medium flex items-center justify-end gap-0.5 ${gainPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {gainPos ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {gainPos ? "+" : ""}{formatCurrency(gain)} ({inv.gainPct.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(inv)}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="size-7 text-rose-500" onClick={() => setDeleteId(inv.id)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Investment" : "Add Investment"}</DialogTitle>
            <DialogDescription>{editing ? "Update holding details" : "Track a new investment"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nifty 50 Index Fund" className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Units</Label>
                <Input type="number" step="0.0001" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Invested (₹) *</Label>
                <Input type="number" value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} placeholder="10000" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Current Value (₹) *</Label>
                <Input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="12000" className="h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="h-10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="gradient-emerald text-white border-0" onClick={handleSave}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this investment?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the holding from your portfolio.</AlertDialogDescription>
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
