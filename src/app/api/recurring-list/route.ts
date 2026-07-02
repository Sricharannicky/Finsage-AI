import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Recurring Transaction Scheduler: lists all recurring income & expenses
// Allows toggling recurring status, viewing next occurrence, and managing them
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [recurringIncomes, recurringExpenses] = await Promise.all([
    db.income.findMany({
      where: { userId: user.id, recurring: true },
      orderBy: { date: "desc" },
    }),
    db.expense.findMany({
      where: { userId: user.id, recurring: true },
      orderBy: { date: "desc" },
    }),
  ]);

  // Deduplicate by category+source/note and get latest occurrence
  const incomeMap = new Map<string, any>();
  for (const i of recurringIncomes) {
    const key = `${i.category}|${i.source}`;
    if (!incomeMap.has(key)) {
      incomeMap.set(key, {
        id: i.id,
        type: "income",
        category: i.category,
        source: i.source,
        amount: i.amount,
        note: i.note,
        lastDate: i.date,
        nextDate: getNextOccurrence(i.date),
        frequency: "monthly",
      });
    }
  }

  const expenseMap = new Map<string, any>();
  for (const e of recurringExpenses) {
    const key = e.category;
    if (!expenseMap.has(key)) {
      expenseMap.set(key, {
        id: e.id,
        type: "expense",
        category: e.category,
        source: e.note || e.category,
        amount: e.amount,
        note: e.note,
        paymentMethod: e.paymentMethod,
        lastDate: e.date,
        nextDate: getNextOccurrence(e.date),
        frequency: "monthly",
      });
    }
  }

  const recurring = [
    ...Array.from(incomeMap.values()),
    ...Array.from(expenseMap.values()),
  ].sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());

  const totalMonthlyIncome = Array.from(incomeMap.values()).reduce((s, i) => s + i.amount, 0);
  const totalMonthlyExpense = Array.from(expenseMap.values()).reduce((s, e) => s + e.amount, 0);
  const netRecurring = totalMonthlyIncome - totalMonthlyExpense;

  return NextResponse.json({
    recurring,
    stats: {
      incomeCount: incomeMap.size,
      expenseCount: expenseMap.size,
      totalMonthlyIncome,
      totalMonthlyExpense,
      netRecurring,
      upcomingCount: recurring.filter((r) => {
        const days = Math.ceil((new Date(r.nextDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days <= 7 && days >= 0;
      }).length,
    },
  });
}

function getNextOccurrence(lastDate: Date): string {
  const next = new Date(lastDate);
  next.setMonth(next.getMonth() + 1);
  // If the day doesn't exist in next month, clamp to last day
  if (next.getDate() !== new Date(lastDate).getDate()) {
    next.setDate(0); // Last day of previous month
  }
  return next.toISOString();
}

// Toggle recurring status of a transaction
export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, id, recurring } = body;
  if (!type || !id) return NextResponse.json({ error: "type and id required" }, { status: 400 });

  const endpoint = type === "income" ? db.income : db.expense;
  const updated = await endpoint.update({
    where: { id, userId: user.id },
    data: { recurring },
  });

  return NextResponse.json({ success: true, transaction: updated });
}
