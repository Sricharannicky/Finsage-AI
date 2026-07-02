import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Category analytics: per-category stats over last N months
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get("months") || "6");

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const expenses = await db.expense.findMany({
    where: { userId: user.id, date: { gte: startDate } },
    select: { category: true, amount: true, date: true, note: true, paymentMethod: true },
  });
  const incomes = await db.income.findMany({
    where: { userId: user.id, date: { gte: startDate } },
    select: { category: true, amount: true, date: true, source: true },
  });

  // Build per-category time series for expenses
  const expenseCategories: Record<string, { total: number; count: number; byMonth: Record<string, number>; byPayment: Record<string, number>; samples: { date: string; amount: number; note: string | null }[] }> = {};
  for (const e of expenses) {
    if (!expenseCategories[e.category]) {
      expenseCategories[e.category] = { total: 0, count: 0, byMonth: {}, byPayment: {}, samples: [] };
    }
    expenseCategories[e.category].total += e.amount;
    expenseCategories[e.category].count += 1;
    const mk = `${new Date(e.date).getFullYear()}-${String(new Date(e.date).getMonth() + 1).padStart(2, "0")}`;
    expenseCategories[e.category].byMonth[mk] = (expenseCategories[e.category].byMonth[mk] || 0) + e.amount;
    expenseCategories[e.category].byPayment[e.paymentMethod] = (expenseCategories[e.category].byPayment[e.paymentMethod] || 0) + e.amount;
    if (expenseCategories[e.category].samples.length < 5) {
      expenseCategories[e.category].samples.push({ date: e.date.toISOString(), amount: e.amount, note: e.note });
    }
  }

  // Build income categories
  const incomeCategories: Record<string, { total: number; count: number; byMonth: Record<string, number> }> = {};
  for (const i of incomes) {
    if (!incomeCategories[i.category]) incomeCategories[i.category] = { total: 0, count: 0, byMonth: {} };
    incomeCategories[i.category].total += i.amount;
    incomeCategories[i.category].count += 1;
    const mk = `${new Date(i.date).getFullYear()}-${String(new Date(i.date).getMonth() + 1).padStart(2, "0")}`;
    incomeCategories[i.category].byMonth[mk] = (incomeCategories[i.category].byMonth[mk] || 0) + i.amount;
  }

  // Sort categories by total
  const expenseSorted = Object.entries(expenseCategories)
    .map(([category, data]) => ({ category, ...data, avgPerTransaction: data.total / data.count }))
    .sort((a, b) => b.total - a.total);
  const incomeSorted = Object.entries(incomeCategories)
    .map(([category, data]) => ({ category, ...data, avgPerTransaction: data.total / data.count }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    expenseCategories: expenseSorted,
    incomeCategories: incomeSorted,
    totalExpense: expenses.reduce((s, e) => s + e.amount, 0),
    totalIncome: incomes.reduce((s, i) => s + i.amount, 0),
    months,
  });
}
