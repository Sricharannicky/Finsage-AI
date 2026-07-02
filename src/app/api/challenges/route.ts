import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey, getMonthRange } from "@/lib/finance";

// Available challenge templates
const CHALLENGE_TEMPLATES = [
  {
    type: "no_spend_week",
    title: "No-Spend Week",
    description: "Go 7 days without any discretionary spending (only essentials allowed)",
    icon: "🚫",
    targetDays: 7,
    reward: "Master of Discipline",
  },
  {
    type: "cook_at_home",
    title: "Cook at Home Week",
    description: "Eat only home-cooked meals for 7 days — no restaurants or food delivery",
    icon: "🍳",
    targetDays: 7,
    reward: "Home Chef",
  },
  {
    type: "save_20_percent",
    title: "Save 20% This Month",
    description: "Save at least 20% of your income this month",
    icon: "💰",
    targetDays: 30,
    reward: "Savings Champion",
  },
  {
    type: "no_coffee_month",
    title: "No Coffee Month",
    description: "Make coffee at home for 30 days — skip the café",
    icon: "☕",
    targetDays: 30,
    reward: "Coffee Conqueror",
  },
  {
    type: "zero_subscription",
    title: "Audit Subscriptions",
    description: "Review and cancel at least 2 unused subscriptions this week",
    icon: "📺",
    targetDays: 7,
    reward: "Subscription Slayer",
  },
  {
    type: "pack_lunch_week",
    title: "Pack Your Lunch",
    description: "Bring lunch from home for 5 work days",
    icon: "🍱",
    targetDays: 5,
    reward: "Lunch Packer",
  },
  {
    type: "walk_more",
    title: "Walk & Save",
    description: "Walk instead of cab/uber for short trips for 7 days",
    icon: "🚶",
    targetDays: 7,
    reward: "Step Saver",
  },
  {
    type: "52_week",
    title: "52-Week Challenge",
    description: "Save ₹100 in week 1, ₹200 in week 2... up to ₹52 in week 52",
    icon: "📈",
    targetDays: 364,
    reward: "Wealth Builder",
  },
];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const challenges = await db.challenge.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Auto-update completed days for active challenges based on elapsed days
  const now = new Date();
  const activeChallenges = challenges.filter((c) => c.status === "active");
  for (const c of activeChallenges) {
    const elapsedDays = Math.min(c.targetDays, Math.floor((now.getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24)));
    if (elapsedDays > c.completedDays) {
      await db.challenge.update({
        where: { id: c.id },
        data: { completedDays: elapsedDays },
      });
      // Auto-complete if reached target
      if (elapsedDays >= c.targetDays) {
        await db.challenge.update({
          where: { id: c.id },
          data: { status: "completed", endDate: now },
        });
        // Create notification
        await db.notification.create({
          data: {
            userId: user.id,
            type: "ai_tip",
            title: `Challenge Completed: ${c.title}!`,
            message: `${c.icon} You finished the "${c.title}" challenge! Badge earned: ${c.reward}`,
            severity: "success",
          },
        }).catch(() => {});
      }
    }
  }

  // Re-fetch with updated data
  const updated = await db.challenge.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Separate active/completed from available templates
  const activeOrCompletedTypes = new Set(updated.map((c) => c.type));
  const availableTemplates = CHALLENGE_TEMPLATES.filter((t) => !activeOrCompletedTypes.has(t.type));

  const stats = {
    total: updated.length,
    active: updated.filter((c) => c.status === "active").length,
    completed: updated.filter((c) => c.status === "completed").length,
    abandoned: updated.filter((c) => c.status === "abandoned").length,
  };

  return NextResponse.json({
    challenges: updated,
    available: availableTemplates,
    stats,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type } = body;
  const template = CHALLENGE_TEMPLATES.find((t) => t.type === type);
  if (!template) return NextResponse.json({ error: "Invalid challenge type" }, { status: 400 });

  // Check if already active
  const existing = await db.challenge.findFirst({
    where: { userId: user.id, type, status: "active" },
  });
  if (existing) return NextResponse.json({ error: "Challenge already active" }, { status: 409 });

  const challenge = await db.challenge.create({
    data: {
      userId: user.id,
      type: template.type,
      title: template.title,
      description: template.description,
      icon: template.icon,
      targetDays: template.targetDays,
      reward: template.reward,
    },
  });

  return NextResponse.json({ challenge });
}

// Update challenge (mark day complete, abandon, etc.)
export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, action } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const challenge = await db.challenge.findUnique({ where: { id, userId: user.id } });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "abandon") {
    const updated = await db.challenge.update({
      where: { id },
      data: { status: "abandoned", endDate: new Date() },
    });
    return NextResponse.json({ challenge: updated });
  }

  if (action === "complete") {
    const updated = await db.challenge.update({
      where: { id },
      data: { status: "completed", completedDays: challenge.targetDays, endDate: new Date() },
    });
    await db.notification.create({
      data: {
        userId: user.id,
        type: "ai_tip",
        title: `Challenge Completed: ${challenge.title}!`,
        message: `${challenge.icon} You finished the "${challenge.title}" challenge! Badge earned: ${challenge.reward}`,
        severity: "success",
      },
    }).catch(() => {});
    return NextResponse.json({ challenge: updated });
  }

  if (action === "increment") {
    const newDays = Math.min(challenge.targetDays, challenge.completedDays + 1);
    const isComplete = newDays >= challenge.targetDays;
    const updated = await db.challenge.update({
      where: { id },
      data: {
        completedDays: newDays,
        ...(isComplete ? { status: "completed", endDate: new Date() } : {}),
      },
    });
    if (isComplete) {
      await db.notification.create({
        data: {
          userId: user.id,
          type: "ai_tip",
          title: `Challenge Completed: ${challenge.title}!`,
          message: `${challenge.icon} You finished the "${challenge.title}" challenge! Badge earned: ${challenge.reward}`,
          severity: "success",
        },
      }).catch(() => {});
    }
    return NextResponse.json({ challenge: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
