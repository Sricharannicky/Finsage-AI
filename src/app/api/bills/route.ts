import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(2),
  amount: z.number().positive(),
  category: z.string().min(1),
  dueDay: z.number().min(1).max(31),
  nextDueDate: z.string().refine((s) => !isNaN(new Date(s).getTime()), "Invalid date"),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]).default("monthly"),
  autoPay: z.boolean().default(false),
  note: z.string().nullable().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  amount: z.number().positive().finite().optional(),
  category: z.string().min(1).optional(),
  dueDay: z.number().min(1).max(31).optional(),
  nextDueDate: z.string().refine((s) => !isNaN(new Date(s).getTime()), "Invalid date").optional(),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]).optional(),
  autoPay: z.boolean().optional(),
  paid: z.boolean().optional(),
  note: z.string().nullable().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bills = await db.bill.findMany({
    where: { userId: user.id },
    orderBy: [{ paid: "asc" }, { nextDueDate: "asc" }],
  });

  // Compute upcoming/overdue status
  const now = new Date();
  const enriched = bills.map((b) => {
    const due = new Date(b.nextDueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let status: "overdue" | "due-soon" | "upcoming" | "paid" = "upcoming";
    if (b.paid) status = "paid";
    else if (diffDays < 0) status = "overdue";
    else if (diffDays <= 3) status = "due-soon";
    return { ...b, diffDays, status };
  });

  const totalMonthly = bills
    .filter((b) => b.frequency === "monthly")
    .reduce((s, b) => s + b.amount, 0);
  const unpaidTotal = bills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  const overdueCount = enriched.filter((b) => b.status === "overdue").length;
  const dueSoonCount = enriched.filter((b) => b.status === "due-soon").length;

  return NextResponse.json({
    bills: enriched,
    stats: { totalMonthly, unpaidTotal, overdueCount, dueSoonCount, total: bills.length },
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const bill = await db.bill.create({
    data: { ...parsed.data, nextDueDate: new Date(parsed.data.nextDueDate), userId: user.id },
  });
  return NextResponse.json({ bill });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const { id, ...rest } = parsed.data;
  const data: Record<string, any> = { ...rest };
  if (data.nextDueDate) data.nextDueDate = new Date(data.nextDueDate); // validity already checked by schema

  const bill = await db.bill.update({ where: { id, userId: user.id }, data });
  return NextResponse.json({ bill });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.bill.delete({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
