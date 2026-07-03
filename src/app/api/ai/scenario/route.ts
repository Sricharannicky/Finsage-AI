import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getUserFinancialData, getCurrentMonthKey } from "@/lib/finance";

// AI Savings Scenario Simulator: what-if analysis
// Lets users see projected impact of salary increase, expense reduction, etc.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const data = await getUserFinancialData(user.id, monthKey);

  const currentIncome = data.totalIncome;
  const currentExpense = data.totalExpense;
  const currentSavings = currentIncome - currentExpense;
  const currentSavingsRate = currentIncome > 0 ? (currentSavings / currentIncome) * 100 : 0;

  // Get investments for net worth
  const investments = await db.investment.findMany({
    where: { userId: user.id },
    select: { investedAmount: true, currentValue: true },
  });
  const totalInvestments = investments.reduce((s, i) => s + i.currentValue, 0);

  // Build scenarios
  const scenarios = [
    {
      id: "salary_10",
      title: "Salary +10%",
      icon: "📈",
      description: "If your income increases by 10%",
      income: Math.round(currentIncome * 1.1),
      expense: currentExpense,
      savings: Math.round(currentIncome * 1.1 - currentExpense),
      savingsRate: currentIncome > 0 ? Math.round(((currentIncome * 1.1 - currentExpense) / (currentIncome * 1.1)) * 1000) / 10 : 0,
      monthlyChange: Math.round(currentIncome * 0.1),
      yearlyImpact: Math.round(currentIncome * 0.1 * 12),
    },
    {
      id: "salary_20",
      title: "Salary +20%",
      icon: "🚀",
      description: "If your income increases by 20%",
      income: Math.round(currentIncome * 1.2),
      expense: currentExpense,
      savings: Math.round(currentIncome * 1.2 - currentExpense),
      savingsRate: currentIncome > 0 ? Math.round(((currentIncome * 1.2 - currentExpense) / (currentIncome * 1.2)) * 1000) / 10 : 0,
      monthlyChange: Math.round(currentIncome * 0.2),
      yearlyImpact: Math.round(currentIncome * 0.2 * 12),
    },
    {
      id: "expense_10",
      title: "Expenses -10%",
      icon: "✂️",
      description: "If you cut spending by 10%",
      income: currentIncome,
      expense: Math.round(currentExpense * 0.9),
      savings: Math.round(currentIncome - currentExpense * 0.9),
      savingsRate: currentIncome > 0 ? Math.round(((currentIncome - currentExpense * 0.9) / currentIncome) * 1000) / 10 : 0,
      monthlyChange: Math.round(currentExpense * 0.1),
      yearlyImpact: Math.round(currentExpense * 0.1 * 12),
    },
    {
      id: "expense_20",
      title: "Expenses -20%",
      icon: "🎯",
      description: "If you cut spending by 20%",
      income: currentIncome,
      expense: Math.round(currentExpense * 0.8),
      savings: Math.round(currentIncome - currentExpense * 0.8),
      savingsRate: currentIncome > 0 ? Math.round(((currentIncome - currentExpense * 0.8) / currentIncome) * 1000) / 10 : 0,
      monthlyChange: Math.round(currentExpense * 0.2),
      yearlyImpact: Math.round(currentExpense * 0.2 * 12),
    },
    {
      id: "both",
      title: "Salary +10% & Expenses -10%",
      icon: "💪",
      description: "Double win: earn more, spend less",
      income: Math.round(currentIncome * 1.1),
      expense: Math.round(currentExpense * 0.9),
      savings: Math.round(currentIncome * 1.1 - currentExpense * 0.9),
      savingsRate: currentIncome > 0 ? Math.round(((currentIncome * 1.1 - currentExpense * 0.9) / (currentIncome * 1.1)) * 1000) / 10 : 0,
      monthlyChange: Math.round(currentIncome * 0.1 + currentExpense * 0.1),
      yearlyImpact: Math.round((currentIncome * 0.1 + currentExpense * 0.1) * 12),
    },
    {
      id: "sip_5000",
      title: "Start ₹5,000 SIP",
      icon: "🏦",
      description: "Invest ₹5,000/month in mutual funds",
      income: currentIncome,
      expense: currentExpense,
      savings: currentSavings,
      savingsRate: currentSavingsRate,
      monthlyChange: -5000,
      yearlyImpact: -60000,
      note: "₹5K/month SIP at 12% return → ₹12.4L in 10 years",
    },
  ];

  return NextResponse.json({
    current: {
      income: currentIncome,
      expense: currentExpense,
      savings: currentSavings,
      savingsRate: Math.round(currentSavingsRate * 10) / 10,
      netWorth: currentSavings + totalInvestments,
    },
    scenarios,
  });
}
