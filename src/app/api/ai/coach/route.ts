import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserFinancialData, getCurrentMonthKey, getMonthsAgo, detectOverspending } from "@/lib/finance";
import { db } from "@/lib/db";

// Proactive AI coach tips - rule-based with smart pattern detection
// Returns 3-5 actionable coaching tips based on the user's actual financial patterns
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const data = await getUserFinancialData(user.id, monthKey);
  const prevData = await getUserFinancialData(user.id, getMonthsAgo(1));
  const prevPrevData = await getUserFinancialData(user.id, getMonthsAgo(2));

  const tips: { id: string; type: "success" | "warning" | "info" | "danger"; icon: string; title: string; description: string; action?: string }[] = [];

  // 1. Savings rate analysis
  if (data.totalIncome > 0) {
    if (data.savingsRate >= 30) {
      tips.push({
        id: "savings-excellent",
        type: "success",
        icon: "🎉",
        title: "Outstanding savings rate!",
        description: `You're saving ${data.savingsRate.toFixed(1)}% of your income — well above the 20% benchmark. Consider funneling the surplus into an investment or your top goal.`,
        action: "Move surplus to goals",
      });
    } else if (data.savingsRate >= 20) {
      tips.push({
        id: "savings-good",
        type: "success",
        icon: "✅",
        title: "Healthy savings rate",
        description: `At ${data.savingsRate.toFixed(1)}%, you're meeting the recommended 20% savings target. Keep it up!`,
      });
    } else if (data.savingsRate >= 0) {
      tips.push({
        id: "savings-low",
        type: "warning",
        icon: "⚠️",
        title: "Savings rate below target",
        description: `Your savings rate is ${data.savingsRate.toFixed(1)}%. Aim for 20%+ by trimming ${data.totalExpense > 0 ? `your top category (${Object.entries(data.categorySpending).sort((a, b) => b[1] - a[1])[0]?.[0] || "spending"})` : "discretionary spending"}.`,
        action: "Review expenses",
      });
    } else {
      tips.push({
        id: "savings-negative",
        type: "danger",
        icon: "🚨",
        title: "Spending exceeds income",
        description: `You're spending ${Math.abs(data.savingsRate).toFixed(1)}% more than you earn. Immediate action needed: cut non-essential expenses this month.`,
        action: "Open AI Advisor",
      });
    }
  }

  // 2. Budget discipline
  if (data.monthlyBudget > 0 && data.totalExpense > 0) {
    const budgetUsed = (data.totalExpense / data.monthlyBudget) * 100;
    if (budgetUsed > 100) {
      tips.push({
        id: "budget-exceeded",
        type: "danger",
        icon: "📊",
        title: "Monthly budget exceeded",
        description: `You've used ${budgetUsed.toFixed(0)}% of your budget. ${data.budgets.filter((b) => {
          const spent = data.categorySpending[b.category] || 0;
          return spent > b.amount;
        }).length} categories are over their limit.`,
        action: "View budgets",
      });
    } else if (budgetUsed > 80) {
      tips.push({
        id: "budget-warning",
        type: "warning",
        icon: "⏰",
        title: "Approaching budget limit",
        description: `You've used ${budgetUsed.toFixed(0)}% of your monthly budget. ${Math.round(((100 - budgetUsed) / 100) * data.monthlyBudget).toLocaleString("en-IN")} left to spend.`,
      });
    } else if (budgetUsed < 50 && data.totalExpense > 0) {
      tips.push({
        id: "budget-good",
        type: "success",
        icon: "💰",
        title: "Well under budget",
        description: `Only ${budgetUsed.toFixed(0)}% of budget used. You're on track to save ${formatINR(data.monthlyBudget - data.totalExpense)} below your cap.`,
      });
    }
  }

  // 3. Trend comparison vs last month
  if (prevData.totalExpense > 0 && data.totalExpense > 0) {
    const change = ((data.totalExpense - prevData.totalExpense) / prevData.totalExpense) * 100;
    if (change > 20) {
      tips.push({
        id: "spending-increased",
        type: "warning",
        icon: "📈",
        title: `Spending up ${change.toFixed(0)}% vs last month`,
        description: `You've spent ${formatINR(data.totalExpense - prevData.totalExpense)} more than ${getMonthsAgo(1)}. Top increase: ${findTopIncrease(data.categorySpending, prevData.categorySpending)}.`,
        action: "View insights",
      });
    } else if (change < -15) {
      tips.push({
        id: "spending-decreased",
        type: "success",
        icon: "📉",
        title: `Spending down ${Math.abs(change).toFixed(0)}% vs last month`,
        description: `Great discipline! You saved ${formatINR(prevData.totalExpense - data.totalExpense)} compared to last month.`,
      });
    }
  }

  // 4. 3-month trend (accelerating spending?)
  if (prevPrevData.totalExpense > 0 && prevData.totalExpense > 0 && data.totalExpense > 0) {
    const trend = data.totalExpense - prevData.totalExpense;
    const prevTrend = prevData.totalExpense - prevPrevData.totalExpense;
    if (trend > 0 && prevTrend > 0 && trend > prevTrend) {
      tips.push({
        id: "trend-accelerating",
        type: "danger",
        icon: "⚠️",
        title: "Spending is accelerating",
        description: `Your expenses have risen for 2 consecutive months. This trend, if continued, will strain your finances. Consider a spending freeze on discretionary categories.`,
      });
    }
  }

  // 5. Goal progress nudge
  if (data.goals.length > 0) {
    const stalledGoals = data.goals.filter((g) => {
      const progress = g.currentAmount / g.targetAmount;
      return progress > 0 && progress < 0.5 && g.deadline && new Date(g.deadline).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60;
    });
    if (stalledGoals.length > 0) {
      tips.push({
        id: "goal-stalled",
        type: "warning",
        icon: "🎯",
        title: `${stalledGoals.length} goal${stalledGoals.length > 1 ? "s" : ""} need attention`,
        description: `"${stalledGoals[0].title}" is ${Math.round((stalledGoals[0].currentAmount / stalledGoals[0].targetAmount) * 100)}% complete with deadline approaching. Add funds to stay on track.`,
        action: "View goals",
      });
    }
    const completedGoals = data.goals.filter((g) => g.currentAmount >= g.targetAmount);
    if (completedGoals.length > 0) {
      tips.push({
        id: "goal-completed",
        type: "success",
        icon: "🏆",
        title: "Goal achieved!",
        description: `You've reached "${completedGoals[0].title}". Time to set a new target or redirect those savings.`,
      });
    }
  }

  // 6. No-spend day streak
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayExpense = data.expenses.filter((e) => {
      const ed = new Date(e.date);
      return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth() && ed.getDate() === d.getDate();
    }).reduce((s, e) => s + e.amount, 0);
    if (dayExpense === 0 && i > 0) streak++;
    else if (dayExpense > 0 && i > 0) break;
  }
  if (streak >= 3) {
    tips.push({
      id: "no-spend-streak",
      type: "success",
      icon: "🔥",
      title: `${streak}-day no-spend streak!`,
      description: `You haven't spent anything in ${streak} days. That's discipline! Keep the momentum going.`,
    });
  }

  // 7. Emergency fund check
  if (data.totalExpense > 0 && data.totalIncome > 0) {
    const monthlyExpenses = data.totalExpense;
    const emergencyTarget = monthlyExpenses * 3;
    const currentSavings = Math.max(0, data.totalIncome - data.totalExpense);
    if (currentSavings < emergencyTarget * 0.5) {
      tips.push({
        id: "emergency-fund",
        type: "warning",
        icon: "🛡️",
        title: "Build your emergency fund",
        description: `Aim for 3 months of expenses (${formatINR(emergencyTarget)}) in an emergency fund. You're currently at ${formatINR(currentSavings)} — ${Math.round((currentSavings / emergencyTarget) * 100)}% of target.`,
        action: "Create emergency fund goal",
      });
    }
  }

  // Sort by severity priority and limit to 5
  const priority = { danger: 0, warning: 1, info: 2, success: 3 };
  tips.sort((a, b) => priority[a.type] - priority[b.type]);
  return NextResponse.json({ tips: tips.slice(0, 5) });
}

function findTopIncrease(curr: Record<string, number>, prev: Record<string, number>): string {
  let topCat = "";
  let topIncrease = 0;
  for (const [cat, amt] of Object.entries(curr)) {
    const inc = amt - (prev[cat] || 0);
    if (inc > topIncrease) { topIncrease = inc; topCat = cat; }
  }
  return topCat || "various categories";
}

function formatINR(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(amount))}`;
}
