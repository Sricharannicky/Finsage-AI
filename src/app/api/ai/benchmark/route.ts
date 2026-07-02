import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getUserFinancialData, getCurrentMonthKey, getMonthsAgo } from "@/lib/finance";

// Financial Benchmarking: compares user's financial ratios against recommended standards
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const data = await getUserFinancialData(user.id, monthKey);

  // Get investments for net worth calculation
  const investments = await db.investment.findMany({
    where: { userId: user.id },
    select: { investedAmount: true, currentValue: true },
  });
  const totalInvestments = investments.reduce((s, i) => s + i.currentValue, 0);

  // Get all-time savings (cumulative income - expense)
  const [allIncome, allExpense] = await Promise.all([
    db.income.aggregate({ where: { userId: user.id }, _sum: { amount: true } }),
    db.expense.aggregate({ where: { userId: user.id }, _sum: { amount: true } }),
  ]);
  const totalSavings = (allIncome._sum.amount || 0) - (allExpense._sum.amount || 0);
  const netWorth = totalSavings + totalInvestments;

  // Get monthly expenses average (last 3 months)
  const [curr, prev1, prev2] = await Promise.all([
    getUserFinancialData(user.id, monthKey),
    getUserFinancialData(user.id, getMonthsAgo(1)),
    getUserFinancialData(user.id, getMonthsAgo(2)),
  ]);
  const avgMonthlyExpense = (curr.totalExpense + prev1.totalExpense + prev2.totalExpense) / 3;
  const avgMonthlyIncome = (curr.totalIncome + prev1.totalIncome + prev2.totalIncome) / 3;

  // Calculate ratios
  const monthlyIncome = data.totalIncome;
  const monthlyExpense = data.totalExpense;
  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  const expenseRatio = monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 0;
  const emergencyFundMonths = avgMonthlyExpense > 0 ? Math.max(0, totalSavings) / avgMonthlyExpense : 0;
  const debtToIncome = monthlyIncome > 0 ? ((data.categorySpending["EMI"] || 0) / monthlyIncome) * 100 : 0;
  const investmentRatio = netWorth > 0 ? (totalInvestments / netWorth) * 100 : 0;
  const housingRatio = monthlyIncome > 0 ? ((data.categorySpending["Rent"] || 0) / monthlyIncome) * 100 : 0;

  // Define benchmarks with recommended ranges
  const benchmarks = [
    {
      key: "savings_rate",
      label: "Savings Rate",
      icon: "💰",
      userValue: savingsRate,
      unit: "%",
      recommended: "20-30%",
      min: 20,
      max: 30,
      ideal: 25,
      description: "Percentage of income saved monthly",
      advice: savingsRate >= 20 ? "Excellent! You're saving above the recommended 20%." :
              savingsRate >= 10 ? "Good start, but aim for 20%+ savings rate." :
              "Critical: Try to save at least 10-20% of your income.",
    },
    {
      key: "expense_ratio",
      label: "Expense Ratio",
      icon: "📊",
      userValue: expenseRatio,
      unit: "%",
      recommended: "50-70%",
      min: 50,
      max: 70,
      ideal: 60,
      description: "Percentage of income spent monthly",
      advice: expenseRatio <= 70 ? "Your expenses are within healthy range." :
              expenseRatio <= 85 ? "Expenses are high — look for areas to cut." :
              "Critical: Expenses exceed 85% of income. Immediate action needed.",
    },
    {
      key: "emergency_fund",
      label: "Emergency Fund",
      icon: "🛡️",
      userValue: emergencyFundMonths,
      unit: " months",
      recommended: "3-6 months",
      min: 3,
      max: 6,
      ideal: 6,
      description: "Months of expenses covered by savings",
      advice: emergencyFundMonths >= 3 ? "Well-prepared for emergencies!" :
              emergencyFundMonths >= 1 ? "Start building toward 3 months of expenses." :
              "No emergency fund yet. Prioritize building one urgently.",
    },
    {
      key: "debt_to_income",
      label: "Debt-to-Income",
      icon: "💳",
      userValue: debtToIncome,
      unit: "%",
      recommended: "< 20%",
      min: 0,
      max: 20,
      ideal: 10,
      description: "EMI as % of income",
      advice: debtToIncome <= 20 ? "Healthy debt levels." :
              debtToIncome <= 36 ? "Moderate debt — monitor closely." :
              "High debt burden. Consider debt consolidation.",
    },
    {
      key: "housing_ratio",
      label: "Housing Ratio",
      icon: "🏠",
      userValue: housingRatio,
      unit: "%",
      recommended: "25-30%",
      min: 25,
      max: 30,
      ideal: 28,
      description: "Rent/housing as % of income",
      advice: housingRatio <= 30 ? "Housing costs are within recommended range." :
              housingRatio <= 40 ? "Housing is a stretch — consider alternatives." :
              "Housing costs exceed 40% — financially stressful.",
    },
    {
      key: "investment_ratio",
      label: "Investment Allocation",
      icon: "📈",
      userValue: investmentRatio,
      unit: "%",
      recommended: "40-60%",
      min: 40,
      max: 60,
      ideal: 50,
      description: "Investments as % of net worth",
      advice: investmentRatio >= 40 ? "Good investment allocation for wealth growth." :
              investmentRatio >= 20 ? "Consider investing more for long-term wealth." :
              "Low investment allocation. Start investing to beat inflation.",
    },
  ];

  // Overall score
  const scores = benchmarks.map((b) => {
    if (b.userValue >= b.min && b.userValue <= b.max) return 100;
    const dist = b.userValue < b.min ? b.min - b.userValue : b.userValue - b.max;
    return Math.max(0, 100 - dist * 5);
  });
  const overallScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);

  let grade = "Poor";
  if (overallScore >= 85) grade = "Excellent";
  else if (overallScore >= 70) grade = "Good";
  else if (overallScore >= 50) grade = "Average";

  return NextResponse.json({
    benchmarks,
    overallScore,
    grade,
    summary: `Your financial health scores ${overallScore}/100 (${grade}). ${benchmarks.filter((b) => b.userValue >= b.min && b.userValue <= b.max).length} of ${benchmarks.length} ratios are in the recommended range.`,
    netWorth,
    monthlyIncome,
    monthlyExpense,
  });
}
