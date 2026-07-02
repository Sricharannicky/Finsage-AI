import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  predictNextMonthExpense,
  predictExpectedSavings,
  predictFutureBalance,
  predictCategoryExpenses,
} from "@/lib/prediction";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [expense, savings, balance, categories] = await Promise.all([
    predictNextMonthExpense(user.id),
    predictExpectedSavings(user.id),
    predictFutureBalance(user.id),
    predictCategoryExpenses(user.id, 4),
  ]);

  return NextResponse.json({
    nextExpense: expense,
    expectedSavings: savings,
    futureBalance: balance,
    categoryPredictions: categories,
  });
}
