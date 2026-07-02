import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  getUserFinancialData,
  getCurrentMonthKey,
  getMonthsAgo,
  detectOverspending,
} from "@/lib/finance";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ notifications });
}

// Auto-generate notifications based on current state
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const data = await getUserFinancialData(user.id, monthKey);
  const prevData = await getUserFinancialData(user.id, getMonthsAgo(1));

  const alerts = detectOverspending(
    data.expenses.map((e) => ({ category: e.category, amount: e.amount, date: new Date(e.date), note: e.note })),
    prevData.categorySpending,
    data.budgets.map((b) => ({ category: b.category, amount: b.amount }))
  );

  const created: any[] = [];
  const today = new Date();
  // Avoid duplicate notifications for today
  const existingToday = await db.notification.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) },
    },
    select: { title: true },
  });
  const existingTitles = new Set(existingToday.map((n) => n.title));

  for (const alert of alerts) {
    if (existingTitles.has(alert.title)) continue;
    const n = await db.notification.create({
      data: {
        userId: user.id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
      },
    });
    created.push(n);
  }

  // Savings reminder if savings rate low
  if (data.savingsRate < 10 && data.totalIncome > 0 && !existingTitles.has("Low savings rate")) {
    const n = await db.notification.create({
      data: {
        userId: user.id,
        type: "savings_reminder",
        title: "Low savings rate",
        message: `You're saving only ${data.savingsRate.toFixed(1)}% of income. Aim for at least 20%.`,
        severity: "warning",
      },
    });
    created.push(n);
  }

  return NextResponse.json({ created, total: created.length });
}
