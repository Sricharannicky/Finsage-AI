import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getUserFinancialData, getCurrentMonthKey, getMonthsAgo } from "@/lib/finance";

// All possible achievements with their detection logic
const ACHIEVEMENTS = [
  {
    type: "first_transaction",
    title: "First Steps",
    description: "Recorded your first transaction",
    icon: "🎯",
    check: (ctx: any) => ctx.totalTxns >= 1,
    progress: (ctx: any) => Math.min(100, ctx.totalTxns * 100),
  },
  {
    type: "ten_transactions",
    title: "Getting Started",
    description: "Recorded 10 transactions",
    icon: "📝",
    check: (ctx: any) => ctx.totalTxns >= 10,
    progress: (ctx: any) => Math.min(100, (ctx.totalTxns / 10) * 100),
  },
  {
    type: "fifty_transactions",
    title: "Dedicated Tracker",
    description: "Recorded 50 transactions",
    icon: "📊",
    check: (ctx: any) => ctx.totalTxns >= 50,
    progress: (ctx: any) => Math.min(100, (ctx.totalTxns / 50) * 100),
  },
  {
    type: "budget_set",
    title: "Planner",
    description: "Set your first monthly budget",
    icon: "📋",
    check: (ctx: any) => ctx.budgetCount >= 1,
    progress: (ctx: any) => Math.min(100, ctx.budgetCount * 100),
  },
  {
    type: "goal_set",
    title: "Dreamer",
    description: "Created your first savings goal",
    icon: "🌟",
    check: (ctx: any) => ctx.goalCount >= 1,
    progress: (ctx: any) => Math.min(100, ctx.goalCount * 100),
  },
  {
    type: "goal_completed",
    title: "Goal Crusher",
    description: "Completed a savings goal",
    icon: "🏆",
    check: (ctx: any) => ctx.completedGoals >= 1,
    progress: (ctx: any) => Math.min(100, ctx.completedGoals * 100),
  },
  {
    type: "savings_20",
    title: "Savings Star",
    description: "Achieved a 20%+ savings rate in a month",
    icon: "💰",
    check: (ctx: any) => ctx.savingsRate >= 20,
    progress: (ctx: any) => Math.min(100, (ctx.savingsRate / 20) * 100),
  },
  {
    type: "savings_30",
    title: "Wealth Builder",
    description: "Achieved a 30%+ savings rate in a month",
    icon: "💎",
    check: (ctx: any) => ctx.savingsRate >= 30,
    progress: (ctx: any) => Math.min(100, (ctx.savingsRate / 30) * 100),
  },
  {
    type: "budget_master",
    title: "Budget Master",
    description: "Stayed within budget for a month",
    icon: "🧠",
    check: (ctx: any) => ctx.budgetCount > 0 && ctx.budgetUsed < 100,
    progress: (ctx: any) => Math.min(100, ctx.budgetCount > 0 ? 100 - Math.max(0, ctx.budgetUsed - 80) * 5 : 0),
  },
  {
    type: "emergency_fund",
    title: "Safety Net",
    description: "Saved 3 months of expenses",
    icon: "🛡️",
    check: (ctx: any) => ctx.emergencyRatio >= 1,
    progress: (ctx: any) => Math.min(100, ctx.emergencyRatio * 100),
  },
  {
    type: "no_spend_3",
    title: "Frugal Streak",
    description: "3 consecutive no-spend days",
    icon: "🔥",
    check: (ctx: any) => ctx.noSpendStreak >= 3,
    progress: (ctx: any) => Math.min(100, (ctx.noSpendStreak / 3) * 100),
  },
  {
    type: "ai_advisor",
    title: "Curious Mind",
    description: "Asked the AI Advisor a question",
    icon: "🤖",
    check: (ctx: any) => ctx.chatCount >= 1,
    progress: (ctx: any) => Math.min(100, ctx.chatCount * 100),
  },
  {
    type: "reduced_spending",
    title: "Trend Reverser",
    description: "Reduced spending vs the previous month",
    icon: "📉",
    check: (ctx: any) => ctx.spendingReduced,
    progress: (ctx: any) => ctx.spendingReduced ? 100 : 0,
  },
  {
    type: "diversified",
    title: "Diversified",
    description: "Tracked expenses across 8+ categories",
    icon: "🎨",
    check: (ctx: any) => ctx.categoryCount >= 8,
    progress: (ctx: any) => Math.min(100, (ctx.categoryCount / 8) * 100),
  },
];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gather context for achievement checks
  const monthKey = getCurrentMonthKey();
  const data = await getUserFinancialData(user.id, monthKey);
  const prevData = await getUserFinancialData(user.id, getMonthsAgo(1));

  const [incomeCount, expenseCount, chatCount, budgetCount] = await Promise.all([
    db.income.count({ where: { userId: user.id } }),
    db.expense.count({ where: { userId: user.id } }),
    db.aiChat.count({ where: { userId: user.id, role: "user" } }),
    db.budget.count({ where: { userId: user.id, month: monthKey } }),
  ]);

  const totalTxns = incomeCount + expenseCount;
  const goalCount = data.goals.length;
  const completedGoals = data.goals.filter((g) => g.currentAmount >= g.targetAmount).length;
  const savingsRate = data.savingsRate;
  const budgetUsed = data.monthlyBudget > 0 ? (data.totalExpense / data.monthlyBudget) * 100 : 0;
  const emergencyRatio = data.totalExpense > 0 ? Math.max(0, data.totalIncome - data.totalExpense) / (data.totalExpense * 3) : 0;

  // No-spend streak
  const today = new Date();
  let noSpendStreak = 0;
  for (let i = 1; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayExpense = data.expenses.filter((e) => {
      const ed = new Date(e.date);
      return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth() && ed.getDate() === d.getDate();
    }).reduce((s, e) => s + e.amount, 0);
    if (dayExpense === 0) noSpendStreak++;
    else break;
  }

  const spendingReduced = prevData.totalExpense > 0 && data.totalExpense < prevData.totalExpense;
  const categoryCount = Object.keys(data.categorySpending).length;

  const ctx = {
    totalTxns, goalCount, completedGoals, savingsRate, budgetUsed, budgetCount,
    emergencyRatio, noSpendStreak, chatCount, spendingReduced, categoryCount,
  };

  // Get existing achievements
  const existing = await db.achievement.findMany({ where: { userId: user.id } });
  const existingMap = new Map(existing.map((a) => [a.type, a]));

  // Check & unlock new achievements
  const newlyUnlocked: any[] = [];
  for (const ach of ACHIEVEMENTS) {
    const isUnlocked = ach.check(ctx);
    const progress = ach.progress(ctx);
    const existingAch = existingMap.get(ach.type);

    if (isUnlocked && !existingAch) {
      // Unlock new achievement
      const created = await db.achievement.create({
        data: {
          userId: user.id,
          type: ach.type,
          title: ach.title,
          description: ach.description,
          icon: ach.icon,
          progress: 100,
        },
      });
      newlyUnlocked.push(created);

      // Create a notification for the unlock
      await db.notification.create({
        data: {
          userId: user.id,
          type: "ai_tip",
          title: `Achievement Unlocked: ${ach.title}!`,
          message: `${ach.icon} ${ach.description}`,
          severity: "success",
        },
      }).catch(() => {});
    } else if (existingAch && existingAch.progress < 100 && progress >= 100) {
      // Achievement just hit 100%
      await db.achievement.update({
        where: { id: existingAch.id },
        data: { progress: 100, unlockedAt: new Date() },
      });
    } else if (!existingAch && !isUnlocked && progress > 0) {
      // Track in-progress achievement (don't notify)
      await db.achievement.create({
        data: {
          userId: user.id,
          type: ach.type,
          title: ach.title,
          description: ach.description,
          icon: ach.icon,
          progress: Math.round(progress),
        },
      }).catch(() => {});
    } else if (existingAch && existingAch.progress < 100) {
      // Update progress
      await db.achievement.update({
        where: { id: existingAch.id },
        data: { progress: Math.round(progress) },
      }).catch(() => {});
    }
  }

  // Return all achievements (re-fetch to get updates)
  const all = await db.achievement.findMany({
    where: { userId: user.id },
    orderBy: [{ progress: "desc" }, { unlockedAt: "desc" }],
  });

  const unlockedCount = all.filter((a) => a.progress >= 100).length;
  const totalPossible = ACHIEVEMENTS.length;

  return NextResponse.json({
    achievements: all,
    newlyUnlocked,
    stats: { unlockedCount, totalPossible, progressPct: (unlockedCount / totalPossible) * 100 },
  });
}
