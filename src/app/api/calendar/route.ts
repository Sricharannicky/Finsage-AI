import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Daily spending heatmap data for the last N months
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get("months") || "3");

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const startTs = start.getTime();

  const [expenses, incomes] = await Promise.all([
    db.expense.findMany({
      where: { userId: user.id, date: { gte: start } },
      select: { amount: true, date: true, category: true },
    }),
    db.income.findMany({
      where: { userId: user.id, date: { gte: start } },
      select: { amount: true, date: true, category: true },
    }),
  ]);

  // Build daily aggregation
  const days: Record<string, { date: string; expense: number; income: number; count: number; topCategory: string | null }> = {};
  const catByDay: Record<string, Record<string, number>> = {};

  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!days[key]) days[key] = { date: key, expense: 0, income: 0, count: 0, topCategory: null };
    days[key].expense += e.amount;
    days[key].count += 1;
    if (!catByDay[key]) catByDay[key] = {};
    catByDay[key][e.category] = (catByDay[key][e.category] || 0) + e.amount;
  }
  for (const i of incomes) {
    const d = new Date(i.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!days[key]) days[key] = { date: key, expense: 0, income: 0, count: 0, topCategory: null };
    days[key].income += i.amount;
  }
  // Compute top category per day
  for (const key of Object.keys(days)) {
    const cats = catByDay[key];
    if (cats) {
      const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
      days[key].topCategory = top ? top[0] : null;
    }
  }

  // Build complete day list (fill gaps with zero days)
  const dayList = [];
  const cursor = new Date(start);
  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    dayList.push(days[key] || { date: key, expense: 0, income: 0, count: 0, topCategory: null });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Stats
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const activeDays = dayList.filter((d) => d.count > 0).length;
  const maxExpense = Math.max(...dayList.map((d) => d.expense), 0);
  const avgPerActiveDay = activeDays > 0 ? totalExpense / activeDays : 0;
  const noSpendDays = dayList.filter((d) => d.expense === 0).length;

  // Day-of-week spending pattern
  const dowSpending = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dayList) {
    if (d.expense > 0) {
      const dow = new Date(d.date).getDay();
      dowSpending[dow] += d.expense;
      dowCounts[dow] += 1;
    }
  }
  const dowAvg = dowSpending.map((s, i) => dowCounts[i] > 0 ? s / dowCounts[i] : 0);

  return NextResponse.json({
    days: dayList,
    stats: {
      totalExpense,
      totalIncome,
      activeDays,
      noSpendDays,
      maxExpense,
      avgPerActiveDay,
      totalDays: dayList.length,
    },
    dowAvg: dowAvg.map((v, i) => ({
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
      avg: Math.round(v),
    })),
  });
}
