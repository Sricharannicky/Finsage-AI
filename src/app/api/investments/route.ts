import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["stock", "mutual_fund", "etf", "crypto", "fixed_deposit", "ppf", "gold", "other"]),
  investedAmount: z.number().min(0),
  currentValue: z.number().min(0),
  units: z.number().min(0).default(0),
  purchaseDate: z.string(),
  note: z.string().nullable().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investments = await db.investment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const enriched = investments.map((inv) => ({
    ...inv,
    gain: inv.currentValue - inv.investedAmount,
    gainPct: inv.investedAmount > 0 ? ((inv.currentValue - inv.investedAmount) / inv.investedAmount) * 100 : 0,
  }));

  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const totalValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalGain = totalValue - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Breakdown by type
  const byType: Record<string, { invested: number; value: number; count: number }> = {};
  for (const i of investments) {
    if (!byType[i.type]) byType[i.type] = { invested: 0, value: 0, count: 0 };
    byType[i.type].invested += i.investedAmount;
    byType[i.type].value += i.currentValue;
    byType[i.type].count += 1;
  }

  return NextResponse.json({
    investments: enriched,
    stats: { totalInvested, totalValue, totalGain, totalGainPct, count: investments.length },
    byType: Object.entries(byType).map(([type, d]) => ({ type, ...d })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const inv = await db.investment.create({
    data: { ...parsed.data, purchaseDate: new Date(parsed.data.purchaseDate), userId: user.id },
  });
  return NextResponse.json({ investment: inv });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);

  const inv = await db.investment.update({ where: { id, userId: user.id }, data });
  return NextResponse.json({ investment: inv });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.investment.delete({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
