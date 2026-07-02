import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey, getMonthRange } from "@/lib/finance";

// AI Spending Anomaly Detection: flags unusual transactions using statistical analysis
// Detects: unusually high amounts, frequency spikes, unusual categories, odd timing
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const { start, end } = getMonthRange(monthKey);

  // Get current month expenses + last 3 months for baseline
  const prev1Start = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const prev2Start = new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);
  const prev3Start = new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1);

  const [currentExpenses, prev1, prev2, prev3] = await Promise.all([
    db.expense.findMany({
      where: { userId: user.id, date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    }),
    db.expense.findMany({
      where: { userId: user.id, date: { gte: prev1Start, lt: start } },
    }),
    db.expense.findMany({
      where: { userId: user.id, date: { gte: prev2Start, lt: prev1Start } },
    }),
    db.expense.findMany({
      where: { userId: user.id, date: { gte: prev3Start, lt: prev2Start } },
    }),
  ]);

  // Build baseline stats per category
  const baseline: Record<string, { amounts: number[]; count: number; avg: number; std: number }> = {};
  for (const e of [...prev1, ...prev2, ...prev3]) {
    if (!baseline[e.category]) baseline[e.category] = { amounts: [], count: 0, avg: 0, std: 0 };
    baseline[e.category].amounts.push(e.amount);
    baseline[e.category].count++;
  }

  // Calculate mean and standard deviation per category
  for (const cat of Object.keys(baseline)) {
    const amounts = baseline[cat].amounts;
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    baseline[cat].avg = mean;
    baseline[cat].std = Math.sqrt(variance);
  }

  // Detect anomalies in current month
  const anomalies: {
    type: "high_amount" | "frequency_spike" | "new_category" | "unusual_timing";
    severity: "warning" | "danger" | "info";
    transaction: any;
    reason: string;
    expectedAmount?: number;
    actualAmount: number;
  }[] = [];

  // 1. High amount anomalies (amount > avg + 2*std)
  for (const e of currentExpenses) {
    const b = baseline[e.category];
    if (b && b.count >= 3) {
      const threshold = b.avg + 2 * b.std;
      if (e.amount > threshold && e.amount > b.avg * 1.5) {
        anomalies.push({
          type: "high_amount",
          severity: e.amount > b.avg * 3 ? "danger" : "warning",
          transaction: e,
          reason: `Amount ${e.amount.toLocaleString("en-IN")} is ${Math.round((e.amount / b.avg - 1) * 100)}% higher than your average (${Math.round(b.avg).toLocaleString("en-IN")}) for ${e.category}.`,
          expectedAmount: Math.round(b.avg),
          actualAmount: e.amount,
        });
      }
    }
  }

  // 2. New category (category not seen in previous 3 months)
  const prevCategories = new Set([...prev1, ...prev2, ...prev3].map((e) => e.category));
  const currentCategories = new Set(currentExpenses.map((e) => e.category));
  for (const cat of currentCategories) {
    if (!prevCategories.has(cat)) {
      const catExpenses = currentExpenses.filter((e) => e.category === cat);
      const total = catExpenses.reduce((s, e) => s + e.amount, 0);
      if (total > 1000) {
        anomalies.push({
          type: "new_category",
          severity: "info",
          transaction: catExpenses[0],
          reason: `New spending category "${cat}" detected: ${catExpenses.length} transactions totaling ${total.toLocaleString("en-IN")} this month.`,
          actualAmount: total,
        });
      }
    }
  }

  // 3. Frequency spike (more transactions in a category than usual)
  const currentByCategory: Record<string, number> = {};
  for (const e of currentExpenses) currentByCategory[e.category] = (currentByCategory[e.category] || 0) + 1;

  for (const [cat, count] of Object.entries(currentByCategory)) {
    const b = baseline[cat];
    if (b && b.count >= 3) {
      const avgMonthlyCount = b.count / 3;
      if (count > avgMonthlyCount * 2 && count >= 5) {
        anomalies.push({
          type: "frequency_spike",
          severity: "warning",
          transaction: currentExpenses.find((e) => e.category === cat),
          reason: `${count} transactions in "${cat}" this month — ${Math.round((count / avgMonthlyCount - 1) * 100)}% more than your average (${avgMonthlyCount.toFixed(1)}/month).`,
          actualAmount: currentExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
        });
      }
    }
  }

  // 4. Unusual timing (late-night spending: 11pm-5am)
  for (const e of currentExpenses) {
    const hour = new Date(e.date).getHours();
    if ((hour >= 23 || hour < 5) && e.amount > 500) {
      anomalies.push({
        type: "unusual_timing",
        severity: "info",
        transaction: e,
        reason: `Late-night purchase (${hour}:00) of ${e.amount.toLocaleString("en-IN")} on ${e.category}. Late-night spending often indicates impulse buying.`,
        actualAmount: e.amount,
      });
    }
  }

  // Sort by severity (danger first) then by amount
  const severityOrder = { danger: 0, warning: 1, info: 2 };
  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.actualAmount - a.actualAmount);

  // Summary
  const dangerCount = anomalies.filter((a) => a.severity === "danger").length;
  const warningCount = anomalies.filter((a) => a.severity === "warning").length;
  const totalAnomalyAmount = anomalies.reduce((s, a) => s + a.actualAmount, 0);

  const summary = anomalies.length === 0
    ? "No spending anomalies detected this month. Your spending patterns look consistent with previous months."
    : `${anomalies.length} anomal${anomalies.length > 1 ? "ies" : "y"} detected: ${dangerCount} critical, ${warningCount} warnings. Total flagged: ${totalAnomalyAmount.toLocaleString("en-IN")}.`;

  return NextResponse.json({
    anomalies: anomalies.slice(0, 15),
    summary,
    stats: {
      total: anomalies.length,
      danger: dangerCount,
      warning: warningCount,
      info: anomalies.filter((a) => a.severity === "info").length,
      totalAmount: totalAnomalyAmount,
    },
    baselineCategories: Object.keys(baseline).length,
  });
}
