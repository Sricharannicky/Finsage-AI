import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Mark a bill as paid (and optionally create an expense for it, advance next due date)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, createExpense } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const bill = await db.bill.findUnique({ where: { id, userId: user.id } });
  if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

  // Compute next due date based on frequency
  const next = new Date(bill.nextDueDate);
  if (bill.frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (bill.frequency === "monthly") next.setMonth(next.getMonth() + 1);
  else if (bill.frequency === "quarterly") next.setMonth(next.getMonth() + 3);
  else if (bill.frequency === "yearly") next.setFullYear(next.getFullYear() + 1);

  // Reset paid flag and advance due date for next cycle
  await db.bill.update({
    where: { id },
    data: { paid: false, nextDueDate: next },
  });

  // Optionally create an expense for this bill payment
  if (createExpense) {
    await db.expense.create({
      data: {
        userId: user.id,
        amount: bill.amount,
        category: bill.category,
        date: new Date(),
        note: `Bill payment: ${bill.name}`,
        paymentMethod: "Auto",
        recurring: true,
      },
    });
  }

  return NextResponse.json({ success: true, nextDueDate: next.toISOString() });
}
