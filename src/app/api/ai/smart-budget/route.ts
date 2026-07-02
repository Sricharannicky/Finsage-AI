import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getUserFinancialData, getCurrentMonthKey, getMonthsAgo } from "@/lib/finance";

// Smart Budget AI: analyzes spending patterns and suggests dynamic budget reallocation
// Identifies overspending categories, underspending categories, and recommends reallocation
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const [curr, prev1, prev2] = await Promise.all([
    getUserFinancialData(user.id, monthKey),
    getUserFinancialData(user.id, getMonthsAgo(1)),
    getUserFinancialData(user.id, getMonthsAgo(2)),
  ]);

  // 3-month average spending per category
  const avgSpending: Record<string, { total: number; count: number; trend: number }> = {};
  const allCats = new Set([
    ...Object.keys(curr.categorySpending),
    ...Object.keys(prev1.categorySpending),
    ...Object.keys(prev2.categorySpending),
  ]);

  for (const cat of allCats) {
    const c = curr.categorySpending[cat] || 0;
    const p1 = prev1.categorySpending[cat] || 0;
    const p2 = prev2.categorySpending[cat] || 0;
    const total = c + p1 + p2;
    const count = (c > 0 ? 1 : 0) + (p1 > 0 ? 1 : 0) + (p2 > 0 ? 1 : 0);
    avgSpending[cat] = {
      total,
      count,
      trend: p1 > 0 ? ((c - p1) / p1) * 100 : 0,
    };
  }

  // Current budgets
  const budgets = curr.budgets;
  const budgetMap: Record<string, number> = {};
  for (const b of budgets) budgetMap[b.category] = b.amount;

  // Analyze each budgeted category
  const analysis = budgets.map((b) => {
    const spent = curr.categorySpending[b.category] || 0;
    const avg = avgSpending[b.category];
    const avgMonthly = avg && avg.count > 0 ? avg.total / avg.count : 0;
    const utilization = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const avgUtilization = b.amount > 0 && avgMonthly > 0 ? (avgMonthly / b.amount) * 100 : 0;
    const remaining = b.amount - spent;

    let status: "under" | "on-track" | "over" | "critical" = "on-track";
    if (utilization > 120) status = "critical";
    else if (utilization > 100) status = "over";
    else if (utilization < 50 && spent > 0) status = "under";

    // Recommended budget: max of avg monthly spending × 1.1 (10% buffer) and current spent
    const recommended = Math.max(avgMonthly * 1.1, spent, b.amount * 0.8);
    const difference = recommended - b.amount;

    return {
      category: b.category,
      currentBudget: b.amount,
      spent,
      remaining,
      utilization: Math.round(utilization),
      avgMonthly: Math.round(avgMonthly),
      trend: Math.round(avg?.trend || 0),
      status,
      recommendedBudget: Math.round(recommended),
      difference: Math.round(difference),
      action: difference > 0 ? "increase" : difference < -b.amount * 0.1 ? "decrease" : "maintain",
    };
  });

  // Identify reallocation opportunities
  // Categories with surplus (under budget) can fund categories with deficit (over budget)
  const surplus = analysis.filter((a) => a.remaining > 0 && a.status === "under");
  const deficit = analysis.filter((a) => a.status === "over" || a.status === "critical");

  const reallocations: { from: string; to: string; amount: number; reason: string }[] = [];
  for (const d of deficit.slice(0, 3)) {
    const needed = Math.abs(d.remaining);
    // Find best surplus category to reallocate from
    const bestSurplus = surplus
      .filter((s) => s.remaining > needed * 0.3)
      .sort((a, b) => b.remaining - a.remaining)[0];
    if (bestSurplus) {
      const amount = Math.min(needed, bestSurplus.remaining * 0.7);
      reallocations.push({
        from: bestSurplus.category,
        to: d.category,
        amount: Math.round(amount),
        reason: `${d.category} is ${d.utilization}% utilized while ${bestSurplus.category} has ${bestSurplus.utilization}% utilization. Reallocate to avoid overspending.`,
      });
    }
  }

  // Categories without budgets that have significant spending
  const unbudgeted = Object.entries(curr.categorySpending)
    .filter(([cat]) => !budgetMap[cat])
    .map(([cat, amt]) => ({ category: cat, amount: amt, avgMonthly: avgSpending[cat] ? avgSpending[cat].total / avgSpending[cat].count : amt }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Summary
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (curr.categorySpending[b.category] || 0), 0);
  const overCount = analysis.filter((a) => a.status === "over" || a.status === "critical").length;
  const underCount = analysis.filter((a) => a.status === "under").length;

  const summary = overCount > 0
    ? `${overCount} categor${overCount > 1 ? "ies are" : "y is"} over budget and ${underCount} ${underCount > 1 ? "have" : "has"} surplus. ${reallocations.length} reallocation${reallocations.length > 1 ? "s" : ""} available to optimize your spending.`
    : "Your budgets are well-balanced this month. Consider setting budgets for unbudgeted categories with significant spending.";

  return NextResponse.json({
    summary,
    analysis: analysis.sort((a, b) => b.utilization - a.utilization),
    reallocations,
    unbudgeted,
    stats: {
      totalBudget,
      totalSpent,
      overCount,
      underCount,
      onTrackCount: analysis.filter((a) => a.status === "on-track").length,
      potentialSavings: reallocations.reduce((s, r) => s + r.amount, 0),
    },
  });
}
