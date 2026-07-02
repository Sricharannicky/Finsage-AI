import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getMonthsAgo, getMonthRange } from "@/lib/finance";

// Savings Rate Tracker: returns 6-month savings rate history + target
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const series: { month: string; savingsRate: number; income: number; expense: number; savings: number; target: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const mk = getMonthsAgo(i);
    const { start, end } = getMonthRange(mk);
    const [incomes, expenses] = await Promise.all([
      db.income.findMany({ where: { userId: user.id, date: { gte: start, lte: end } }, select: { amount: true } }),
      db.expense.findMany({ where: { userId: user.id, date: { gte: start, lte: end } }, select: { amount: true } }),
    ]);
    const income = incomes.reduce((s, x) => s + x.amount, 0);
    const expense = expenses.reduce((s, x) => s + x.amount, 0);
    const savings = income - expense;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    const [y, m] = mk.split("-").map(Number);
    series.push({
      month: new Date(y, m - 1).toLocaleDateString("en-IN", { month: "short" }),
      savingsRate: Math.round(savingsRate * 10) / 10,
      income,
      expense,
      savings,
      target: 20, // 20% recommended savings rate
    });
  }

  const current = series[series.length - 1];
  const avgRate = series.reduce((s, x) => s + x.savingsRate, 0) / series.length;
  const bestMonth = series.reduce((best, x) => x.savingsRate > best.savingsRate ? x : best, series[0]);
  const monthsOnTarget = series.filter((x) => x.savingsRate >= 20).length;

  return NextResponse.json({
    series,
    current: current.savingsRate,
    target: 20,
    avgRate: Math.round(avgRate * 10) / 10,
    bestMonth: { month: bestMonth.month, rate: bestMonth.savingsRate },
    monthsOnTarget,
    totalMonths: series.length,
    trend: series[series.length - 1].savingsRate - series[0].savingsRate,
  });
}
