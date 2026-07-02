import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getUserFinancialData, getCurrentMonthKey, getMonthsAgo } from "@/lib/finance";

// Goals Timeline Projection: predicts when each goal will be reached
// based on current savings rate and contribution patterns
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await db.savingsGoal.findMany({ where: { userId: user.id } });
  if (goals.length === 0) {
    return NextResponse.json({ projections: [], summary: "No savings goals set yet." });
  }

  // Get average monthly savings over last 3 months
  const monthKey = getCurrentMonthKey();
  const [curr, prev1, prev2] = await Promise.all([
    getUserFinancialData(user.id, monthKey),
    getUserFinancialData(user.id, getMonthsAgo(1)),
    getUserFinancialData(user.id, getMonthsAgo(2)),
  ]);
  const monthlySavings = [curr.remainingBalance, prev1.remainingBalance, prev2.remainingBalance].filter((v) => v > 0);
  const avgMonthlySavings = monthlySavings.length > 0
    ? monthlySavings.reduce((s, v) => s + v, 0) / monthlySavings.length
    : 0;

  // Get recent goal contribution rate (avg monthly contributions per goal over last 3 months)
  // For simplicity, assume each goal gets an equal share of monthly savings
  const goalsCount = goals.length;
  const perGoalMonthly = goalsCount > 0 ? avgMonthlySavings / goalsCount : 0;

  const projections = goals.map((g) => {
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    const monthsToComplete = perGoalMonthly > 0 ? Math.ceil(remaining / perGoalMonthly) : Infinity;
    const projectedDate = monthsToComplete !== Infinity
      ? new Date(Date.now() + monthsToComplete * 30 * 24 * 60 * 60 * 1000)
      : null;
    const progress = Math.min(100, (g.currentAmount / g.targetAmount) * 100);

    // Status assessment
    let status: "on-track" | "behind" | "at-risk" | "completed" = "on-track";
    if (progress >= 100) status = "completed";
    else if (perGoalMonthly <= 0) status = "at-risk";
    else if (g.deadline) {
      const deadlineDate = new Date(g.deadline);
      const monthsToDeadline = Math.ceil((deadlineDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000));
      if (monthsToComplete > monthsToDeadline) status = "behind";
      else if (monthsToComplete > monthsToDeadline * 0.8) status = "at-risk";
    }

    return {
      id: g.id,
      title: g.title,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      remaining,
      progress,
      monthlyContribution: Math.round(perGoalMonthly),
      monthsToComplete: monthsToComplete === Infinity ? null : monthsToComplete,
      projectedDate: projectedDate?.toISOString() || null,
      deadline: g.deadline,
      priority: g.priority,
      status,
    };
  });

  const summary = avgMonthlySavings > 0
    ? `Based on your 3-month average savings of ₹${Math.round(avgMonthlySavings).toLocaleString("en-IN")}/month, each of your ${goalsCount} goal${goalsCount > 1 ? "s" : ""} receives ~₹${Math.round(perGoalMonthly).toLocaleString("en-IN")}/month. ${projections.filter((p) => p.status === "on-track").length} on track, ${projections.filter((p) => p.status === "behind").length} behind schedule.`
    : "Add income and expense data to enable goal timeline projections.";

  return NextResponse.json({
    projections: projections.sort((a, b) => (a.monthsToComplete || 999) - (b.monthsToComplete || 999)),
    summary,
    avgMonthlySavings: Math.round(avgMonthlySavings),
    perGoalMonthly: Math.round(perGoalMonthly),
  });
}
