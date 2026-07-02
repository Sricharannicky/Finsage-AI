import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey, getMonthRange } from "@/lib/finance";

// Spending velocity: daily avg spend rate this month + projection
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const { start, end } = getMonthRange(monthKey);
  const now = new Date();

  const expenses = await db.expense.findMany({
    where: { userId: user.id, date: { gte: start, lte: now } },
    select: { amount: true, date: true },
  });

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  const dailyAvg = totalSpent / daysElapsed;
  const projectedTotal = dailyAvg * daysInMonth;
  const projectedRemaining = projectedTotal - totalSpent;

  // Daily spending for last 14 days (sparkline data)
  const dailySeries: { day: string; amount: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    const dayTotal = expenses
      .filter((e) => {
        const ed = new Date(e.date);
        return ed >= dStart && ed <= dEnd;
      })
      .reduce((s, e) => s + e.amount, 0);
    dailySeries.push({
      day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      amount: dayTotal,
    });
  }

  // Velocity status
  let status: "normal" | "high" | "low" = "normal";
  const budget = await db.budget.aggregate({
    where: { userId: user.id, month: monthKey },
    _sum: { amount: true },
  });
  const totalBudget = budget._sum.amount || 0;
  const expectedSpend = totalBudget > 0 ? (totalBudget / daysInMonth) * daysElapsed : 0;
  const velocityRatio = expectedSpend > 0 ? totalSpent / expectedSpend : 1;

  if (velocityRatio > 1.2) status = "high";
  else if (velocityRatio < 0.7) status = "low";

  return NextResponse.json({
    totalSpent,
    dailyAvg: Math.round(dailyAvg),
    projectedTotal: Math.round(projectedTotal),
    projectedRemaining: Math.round(projectedRemaining),
    daysElapsed,
    daysRemaining,
    daysInMonth,
    dailySeries,
    status,
    velocityRatio: Math.round(velocityRatio * 100) / 100,
    expectedSpend: Math.round(expectedSpend),
    totalBudget,
  });
}
