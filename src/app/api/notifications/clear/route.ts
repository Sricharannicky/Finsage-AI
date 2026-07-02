import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Delete ALL read notifications for the user
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db.notification.deleteMany({
    where: { userId: user.id, read: true },
  });
  return NextResponse.json({ success: true, deleted: result.count });
}
