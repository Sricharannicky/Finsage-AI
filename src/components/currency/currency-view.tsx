"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, RefreshCw, Loader2, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";

interface CurrencyData {
  base: string;
  userCurrency: string;
  rates: Record<string, { rate: number; symbol: string; name: string }>;
  lastUpdated: string;
  note: string;
}

export function CurrencyView() {
  const [data, setData] = useState<CurrencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("INR");
  const [toCurrency, setToCurrency] = useState("USD");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<CurrencyData>("/api/currency");
      setData(res);
      setFromCurrency(res.userCurrency || "INR");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState message="Loading exchange rates..." />;
  if (!data) return <div className="text-center py-16 text-muted-foreground">Failed to load</div>;

  const rates = data.rates;
  const fromRate = rates[fromCurrency]?.rate || 1;
  const toRate = rates[toCurrency]?.rate || 1;
  const amountNum = parseFloat(amount) || 0;

  // Convert: amount_in_INR = amount / fromRate, then to_target = amount_in_INR * toRate
  const amountInINR = amountNum / fromRate;
  const converted = amountInINR * toRate;
  const exchangeRate = (1 / fromRate) * toRate;

  // All rates relative to "from" currency
  const allRates = Object.entries(rates)
    .filter(([code]) => code !== fromCurrency)
    .map(([code, info]) => ({
      code,
      name: info.name,
      symbol: info.symbol,
      rate: (1 / fromRate) * info.rate,
    }))
    .sort((a, b) => b.rate - a.rate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Currency Converter"
        subtitle="Multi-currency support with live exchange rates"
        icon={Globe}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={load}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        }
      />

      {/* Converter card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Convert</CardTitle>
          <CardDescription className="text-xs">Base currency: {data.base} · Your currency: {data.userCurrency}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(rates).map(([code, info]) => (
                    <SelectItem key={code} value={code}>{info.symbol} {code} — {info.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg font-semibold" />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full mx-auto"
              onClick={() => { setFromCurrency(toCurrency); setToCurrency(fromCurrency); }}
            >
              <ArrowRightLeft className="size-4" />
            </Button>

            <div className="space-y-1.5">
              <Label>To</Label>
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(rates).map(([code, info]) => (
                    <SelectItem key={code} value={code}>{info.symbol} {code} — {info.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="h-12 flex items-center px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {rates[toCurrency]?.symbol}{converted.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              1 {fromCurrency} = <span className="font-bold text-foreground">{exchangeRate.toFixed(4)} {toCurrency}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {rates[fromCurrency]?.symbol}{amountNum.toLocaleString("en-IN")} = {rates[toCurrency]?.symbol}{converted.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* All rates table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Exchange Rates</CardTitle>
          <CardDescription className="text-xs">1 {fromCurrency} ({rates[fromCurrency]?.name}) converted to all currencies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allRates.map((r, i) => (
              <motion.div
                key={r.code}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`flex items-center justify-between p-2.5 rounded-lg border ${r.code === toCurrency ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card/50 border-border"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{r.symbol}</span>
                  <div>
                    <p className="text-sm font-medium">{r.code}</p>
                    <p className="text-[10px] text-muted-foreground">{r.name}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums">{r.rate.toFixed(4)}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">{data.note}</p>
    </div>
  );
}
