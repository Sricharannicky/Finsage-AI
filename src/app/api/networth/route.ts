import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getMonthsAgo, getMonthRange } from "@/lib/finance";

// Net worth over time: combines cumulative savings (income - expenses) + current investment value
// OPTIMIZED: pre-sort income/expenses by date and use running totals instead of filtering per month
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const months = 12;
  const now = new Date();

  const [allIncomes, allExpenses] = await Promise.all([
    db.income.findMany({
      where: { userId: user.id },
      select: { amount: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.expense.findMany({
      where: { userId: user.id },
      select: { amount: true, date: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const investments = await db.investment.findMany({
    where: { userId: user.id },
    select: { investedAmount: true, currentValue: true, purchaseDate: true },
  });
  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const totalInvestmentValue = investments.reduce((s, i) => s + i.currentValue, 0);

  // Pre-compute month cutoff timestamps
  const cutoffs: { mk: string; cutoff: Date; label: string }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const mk = getMonthsAgo(i);
    const { end } = getMonthRange(mk);
    const cutoff = end < now ? end : now;
    const [y, m] = mk.split("-").map(Number);
    const label = new Date(y, m - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    cutoffs.push({ mk, cutoff, label });
  }

  // Cumulative savings via running totals (single pass through sorted arrays)
  const series: { month: string; cumulativeSavings: number; investmentValue: number; netWorth: number }[] = [];
  let incIdx = 0;
  let expIdx = 0;
  let runningSavings = 0;

  for (const { cutoff, label } of cutoffs) {
    const cutoffTs = cutoff.getTime();
    // Advance income pointer
    while (incIdx < allIncomes.length && new Date(allIncomes[incIdx].date).getTime() <= cutoffTs) {
      runningSavings += allIncomes[incIdx].amount;
      incIdx++;
    }
    // Advance expense pointer
    while (expIdx < allExpenses.length && new Date(allExpenses[expIdx].date).getTime() <= cutoffTs) {
      runningSavings -= allExpenses[expIdx].amount;
      expIdx++;
    }

    // Investment value at this month (linear interpolation purchase→current)
    let investmentValue = 0;
    for (const inv of investments) {
      const purchase = new Date(inv.purchaseDate);
      if (purchase > cutoff) continue;
      const totalDays = (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24);
      const elapsedDays = (cutoffTs - purchase.getTime()) / (1000 * 60 * 60 * 24);
      if (totalDays > 0) {
        const ratio = Math.min(1, Math.max(0, elapsedDays / totalDays));
        investmentValue += inv.investedAmount + (inv.currentValue - inv.investedAmount) * ratio;
      } else {
        investmentValue += inv.currentValue;
      }
    }

    series.push({
      month: label,
      cumulativeSavings: Math.round(runningSavings),
      investmentValue: Math.round(investmentValue),
      netWorth: Math.round(runningSavings + investmentValue),
    });
  }

  const currentSavings = series[series.length - 1]?.cumulativeSavings || 0;
  const currentNetWorth = series[series.length - 1]?.netWorth || 0;
  const prevNetWorth = series[series.length - 2]?.netWorth || 0;
  const netWorthChange = currentNetWorth - prevNetWorth;
  const netWorthChangePct = prevNetWorth !== 0 ? (netWorthChange / Math.abs(prevNetWorth)) * 100 : 0;

  const yearAgoNetWorth = series[0]?.netWorth || 0;
  const yearlyGrowth = currentNetWorth - yearAgoNetWorth;
  const yearlyGrowthPct = yearAgoNetWorth !== 0 ? (yearlyGrowth / Math.abs(yearAgoNetWorth)) * 100 : 0;

  return NextResponse.json({
    series,
    current: {
      netWorth: currentNetWorth,
      savings: currentSavings,
      investments: totalInvestmentValue,
      invested: totalInvested,
      investmentGain: totalInvestmentValue - totalInvested,
    },
    changes: {
      monthly: netWorthChange,
      monthlyPct: netWorthChangePct,
      yearly: yearlyGrowth,
      yearlyPct: yearlyGrowthPct,
    },
    breakdown: {
      savings: currentSavings,
      investments: totalInvestmentValue,
      savingsPct: currentNetWorth > 0 ? (currentSavings / currentNetWorth) * 100 : 0,
      investmentsPct: currentNetWorth > 0 ? (totalInvestmentValue / currentNetWorth) * 100 : 0,
    },
  });
}
