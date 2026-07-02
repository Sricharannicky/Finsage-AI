import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// CSV Import endpoint
// Accepts: { rows: [{date, type, category, amount, note?, paymentMethod?, source?}] }
// type: "income" | "expense"
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { rows } = body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const incomeRows: any[] = [];
  const expenseRows: any[] = [];
  const errors: { row: number; error: string }[] = [];

  rows.forEach((r: any, i: number) => {
    try {
      const type = (r.type || "").toLowerCase();
      const amount = parseFloat(r.amount);
      const dateStr = r.date;
      const category = (r.category || "").trim();
      const note = r.note ? String(r.note).trim() : null;

      if (!type || !["income", "expense"].includes(type)) {
        throw new Error(`Invalid type "${r.type}" (must be income or expense)`);
      }
      if (!amount || amount <= 0 || isNaN(amount)) {
        throw new Error(`Invalid amount "${r.amount}"`);
      }
      if (!dateStr) {
        throw new Error("Missing date");
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date "${dateStr}"`);
      }
      if (!category) {
        throw new Error("Missing category");
      }

      if (type === "income") {
        incomeRows.push({
          userId: user.id,
          amount,
          source: r.source || category,
          category,
          date,
          note,
          recurring: false,
        });
      } else {
        expenseRows.push({
          userId: user.id,
          amount,
          category,
          date,
          note,
          paymentMethod: r.paymentMethod || "Cash",
          recurring: false,
        });
      }
    } catch (e: any) {
      errors.push({ row: i + 1, error: e.message });
    }
  });

  let imported = { income: 0, expense: 0 };
  if (incomeRows.length > 0) {
    await db.income.createMany({ data: incomeRows });
    imported.income = incomeRows.length;
  }
  if (expenseRows.length > 0) {
    await db.expense.createMany({ data: expenseRows });
    imported.expense = expenseRows.length;
  }

  return NextResponse.json({
    success: true,
    imported,
    errors,
    totalProcessed: rows.length,
  });
}
