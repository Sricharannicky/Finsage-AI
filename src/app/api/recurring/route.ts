import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey, getMonthRange } from "@/lib/finance";

// Auto-generate recurring income & expenses for the current month
// if they haven't been created yet this month
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const { start, end } = getMonthRange(monthKey);
  const today = new Date();

  const [recurringIncomes, recurringExpenses] = await Promise.all([
    db.income.findMany({
      where: { userId: user.id, recurring: true, date: { lt: start } },
      orderBy: { date: "desc" },
    }),
    db.expense.findMany({
      where: { userId: user.id, recurring: true, date: { lt: start } },
      orderBy: { date: "desc" },
    }),
  ]);

  // Deduplicate by category+source — keep latest recurring template per category
  const incomeTemplates = new Map<string, typeof recurringIncomes[0]>();
  for (const i of recurringIncomes) {
    const key = `${i.category}|${i.source}`;
    if (!incomeTemplates.has(key)) incomeTemplates.set(key, i);
  }
  const expenseTemplates = new Map<string, typeof recurringExpenses[0]>();
  for (const e of recurringExpenses) {
    const key = e.category;
    if (!expenseTemplates.has(key)) expenseTemplates.set(key, e);
  }

  // Check which ones already exist this month (avoid duplicates)
  const existingThisMonth = await Promise.all([
    db.income.findMany({
      where: { userId: user.id, recurring: true, date: { gte: start, lte: end } },
      select: { category: true, source: true },
    }),
    db.expense.findMany({
      where: { userId: user.id, recurring: true, date: { gte: start, lte: end } },
      select: { category: true },
    }),
  ]);
  const existingIncomeKeys = new Set(existingThisMonth[0].map((i) => `${i.category}|${i.source}`));
  const existingExpenseKeys = new Set(existingThisMonth[1].map((e) => e.category));

  const created: { incomes: number; expenses: number } = { incomes: 0, expenses: 0 };

  for (const [key, tmpl] of incomeTemplates) {
    if (existingIncomeKeys.has(key)) continue;
    // Use the original day-of-month, clamped to current month
    const origDay = new Date(tmpl.date).getDate();
    const day = Math.min(origDay, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
    const newDate = new Date(today.getFullYear(), today.getMonth(), day);
    await db.income.create({
      data: {
        userId: user.id,
        amount: tmpl.amount,
        source: tmpl.source,
        category: tmpl.category,
        date: newDate,
        note: tmpl.note,
        recurring: true,
      },
    });
    created.incomes++;
  }

  for (const [key, tmpl] of expenseTemplates) {
    if (existingExpenseKeys.has(key)) continue;
    const origDay = new Date(tmpl.date).getDate();
    const day = Math.min(origDay, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
    const newDate = new Date(today.getFullYear(), today.getMonth(), day);
    await db.expense.create({
      data: {
        userId: user.id,
        amount: tmpl.amount,
        category: tmpl.category,
        date: newDate,
        note: tmpl.note,
        paymentMethod: tmpl.paymentMethod,
        recurring: true,
      },
    });
    created.expenses++;
  }

  return NextResponse.json({ success: true, created, month: monthKey });
}
