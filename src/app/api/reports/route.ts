import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey, getMonthRange, getMonthsAgo } from "@/lib/finance";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "monthly"; // daily | weekly | monthly | yearly
  const month = searchParams.get("month") || getCurrentMonthKey();

  const { start, end } = getMonthRange(month);

  if (period === "yearly") {
    const year = parseInt(month.split("-")[0]);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    const [expenses, incomes] = await Promise.all([
      db.expense.findMany({ where: { userId: user.id, date: { gte: yearStart, lte: yearEnd } } }),
      db.income.findMany({ where: { userId: user.id, date: { gte: yearStart, lte: yearEnd } } }),
    ]);
    // Group by month
    const months: { month: string; income: number; expense: number; savings: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 0, 23, 59, 59);
      const inc = incomes.filter((i) => i.date >= mStart && i.date <= mEnd).reduce((s, x) => s + x.amount, 0);
      const exp = expenses.filter((e) => e.date >= mStart && e.date <= mEnd).reduce((s, x) => s + x.amount, 0);
      months.push({
        month: mStart.toLocaleDateString("en-IN", { month: "short" }),
        income: inc,
        expense: exp,
        savings: inc - exp,
      });
    }
    return NextResponse.json({
      period,
      totalIncome: incomes.reduce((s, x) => s + x.amount, 0),
      totalExpense: expenses.reduce((s, x) => s + x.amount, 0),
      series: months,
      categoryBreakdown: buildCategoryBreakdownFromExpenses(expenses),
    });
  }

  if (period === "daily") {
    // Last 30 days
    const days: { day: string; income: number; expense: number }[] = [];
    for (let d = 29; d >= 0; d--) {
      const day = new Date();
      day.setDate(day.getDate() - d);
      const dStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
      const [inc, exp] = await Promise.all([
        db.income.findMany({ where: { userId: user.id, date: { gte: dStart, lte: dEnd } } }),
        db.expense.findMany({ where: { userId: user.id, date: { gte: dStart, lte: dEnd } } }),
      ]);
      days.push({
        day: dStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        income: inc.reduce((s, x) => s + x.amount, 0),
        expense: exp.reduce((s, x) => s + x.amount, 0),
      });
    }
    return NextResponse.json({
      period,
      totalIncome: days.reduce((s, x) => s + x.income, 0),
      totalExpense: days.reduce((s, x) => s + x.expense, 0),
      series: days,
    });
  }

  if (period === "weekly") {
    // Last 8 weeks
    const weeks: { week: string; income: number; expense: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const wEnd = new Date();
      wEnd.setDate(wEnd.getDate() - w * 7);
      const wStart = new Date(wEnd);
      wStart.setDate(wStart.getDate() - 6);
      wStart.setHours(0, 0, 0, 0);
      const wEndFull = new Date(wEnd);
      wEndFull.setHours(23, 59, 59);
      const [inc, exp] = await Promise.all([
        db.income.findMany({ where: { userId: user.id, date: { gte: wStart, lte: wEndFull } } }),
        db.expense.findMany({ where: { userId: user.id, date: { gte: wStart, lte: wEndFull } } }),
      ]);
      weeks.push({
        week: `W${8 - w}`,
        income: inc.reduce((s, x) => s + x.amount, 0),
        expense: exp.reduce((s, x) => s + x.amount, 0),
      });
    }
    return NextResponse.json({
      period,
      totalIncome: weeks.reduce((s, x) => s + x.income, 0),
      totalExpense: weeks.reduce((s, x) => s + x.expense, 0),
      series: weeks,
    });
  }

  // monthly (default) - last 6 months
  const months: { month: string; income: number; expense: number; savings: number }[] = [];
  for (let m = 5; m >= 0; m--) {
    const mk = getMonthsAgo(m);
    const { start: ms, end: me } = getMonthRange(mk);
    const [inc, exp] = await Promise.all([
      db.income.findMany({ where: { userId: user.id, date: { gte: ms, lte: me } } }),
      db.expense.findMany({ where: { userId: user.id, date: { gte: ms, lte: me } } }),
    ]);
    const income = inc.reduce((s, x) => s + x.amount, 0);
    const expense = exp.reduce((s, x) => s + x.amount, 0);
    months.push({
      month: ms.toLocaleDateString("en-IN", { month: "short" }),
      income,
      expense,
      savings: income - expense,
    });
  }

  const [expenses] = await Promise.all([
    db.expense.findMany({ where: { userId: user.id, date: { gte: start, lte: end } } }),
  ]);

  return NextResponse.json({
    period,
    totalIncome: months.reduce((s, x) => s + x.income, 0),
    totalExpense: months.reduce((s, x) => s + x.expense, 0),
    series: months,
    categoryBreakdown: buildCategoryBreakdownFromExpenses(expenses),
  });
}

function buildCategoryBreakdownFromExpenses(expenses: { category: string; amount: number }[]) {
  const map: Record<string, number> = {};
  for (const e of expenses) map[e.category] = (map[e.category] || 0) + e.amount;
  return Object.entries(map)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
