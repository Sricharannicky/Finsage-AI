import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey, getMonthRange } from "@/lib/finance";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "expenses"; // expenses | income | all
  const month = searchParams.get("month") || getCurrentMonthKey();
  const { start, end } = getMonthRange(month);

  const rows: string[] = [];
  rows.push("Date,Type,Category,Amount,PaymentMethod,Note");

  if (type === "expenses" || type === "all") {
    const expenses = await db.expense.findMany({
      where: { userId: user.id, date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    });
    for (const e of expenses) {
      rows.push([
        new Date(e.date).toISOString().split("T")[0],
        "Expense",
        escapeCsv(e.category),
        e.amount.toString(),
        escapeCsv(e.paymentMethod),
        escapeCsv(e.note || ""),
      ].join(","));
    }
  }

  if (type === "income" || type === "all") {
    const incomes = await db.income.findMany({
      where: { userId: user.id, date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    });
    for (const i of incomes) {
      rows.push([
        new Date(i.date).toISOString().split("T")[0],
        "Income",
        escapeCsv(i.category),
        i.amount.toString(),
        escapeCsv(i.source),
        escapeCsv(i.note || ""),
      ].join(","));
    }
  }

  const csv = rows.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-${month}.csv"`,
    },
  });
}
