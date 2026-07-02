import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { generateQuickInsights } from "@/lib/ai";
import { getCurrentMonthKey } from "@/lib/finance";

// In-memory cache: userId -> { insights, month, ts }
const cache = new Map<string, { insights: string[]; month: string; ts: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthKey = getCurrentMonthKey();
  const cached = cache.get(user.id);
  const now = Date.now();

  // Return cached if fresh AND same month
  if (cached && cached.month === monthKey && now - cached.ts < TTL_MS) {
    return NextResponse.json({ insights: cached.insights, cached: true, age: Math.round((now - cached.ts) / 1000) });
  }

  // Generate fresh
  const insights = await generateQuickInsights(user.id);
  cache.set(user.id, { insights, month: monthKey, ts: now });

  return NextResponse.json({ insights, cached: false, age: 0 });
}

// Force-refresh endpoint
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  cache.delete(user.id);
  const insights = await generateQuickInsights(user.id);
  const monthKey = getCurrentMonthKey();
  cache.set(user.id, { insights, month: monthKey, ts: Date.now() });

  return NextResponse.json({ insights, cached: false, refreshed: true });
}
