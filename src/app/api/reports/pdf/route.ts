import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  getUserFinancialData,
  getCurrentMonthKey,
  calculateHealthScore,
  buildCategoryBreakdown,
  buildIncomeExpenseTrend,
} from "@/lib/finance";
import { spawn } from "child_process";
import { writeFile } from "fs/promises";
import { join } from "path";

// Generate a professional PDF financial report via ReportLab (Python subprocess)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || getCurrentMonthKey();

  // Gather all data for the report
  const data = await getUserFinancialData(user.id, month);
  const health = calculateHealthScore({
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    monthlyBudget: data.monthlyBudget,
    savingsRate: data.savingsRate,
    goals: data.goals.map((g) => ({ targetAmount: g.targetAmount, currentAmount: g.currentAmount })),
    categorySpending: data.categorySpending,
  });
  const trend = await buildIncomeExpenseTrend(user.id, 6);
  const categoryBreakdown = buildCategoryBreakdown(data.categorySpending);

  // Count transactions per category
  const catCounts: Record<string, number> = {};
  for (const e of data.expenses) catCounts[e.category] = (catCounts[e.category] || 0) + 1;

  const recent = [
    ...data.expenses.slice(0, 10).map((e) => ({
      type: "Expense" as const, amount: e.amount, category: e.category,
      date: new Date(e.date).toLocaleDateString("en-IN"), note: e.note,
    })),
    ...data.incomes.slice(0, 5).map((i) => ({
      type: "Income" as const, amount: i.amount, category: i.category,
      date: new Date(i.date).toLocaleDateString("en-IN"), note: i.note || i.source,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const monthLabel = new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Build payload for the Python script
  const payload = {
    user: { name: user.name, email: user.email },
    month,
    monthLabel,
    generatedDate: new Date().toLocaleDateString("en-IN"),
    financial: {
      totalIncome: data.totalIncome,
      totalExpense: data.totalExpense,
      monthlyBudget: data.monthlyBudget,
      savingsRate: data.savingsRate,
    },
    health: {
      score: health.score,
      grade: health.grade,
      breakdown: health.breakdown,
      recommendations: health.recommendations,
    },
    trend: trend.map((t) => ({ month: t.month, income: t.income, expense: t.expense })),
    categories: categoryBreakdown.map((c) => ({ category: c.category, amount: c.amount, count: catCounts[c.category] || 0 })),
    goals: data.goals.map((g) => ({
      title: g.title, targetAmount: g.targetAmount, currentAmount: g.currentAmount, priority: g.priority,
    })),
    recent,
  };

  // Spawn the Python script
  const scriptPath = join(process.cwd(), "scripts", "generate-report-pdf.py");
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const py = spawn("python3", [scriptPath], { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    py.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    py.stderr.on("data", (chunk) => errChunks.push(Buffer.from(chunk)));
    py.on("error", (err) => reject(new Error(`Failed to spawn python: ${err.message}`)));
    py.on("close", (code) => {
      if (code !== 0) {
        const errMsg = Buffer.concat(errChunks).toString();
        reject(new Error(`Python script failed (exit ${code}): ${errMsg}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  });

  return new NextResponse(pdfBuffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="finsage-report-${month}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
