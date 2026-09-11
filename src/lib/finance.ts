// Server-only finance data layer (Firestore via ./db)
// Client components must import pure helpers from "./finance-utils" instead,
// otherwise firebase-admin gets bundled into the browser build.
import { db } from "./db";
import {
  getMonthKey,
  getCurrentMonthKey,
  getPreviousMonthKey,
  getMonthsAgo,
  getMonthRange,
  calculateHealthScore,
  detectOverspending,
  buildCategoryBreakdown,
} from "./finance-utils";

export {
  getMonthKey,
  getCurrentMonthKey,
  getPreviousMonthKey,
  getMonthsAgo,
  getMonthRange,
  calculateHealthScore,
  detectOverspending,
  buildCategoryBreakdown,
};

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

  const totalIncome = incomes.reduce((s: number, i: any) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const monthlyBudget = budgets.reduce((s: number, b: any) => s + b.amount, 0);
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
      income: incomes.reduce((s: number, x: any) => s + x.amount, 0),
      expense: expenses.reduce((s: number, x: any) => s + x.amount, 0),
    });
  }
  return trend;
}
