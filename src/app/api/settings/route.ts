import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().nullable().optional(),
  currency: z.string().optional(),
  monthlyIncomeGoal: z.number().min(0).optional(),
  savingsTarget: z.number().min(0).optional(),
});

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      currency: true,
      monthlyIncomeGoal: true,
      savingsTarget: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ user: updated });
}
