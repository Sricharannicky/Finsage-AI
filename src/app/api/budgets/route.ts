import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey } from "@/lib/finance";

const createSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  period: z.enum(["weekly", "monthly"]).default("monthly"),
  month: z.string().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = getCurrentMonthKey();
  const budgets = await db.budget.findMany({
    where: { userId: user.id, month },
    orderBy: { category: "asc" },
  });
  return NextResponse.json({ budgets, month });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const month = parsed.data.month || getCurrentMonthKey();

  // Upsert budget for category/month/period
  const budget = await db.budget.upsert({
    where: {
      userId_category_month_period: {
        userId: user.id,
        category: parsed.data.category,
        month,
        period: parsed.data.period,
      },
    },
    create: {
      userId: user.id,
      category: parsed.data.category,
      amount: parsed.data.amount,
      period: parsed.data.period,
      month,
    },
    update: { amount: parsed.data.amount },
  });
  return NextResponse.json({ budget });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.budget.delete({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
