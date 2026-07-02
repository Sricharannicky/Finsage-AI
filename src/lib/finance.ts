import { db } from "./db";
import { getCategoryColor } from "./constants";

// Get month key YYYY-MM
export function getMonthKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentMonthKey(): string {
  return getMonthKey(new Date());
}

export function getPreviousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return getMonthKey(d);
}

export function getMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return getMonthKey(d);
}

export function getMonthRange(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

// Fetch user financial data for a given month
export async function getUserFinancialData(userId: string, monthKey?: string) {
  const mk = monthKey || getCurrentMonthKey();
  const { start, end } = getMonthRange(mk);

  const [incomes, expenses, budgets, goals] = await Promise.all([
    db.income.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    }),
    db.expense.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    }),
    db.budget.findMany({
      where: { userId, month: mk },
    }),
    db.savingsGoal.findMany({
      where: { userId },
    }),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const monthlyBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const remainingBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (remainingBalance / totalIncome) * 100 : 0;

  const categorySpending: Record<string, number> = {};
  for (const e of expenses) {
    categorySpending[e.category] = (categorySpending[e.category] || 0) + e.amount;
  }

  return {
    incomes,
    expenses,
    budgets,
    goals,
    totalIncome,
    totalExpense,
    monthlyBudget,
    remainingBalance,
    savingsRate,
    categorySpending,
  };
}

// Calculate Financial Health Score (0-100)
// Factors: Savings Ratio (30%), Expense Ratio (20%), Budget Discipline (20%), Goal Progress (15%), Emergency Fund (15%)
export function calculateHealthScore(data: {
  totalIncome: number;
  totalExpense: number;
  monthlyBudget: number;
  savingsRate: number;
  goals: { targetAmount: number; currentAmount: number }[];
  categorySpending: Record<string, number>;
}): { score: number; grade: string; breakdown: Record<string, number>; recommendations: string[] } {
  const { totalIncome, totalExpense, monthlyBudget, savingsRate, goals, categorySpending } = data;
  const recommendations: string[] = [];

  // 1. Savings Ratio (30 points) - ideal 20%+ savings
  const savingsScore = Math.min(30, (savingsRate / 20) * 30);
  if (savingsRate < 20) {
    recommendations.push(`Increase your savings rate to at least 20% (currently ${savingsRate.toFixed(1)}%).`);
  }

  // 2. Expense Ratio (20 points) - keep expenses under 80% of income
  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 1;
  const expenseScore = Math.max(0, 20 - Math.max(0, (expenseRatio - 0.8) * 100));
  if (expenseRatio > 0.8) {
    recommendations.push(`Your expenses are ${(expenseRatio * 100).toFixed(0)}% of income. Reduce discretionary spending.`);
  }

  // 3. Budget Discipline (20 points) - staying within budget
  let budgetScore = 20;
  if (monthlyBudget > 0) {
    const budgetUsed = totalExpense / monthlyBudget;
    if (budgetUsed > 1) {
      budgetScore = Math.max(0, 20 - (budgetUsed - 1) * 40);
      recommendations.push(`You exceeded your monthly budget by ${((budgetUsed - 1) * 100).toFixed(0)}%.`);
    } else {
      budgetScore = 20 - (1 - budgetUsed) * 5; // small penalty for under-utilization
    }
  } else {
    budgetScore = 10;
    recommendations.push("Set a monthly budget to track your spending discipline.");
  }

  // 4. Goal Progress (15 points)
  let goalScore = 0;
  if (goals.length > 0) {
    const avgProgress =
      goals.reduce((s, g) => s + Math.min(1, g.currentAmount / g.targetAmount), 0) / goals.length;
    goalScore = avgProgress * 15;
    if (avgProgress < 0.3) {
      recommendations.push("Accelerate contributions toward your savings goals.");
    }
  } else {
    goalScore = 5;
    recommendations.push("Create savings goals to build long-term wealth.");
  }

  // 5. Emergency Fund (15 points) - check if savings (3 months of expenses)
  const emergencyFundTarget = totalExpense * 3;
  const currentSavings = Math.max(0, totalIncome - totalExpense);
  let emergencyScore = 0;
  if (emergencyFundTarget > 0) {
    emergencyScore = Math.min(15, (currentSavings / emergencyFundTarget) * 15);
    if (currentSavings < emergencyFundTarget) {
      recommendations.push(`Build an emergency fund of 3× monthly expenses (${Math.round(emergencyFundTarget).toLocaleString("en-IN")}).`);
    }
  } else {
    emergencyScore = 7;
  }

  const score = Math.round(Math.max(0, Math.min(100, savingsScore + expenseScore + budgetScore + goalScore + emergencyScore)));
  let grade = "Poor";
  if (score >= 85) grade = "Excellent";
  else if (score >= 70) grade = "Good";
  else if (score >= 50) grade = "Average";
  else if (score >= 30) grade = "Fair";

  if (recommendations.length === 0) {
    recommendations.push("Excellent financial discipline! Keep maintaining your healthy habits.");
  }

  return {
    score,
    grade,
    breakdown: {
      savings: Math.round(savingsScore),
      expenses: Math.round(expenseScore),
      budget: Math.round(budgetScore),
      goals: Math.round(goalScore),
      emergency: Math.round(emergencyScore),
    },
    recommendations,
  };
}

