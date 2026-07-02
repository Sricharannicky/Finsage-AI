import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { suggestBudgetAllocation } from "@/lib/ai";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const suggestion = await suggestBudgetAllocation(user.id);
  return NextResponse.json(suggestion);
}
