import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserFinancialData, getCurrentMonthKey, getMonthsAgo } from "@/lib/finance";

// Month-over-month comparison for the dashboard widget
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const [curr, prev] = await Promise.all([
    getUserFinancialData(user.id, monthKey),
    getUserFinancialData(user.id, getMonthsAgo(1)),
  ]);

  const incomeChange = curr.totalIncome - prev.totalIncome;
  const expenseChange = curr.totalExpense - prev.totalExpense;
  const savingsChange = (curr.remainingBalance) - (prev.remainingBalance);
  const savingsRateChange = curr.savingsRate - prev.savingsRate;

  // Category-level changes (top 5 by absolute change)
  const allCats = new Set([...Object.keys(curr.categorySpending), ...Object.keys(prev.categorySpending)]);
  const catChanges = Array.from(allCats).map((cat) => {
    const c = curr.categorySpending[cat] || 0;
    const p = prev.categorySpending[cat] || 0;
    return { category: cat, current: c, previous: p, change: c - p, changePct: p > 0 ? ((c - p) / p) * 100 : (c > 0 ? 100 : 0) };
  }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);

  return NextResponse.json({
    current: {
      month: monthKey,
      income: curr.totalIncome,
      expense: curr.totalExpense,
      savings: curr.remainingBalance,
      savingsRate: curr.savingsRate,
    },
    previous: {
      month: getMonthsAgo(1),
      income: prev.totalIncome,
      expense: prev.totalExpense,
      savings: prev.remainingBalance,
      savingsRate: prev.savingsRate,
    },
    changes: {
      income: incomeChange,
      expense: expenseChange,
      savings: savingsChange,
      savingsRate: savingsRateChange,
      incomePct: prev.totalIncome > 0 ? (incomeChange / prev.totalIncome) * 100 : 0,
      expensePct: prev.totalExpense > 0 ? (expenseChange / prev.totalExpense) * 100 : 0,
    },
    categoryChanges: catChanges,
  });
}
