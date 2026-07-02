import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserFinancialData,
  getCurrentMonthKey,
  calculateHealthScore,
} from "@/lib/finance";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getUserFinancialData(user.id, getCurrentMonthKey());
  const health = calculateHealthScore({
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    monthlyBudget: data.monthlyBudget,
    savingsRate: data.savingsRate,
    goals: data.goals.map((g) => ({ targetAmount: g.targetAmount, currentAmount: g.currentAmount })),
    categorySpending: data.categorySpending,
  });

  return NextResponse.json({
    score: health.score,
    grade: health.grade,
    breakdown: health.breakdown,
    recommendations: health.recommendations,
    metrics: {
      savingsRate: data.savingsRate,
      totalIncome: data.totalIncome,
      totalExpense: data.totalExpense,
      remainingBalance: data.remainingBalance,
      monthlyBudget: data.monthlyBudget,
      goalsCount: data.goals.length,
    },
  });
}
