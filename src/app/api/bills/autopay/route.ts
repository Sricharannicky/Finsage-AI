import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Auto-pay all due/overdue bills: creates expense records and advances due dates
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const bills = await db.bill.findMany({
    where: { userId: user.id, paid: false, nextDueDate: { lte: now } },
  });

  if (bills.length === 0) {
    return NextResponse.json({ success: true, paid: 0, message: "No bills due for auto-payment." });
  }

  let totalPaid = 0;
  const paidBills: string[] = [];

  for (const bill of bills) {
    // Create expense for this bill
    await db.expense.create({
      data: {
        userId: user.id,
        amount: bill.amount,
        category: bill.category,
        date: now,
        note: `Auto-paid bill: ${bill.name}`,
        paymentMethod: bill.autoPay ? "Auto" : "UPI",
        recurring: true,
      },
    });

    // Advance next due date
    const next = new Date(bill.nextDueDate);
    if (bill.frequency === "weekly") next.setDate(next.getDate() + 7);
    else if (bill.frequency === "monthly") next.setMonth(next.getMonth() + 1);
    else if (bill.frequency === "quarterly") next.setMonth(next.getMonth() + 3);
    else if (bill.frequency === "yearly") next.setFullYear(next.getFullYear() + 1);

    await db.bill.update({
      where: { id: bill.id },
      data: { nextDueDate: next },
    });

    totalPaid += bill.amount;
    paidBills.push(bill.name);
  }

  // Create a notification
  await db.notification.create({
    data: {
      userId: user.id,
      type: "ai_tip",
      title: `${bills.length} bills auto-paid`,
      message: `Auto-paid ${bills.length} bill${bills.length > 1 ? "s" : ""} totaling ₹${totalPaid.toLocaleString("en-IN")}: ${paidBills.join(", ")}`,
      severity: "success",
    },
  });

  return NextResponse.json({
    success: true,
    paid: bills.length,
    totalPaid,
    bills: paidBills,
  });
}
