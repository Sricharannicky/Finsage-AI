import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey, getMonthRange } from "@/lib/finance";

// Debt Payoff Planner: analyzes EMI/debt expenses and calculates
// snowball (smallest balance first) vs avalanche (highest interest first) strategies
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const { start, end } = getMonthRange(monthKey);

  // Get EMI expenses (recurring debt payments)
  const emiExpenses = await db.expense.findMany({
    where: {
      userId: user.id,
      category: "EMI",
      date: { gte: start, lte: end },
    },
    orderBy: { amount: "desc" },
  });

  // Deduplicate by note (each EMI is a different loan)
  const debtMap = new Map<string, { name: string; monthlyPayment: number; count: number }>();
  for (const e of emiExpenses) {
    const key = e.note || `EMI ${e.amount}`;
    if (!debtMap.has(key)) {
      debtMap.set(key, { name: e.note || `EMI ${e.amount}`, monthlyPayment: e.amount, count: 1 });
    }
  }

  // If no EMI expenses, check for any debt-like categories
  if (debtMap.size === 0) {
    // Look for recurring expenses that might be debt (Insurance, EMI, etc.)
    const allRecurring = await db.expense.findMany({
      where: { userId: user.id, recurring: true, category: { in: ["EMI", "Insurance"] } },
      orderBy: { amount: "desc" },
    });
    for (const e of allRecurring) {
      const key = e.note || e.category;
      if (!debtMap.has(key)) {
        debtMap.set(key, { name: e.note || e.category, monthlyPayment: e.amount, count: 1 });
      }
    }
  }

  if (debtMap.size === 0) {
    return NextResponse.json({
      summary: "No debt payments detected. You're debt-free! 🎉 Consider investing your surplus savings.",
      debts: [],
      strategies: null,
      hasDebt: false,
    });
  }

  // Build debt list with estimated balances (assume 5-year term if unknown)
  // In a real app, users would input principal, rate, and term per loan
  const debts = Array.from(debtMap.values()).map((d, i) => {
    // Estimate: assume 5-year (60 month) term, 12% annual interest
    const estimatedPrincipal = d.monthlyPayment * 50; // rough estimate
    const interestRate = 0.12; // 12% annual
    const remainingMonths = 60; // assume 5 years remaining
    const remainingBalance = d.monthlyPayment * remainingMonths * 0.85; // slightly less than total
    return {
      id: `debt-${i}`,
      name: d.name,
      monthlyPayment: d.monthlyPayment,
      balance: Math.round(remainingBalance),
      interestRate: interestRate * 100, // as percentage
      estimatedMonths: remainingMonths,
    };
  });

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMonthly = debts.reduce((s, d) => s + d.monthlyPayment, 0);

  // Snowball strategy: pay minimum on all, extra to smallest balance first
  const snowball = calculatePayoff([...debts].sort((a, b) => a.balance - b.balance), totalMonthly);

  // Avalanche strategy: pay minimum on all, extra to highest interest first
  const avalanche = calculatePayoff([...debts].sort((a, b) => b.interestRate - a.interestRate), totalMonthly);

  // Extra payment scenario: add ₹2000/month extra
  const snowballExtra = calculatePayoff([...debts].sort((a, b) => a.balance - b.balance), totalMonthly + 2000);
  const avalancheExtra = calculatePayoff([...debts].sort((a, b) => b.interestRate - a.interestRate), totalMonthly + 2000);

  const summary = `You have ${debts.length} debt${debts.length > 1 ? "s" : ""} totaling ₹${totalDebt.toLocaleString("en-IN")} with ₹${totalMonthly.toLocaleString("en-IN")}/month in payments. The avalanche method saves you ₹${Math.round(snowball.totalInterest - avalanche.totalInterest).toLocaleString("en-IN")} in interest and ${snowball.months - avalanche.months} months compared to snowball. Adding ₹2,000/month extra could save ${avalanche.months - avalancheExtra.months} more months.`;

  return NextResponse.json({
    summary,
    hasDebt: true,
    debts,
    totalDebt,
    totalMonthly,
    strategies: {
      snowball: { ...snowball, extraPayment: 0 },
      avalanche: { ...avalanche, extraPayment: 0 },
      snowballExtra: { ...snowballExtra, extraPayment: 2000 },
      avalancheExtra: { ...avalancheExtra, extraPayment: 2000 },
    },
  });
}

function calculatePayoff(sortedDebts: any[], monthlyBudget: number): {
  months: number;
  totalInterest: number;
  totalPaid: number;
  timeline: { month: number; debtPaid: number; remainingDebt: number; label: string }[];
} {
  const debts = sortedDebts.map((d) => ({ ...d, currentBalance: d.balance }));
  const minPayments = debts.reduce((s, d) => s + d.monthlyPayment, 0);
  const extra = Math.max(0, monthlyBudget - minPayments);
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const timeline: { month: number; debtPaid: number; remainingDebt: number; label: string }[] = [];
  const maxMonths = 600; // 50 years safety limit

  while (debts.some((d) => d.currentBalance > 0) && month < maxMonths) {
    month++;
    let remainingExtra = extra;

    // Pay minimum on all debts
    for (const d of debts) {
      if (d.currentBalance <= 0) continue;
      const payment = Math.min(d.monthlyPayment, d.currentBalance);
      const interest = d.currentBalance * (d.interestRate / 100 / 12);
      totalInterest += interest;
      d.currentBalance = d.currentBalance + interest - payment;
      totalPaid += payment;
    }

    // Apply extra to first non-paid debt
    for (const d of debts) {
      if (d.currentBalance <= 0) continue;
      if (remainingExtra <= 0) break;
      const extraPayment = Math.min(remainingExtra, d.currentBalance);
      d.currentBalance -= extraPayment;
      totalPaid += extraPayment;
      remainingExtra -= extraPayment;
    }

    // Record timeline every 6 months or when a debt is cleared
    const remainingDebt = debts.reduce((s, d) => s + Math.max(0, d.currentBalance), 0);
    if (month % 6 === 0 || remainingDebt === 0 || month <= 3) {
      timeline.push({
        month,
        debtPaid: Math.round(totalPaid),
        remainingDebt: Math.round(Math.max(0, remainingDebt)),
        label: month <= 12 ? `M${month}` : `M${month}`,
      });
    }
  }

  return { months: month, totalInterest: Math.round(totalInterest), totalPaid: Math.round(totalPaid), timeline };
}
