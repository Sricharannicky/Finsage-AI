import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const createSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1),
  date: z.string().refine((s) => !isNaN(new Date(s).getTime()), "Invalid date"),
  note: z.string().optional().nullable(),
  paymentMethod: z.string().optional().default("Cash"),
  recurring: z.boolean().optional().default(false),
});

const updateSchema = z.object({
  id: z.string().min(1),
  amount: z.number().positive("Amount must be positive").finite().optional(),
  category: z.string().min(1).optional(),
  date: z.string().refine((s) => !isNaN(new Date(s).getTime()), "Invalid date").optional(),
  note: z.string().optional().nullable(),
  paymentMethod: z.string().optional(),
  recurring: z.boolean().optional(),
  flagged: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const where: any = { userId: user.id };
  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(y, m - 1, 1),
      lte: new Date(y, m, 0, 23, 59, 59),
    };
  }
  if (category && category !== "all") where.category = category;
  if (search) {
    where.OR = [
      { note: { contains: search } },
      { category: { contains: search } },
      { paymentMethod: { contains: search } },
    ];
  }

  const expenses = await db.expense.findMany({
    where,
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const expense = await db.expense.create({
    data: { ...parsed.data, date: new Date(parsed.data.date), userId: user.id },
  });
  return NextResponse.json({ expense });
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
  if (data.date) data.date = new Date(data.date); // validity already checked by schema

  const expense = await db.expense.update({
    where: { id, userId: user.id },
    data,
  });
  return NextResponse.json({ expense });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.expense.delete({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
