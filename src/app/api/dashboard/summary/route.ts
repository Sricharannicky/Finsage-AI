import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  getUserFinancialData,
  getCurrentMonthKey,
  getMonthsAgo,
  calculateHealthScore,
  buildCategoryBreakdown,
  buildIncomeExpenseTrend,
} from "@/lib/finance";
// AI insights are now loaded lazily via /api/ai/cached-insights to keep dashboard fast

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || getCurrentMonthKey();

  const data = await getUserFinancialData(user.id, month);
  const health = calculateHealthScore({
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    monthlyBudget: data.monthlyBudget,
    savingsRate: data.savingsRate,
    goals: data.goals.map((g) => ({ targetAmount: g.targetAmount, currentAmount: g.currentAmount })),
    categorySpending: data.categorySpending,
  });

  const categoryBreakdown = buildCategoryBreakdown(data.categorySpending);
  const trend = await buildIncomeExpenseTrend(user.id, 6);

  const recentTransactions = [
    ...data.expenses.slice(0, 8).map((e) => ({
      id: e.id,
      type: "expense" as const,
      amount: e.amount,
      category: e.category,
      date: e.date.toISOString(),
      note: e.note,
    })),
    ...data.incomes.slice(0, 4).map((i) => ({
      id: i.id,
      type: "income" as const,
      amount: i.amount,
      category: i.category,
      date: i.date.toISOString(),
      note: i.note || i.source,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  const goalsProgress = data.goals.map((g) => ({
    id: g.id,
    title: g.title,
    progress: Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)),
    target: g.targetAmount,
    current: g.currentAmount,
  }));

  // AI insights loaded lazily by client via /api/ai/cached-insights (with TTL cache)
  const aiSuggestions: string[] = [];

  // Count unread notifications
  const unreadCount = await db.notification.count({
    where: { userId: user.id, read: false },
  });

  return NextResponse.json({
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    remainingBalance: data.remainingBalance,
    monthlyBudget: data.monthlyBudget,
    monthlySavings: data.remainingBalance,
    savingsRate: data.savingsRate,
    healthScore: health.score,
    healthGrade: health.grade,
    healthBreakdown: health.breakdown,
    healthRecommendations: health.recommendations,
    recentTransactions,
    incomeTrend: trend,
    categoryBreakdown,
    goalsProgress,
    aiSuggestions,
    unreadNotifications: unreadCount,
    month,
  });
}
