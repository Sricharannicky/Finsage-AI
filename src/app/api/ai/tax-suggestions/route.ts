import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey, getMonthRange } from "@/lib/finance";

// Tax Saving Suggestions API (Indian tax context: Section 80C/80D/80G/80CCD/etc.)
// Analyzes user's investments and expenses to recommend tax-saving actions
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get current financial year (April 1 - March 31 in India)
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart = new Date(fyStartYear, 3, 1); // April 1
  const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59); // March 31

  // Get all investments and tax-related expenses in current FY
  const [investments, expenses] = await Promise.all([
    db.investment.findMany({
      where: {
        userId: user.id,
        purchaseDate: { gte: fyStart, lte: fyEnd },
      },
      select: { name: true, type: true, investedAmount: true, currentValue: true },
    }),
    db.expense.findMany({
      where: {
        userId: user.id,
        date: { gte: fyStart, lte: fyEnd },
        category: { in: ["Insurance", "Healthcare", "Education", "Investment", "EMI"] },
      },
      select: { amount: true, category: true, note: true, date: true },
    }),
  ]);

  // Calculate current 80C investments (PPF, ELSS/mutual_fund, FD, etc.)
  // Assumption: mutual_fund = ELSS (tax-saving), ppf, fixed_deposit (5yr)
  const taxSavingInvestments = {
    ppf: investments.filter((i) => i.type === "ppf").reduce((s, i) => s + i.investedAmount, 0),
    elss: investments.filter((i) => i.type === "mutual_fund").reduce((s, i) => s + i.investedAmount, 0),
    fd: investments.filter((i) => i.type === "fixed_deposit").reduce((s, i) => s + i.investedAmount, 0),
  };

  // Insurance premiums (80D)
  const healthInsurance = expenses
    .filter((e) => e.category === "Insurance" && e.note?.toLowerCase().includes("health"))
    .reduce((s, e) => s + e.amount, 0);
  const lifeInsurance = expenses
    .filter((e) => e.category === "Insurance" && !e.note?.toLowerCase().includes("health"))
    .reduce((s, e) => s + e.amount, 0);

  // Education expenses (80E for education loan interest)
  const educationExpenses = expenses
    .filter((e) => e.category === "Education")
    .reduce((s, e) => s + e.amount, 0);

  // 80C limit: ₹1,50,000
  const section80C = {
    limit: 150000,
    used: taxSavingInvestments.ppf + taxSavingInvestments.elss + taxSavingInvestments.fd,
    breakdown: [
      { instrument: "PPF", amount: taxSavingInvestments.ppf },
      { instrument: "ELSS / Mutual Funds", amount: taxSavingInvestments.elss },
      { instrument: "Fixed Deposit (5yr)", amount: taxSavingInvestments.fd },
    ].filter((d) => d.amount > 0),
  };
  section80C.remaining = Math.max(0, section80C.limit - section80C.used);

  // 80D limit: ₹25,000 (self/family), ₹50,000 (senior citizen)
  const section80D = {
    limit: 25000,
    used: healthInsurance,
    remaining: Math.max(0, 25000 - healthInsurance),
  };

  // 80CCD(1B) NPS: ₹50,000 additional
  const section80CCD1B = {
    limit: 50000,
    used: 0, // NPS not tracked separately
    remaining: 50000,
  };

  // 80E: Education loan interest (no limit, full interest deductible)
  const section80E = {
    limit: null, // No limit
    used: educationExpenses,
  };

  // Total potential tax savings
  const totalPotentialSavings = section80C.remaining + section80D.remaining + section80CCD1B.remaining;

  // Estimate tax saved (assuming 30% tax bracket + 4% cess = 31.2%)
  const taxBracket = 0.312;
  const estimatedTaxSaved = Math.round(section80C.used * taxBracket);

  // Build recommendations
  const recommendations: { section: string; title: string; description: string; potentialSaving: number; priority: string }[] = [];

  if (section80C.remaining > 0) {
    recommendations.push({
      section: "80C",
      title: `Invest ₹${section80C.remaining.toLocaleString("en-IN")} more in 80C`,
      description: section80C.remaining > 100000
        ? "Maximize your PPF or start an ELSS SIP. ELSS has the shortest lock-in (3 years) among 80C options."
        : "You're close to the 80C limit. Consider a top-up to your PPF or an ELSS investment.",
      potentialSaving: Math.round(section80C.remaining * taxBracket),
      priority: "high",
    });
  }

  if (section80D.remaining > 0 && healthInsurance === 0) {
    recommendations.push({
      section: "80D",
      title: "Get health insurance",
      description: "No health insurance premiums detected. A family floater plan can save tax under 80D while protecting your finances.",
      potentialSaving: Math.round(section80D.remaining * taxBracket),
      priority: "high",
    });
  }

  recommendations.push({
    section: "80CCD(1B)",
    title: "Open an NPS account",
    description: "NPS offers an additional ₹50,000 deduction beyond 80C. Best for long-term retirement planning.",
    potentialSaving: Math.round(50000 * taxBracket),
    priority: "medium",
  });

  // AI-style summary using LLM
  const summary = `In FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}, you've utilized ₹${section80C.used.toLocaleString("en-IN")} of your ₹${section80C.limit.toLocaleString("en-IN")} 80C limit${section80C.remaining > 0 ? `, leaving ₹${section80C.remaining.toLocaleString("en-IN")} unused` : " — fully utilized!"}. You could save approximately ₹${(totalPotentialSavings * taxBracket).toLocaleString("en-IN", { maximumFractionDigits: 0 })} in taxes by optimizing your investments.`;

  return NextResponse.json({
    financialYear: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
    summary,
    sections: {
      "80C": section80C,
      "80D": section80D,
      "80CCD(1B)": section80CCD1B,
      "80E": section80E,
    },
    totalPotentialSavings,
    estimatedTaxSaved,
    taxBracket: "31.2% (30% + 4% cess)",
    recommendations,
    totalRecommendationSaving: recommendations.reduce((s, r) => s + r.potentialSaving, 0),
  });
}
