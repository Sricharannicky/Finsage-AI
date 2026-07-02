import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { generateWeeklyReport } from "@/lib/ai";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await generateWeeklyReport(user.id);
  return NextResponse.json(report);
}