// Detect overspending patterns
export function detectOverspending(
  currentExpenses: { category: string; amount: number; date: Date; note: string | null }[],
  previousCategorySpending: Record<string, number>,
  budgets: { category: string; amount: number }[]
): { type: string; severity: "warning" | "danger" | "info"; title: string; message: string }[] {
  const alerts: { type: string; severity: "warning" | "danger" | "info"; title: string; message: string }[] = [];

  // Category budget exceeded
  const currentByCategory: Record<string, number> = {};
  for (const e of currentExpenses) {
    currentByCategory[e.category] = (currentByCategory[e.category] || 0) + e.amount;
  }

  for (const b of budgets) {
    const spent = currentByCategory[b.category] || 0;
    if (spent > b.amount && b.amount > 0) {
      const pct = Math.round((spent / b.amount) * 100);
      alerts.push({
        type: "budget_exceeded",
        severity: pct > 120 ? "danger" : "warning",
        title: `${b.category} budget exceeded`,
        message: `You've spent ${pct}% of your ${b.category} budget.`,
      });
    }
  }

  // Category spending increase vs previous month
  for (const [cat, amount] of Object.entries(currentByCategory)) {
    const prev = previousCategorySpending[cat] || 0;
    if (prev > 0 && amount > prev * 1.2) {
      const increase = Math.round(((amount - prev) / prev) * 100);
      alerts.push({
        type: "spending_increase",
        severity: increase > 40 ? "danger" : "warning",
        title: `${cat} spending increased ${increase}%`,
        message: `Your ${cat} expenses rose from ${Math.round(prev).toLocaleString("en-IN")} to ${Math.round(amount).toLocaleString("en-IN")} this month.`,
      });
    }
  }

  // Late-night shopping pattern
  const lateNight = currentExpenses.filter((e) => {
    const h = new Date(e.date).getHours();
    return (h >= 22 || h < 4) && (e.category === "Shopping" || e.category === "Entertainment" || e.category === "Food");
  });
  if (lateNight.length >= 3) {
    const total = lateNight.reduce((s, e) => s + e.amount, 0);
    alerts.push({
      type: "late_night_spending",
      severity: "warning",
      title: "Late-night spending detected",
      message: `${lateNight.length} late-night purchases totaling ${Math.round(total).toLocaleString("en-IN")}. Consider setting a spending curfew.`,
    });
  }

  // Repeated subscriptions
  const subscriptionLike = currentExpenses.filter(
    (e) => e.recurring || (e.note?.toLowerCase().includes("subscription") ?? false)
  );
  if (subscriptionLike.length >= 3) {
    const total = subscriptionLike.reduce((s, e) => s + e.amount, 0);
    alerts.push({
      type: "subscriptions",
      severity: "info",
      title: "Recurring subscriptions active",
      message: `${subscriptionLike.length} recurring charges totaling ${Math.round(total).toLocaleString("en-IN")} this month. Review unused subscriptions.`,
    });
  }

  return alerts;
}

// Build category breakdown for charts
export function buildCategoryBreakdown(categorySpending: Record<string, number>) {
  return Object.entries(categorySpending)
    .map(([category, amount]) => ({
      category,
      amount,
      color: getCategoryColor(category),
    }))
    .sort((a, b) => b.amount - a.amount);
}

// Build 6-month income/expense trend
export async function buildIncomeExpenseTrend(userId: string, months = 6) {
  const trend: { month: string; income: number; expense: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const mk = getMonthsAgo(i);
    const { start, end } = getMonthRange(mk);
    const [incomes, expenses] = await Promise.all([
      db.income.findMany({ where: { userId, date: { gte: start, lte: end } } }),
      db.expense.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    ]);
    const monthLabel = new Date(start).toLocaleDateString("en-IN", { month: "short" });
    trend.push({
      month: monthLabel,
      income: incomes.reduce((s, x) => s + x.amount, 0),
      expense: expenses.reduce((s, x) => s + x.amount, 0),
    });
  }
  return trend;
}
