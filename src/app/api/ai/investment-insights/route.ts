import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getUserFinancialData, getCurrentMonthKey } from "@/lib/finance";

// AI-powered investment insights & rebalancing suggestions
// Analyzes portfolio diversification, performance, and risk
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investments = await db.investment.findMany({
    where: { userId: user.id },
    orderBy: { currentValue: "desc" },
  });

  const finData = await getUserFinancialData(user.id, getCurrentMonthKey());

  if (investments.length === 0) {
    return NextResponse.json({
      summary: "You haven't added any investments yet. Start building your portfolio by adding your first investment — even a small SIP is a great beginning.",
      insights: [],
      recommendations: [
        {
          type: "diversification",
          priority: "high",
          title: "Start Investing",
          description: "Begin with a mutual fund SIP or fixed deposit. Even ₹5,000/month can grow significantly over time.",
          action: "Add Investment",
        },
      ],
      riskScore: 0,
      diversificationScore: 0,
    });
  }

  const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
  const totalValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalGain = totalValue - totalInvested;
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Group by type for diversification analysis
  const byType: Record<string, { invested: number; value: number; count: number; gain: number }> = {};
  for (const inv of investments) {
    if (!byType[inv.type]) byType[inv.type] = { invested: 0, value: 0, count: 0, gain: 0 };
    byType[inv.type].invested += inv.investedAmount;
    byType[inv.type].value += inv.currentValue;
    byType[inv.type].gain += inv.currentValue - inv.investedAmount;
    byType[inv.type].count += 1;
  }

  // Diversification score (0-100): based on number of types and concentration
  const typeCount = Object.keys(byType).length;
  const maxConcentration = Math.max(...Object.values(byType).map((t) => totalValue > 0 ? t.value / totalValue : 0));
  const diversificationScore = Math.round(
    Math.min(100, (typeCount / 5) * 50 + (1 - maxConcentration) * 50)
  );

  // Risk score (0-100, higher = riskier)
  const riskWeights: Record<string, number> = {
    stock: 90, crypto: 95, etf: 60, mutual_fund: 50, gold: 30, fixed_deposit: 10, ppf: 10, other: 50,
  };
  let riskScore = 0;
  for (const [type, data] of Object.entries(byType)) {
    const weight = riskWeights[type] || 50;
    const proportion = totalValue > 0 ? data.value / totalValue : 0;
    riskScore += weight * proportion;
  }
  riskScore = Math.round(riskScore);

  // Build insights
  const insights: { type: "positive" | "negative" | "neutral"; title: string; description: string }[] = [];

  // 1. Overall performance
  if (gainPct > 15) {
    insights.push({ type: "positive", title: "Strong portfolio performance", description: `Your investments gained ${gainPct.toFixed(1)}% — outperforming typical market averages.` });
  } else if (gainPct > 0) {
    insights.push({ type: "positive", title: "Portfolio in profit", description: `Your investments gained ${gainPct.toFixed(1)}% (₹${Math.round(totalGain).toLocaleString("en-IN")}).` });
  } else if (gainPct < -10) {
    insights.push({ type: "negative", title: "Portfolio in loss", description: `Your investments are down ${Math.abs(gainPct).toFixed(1)}%. Consider holding long-term or reviewing underperformers.` });
  }

  // 2. Diversification
  if (typeCount >= 5) {
    insights.push({ type: "positive", title: "Well-diversified portfolio", description: `You have ${typeCount} investment types — good diversification reduces risk.` });
  } else if (typeCount <= 2 && totalValue > 50000) {
    insights.push({ type: "negative", title: "Concentration risk", description: `${typeCount} investment type${typeCount > 1 ? "s" : ""} for ₹${Math.round(totalValue).toLocaleString("en-IN")} — consider diversifying across more asset classes.` });
  }

  // 3. Over-concentration
  if (maxConcentration > 0.6 && totalValue > 50000) {
    const topType = Object.entries(byType).sort((a, b) => b[1].value - a[1].value)[0];
    insights.push({ type: "negative", title: "Over-concentration detected", description: `${(maxConcentration * 100).toFixed(0)}% of your portfolio is in ${topType[0]}. Consider rebalancing.` });
  }

  // 4. Best & worst performers
  const performers = investments.map((i) => ({
    name: i.name,
    type: i.type,
    gainPct: i.investedAmount > 0 ? ((i.currentValue - i.investedAmount) / i.investedAmount) * 100 : 0,
  })).sort((a, b) => b.gainPct - a.gainPct);

  if (performers[0] && performers[0].gainPct > 0) {
    insights.push({ type: "positive", title: `Top performer: ${performers[0].name}`, description: `Up ${performers[0].gainPct.toFixed(1)}% — your best investment.` });
  }
  if (performers[performers.length - 1] && performers[performers.length - 1].gainPct < -5) {
    insights.push({ type: "negative", title: `Underperformer: ${performers[performers.length - 1].name}`, description: `Down ${Math.abs(performers[performers.length - 1].gainPct).toFixed(1)}% — review if it still fits your strategy.` });
  }

  // 5. Risk assessment
  if (riskScore > 70) {
    insights.push({ type: "negative", title: "High-risk portfolio", description: `Risk score: ${riskScore}/100. Heavy allocation in volatile assets. Consider adding stable instruments like FDs or PPF.` });
  } else if (riskScore < 30 && totalValue > 100000) {
    insights.push({ type: "neutral", title: "Conservative portfolio", description: `Risk score: ${riskScore}/100. Your portfolio is low-risk but may not beat inflation. Consider some equity exposure.` });
  }

  // 6. Investment-to-savings ratio
  const monthlyIncome = finData.totalIncome;
  const monthlyExpense = finData.totalExpense;
  const monthlySavings = monthlyIncome - monthlyExpense;
  if (monthlySavings > 0) {
    const investmentToSavingsRatio = totalValue > 0 ? (totalValue / (monthlySavings * 12)) * 100 : 0;
    if (investmentToSavingsRatio < 20 && monthlySavings > 5000) {
      insights.push({ type: "neutral", title: "Invest more of your savings", description: `You save ₹${Math.round(monthlySavings).toLocaleString("en-IN")}/month but your investments are small relative to savings. Aim to invest 20-30% of savings.` });
    }
  }

  // Recommendations
  const recommendations: { type: string; priority: string; title: string; description: string; action?: string }[] = [];

  if (diversificationScore < 40) {
    recommendations.push({
      type: "diversification",
      priority: "high",
      title: "Diversify your portfolio",
      description: `Add investments in 2-3 more asset classes (e.g., gold, ETF, or PPF) to reduce risk. Current diversification: ${diversificationScore}/100.`,
      action: "Add Investment",
    });
  }
  if (riskScore > 70) {
    recommendations.push({
      type: "risk",
      priority: "high",
      title: "Reduce portfolio risk",
      description: "Shift 15-20% from high-risk assets to stable instruments like FDs or debt funds.",
    });
  }
  if (maxConcentration > 0.6) {
    recommendations.push({
      type: "rebalance",
      priority: "medium",
      title: "Rebalance over-concentrated assets",
      description: `Your largest position is ${(maxConcentration * 100).toFixed(0)}% of portfolio. Target 30-40% max per asset class.`,
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      type: "maintain",
      priority: "low",
      title: "Maintain your strategy",
      description: "Your portfolio looks well-balanced. Continue your investment discipline and review quarterly.",
    });
  }

  const summary = `Portfolio value: ₹${Math.round(totalValue).toLocaleString("en-IN")} across ${typeCount} asset type${typeCount > 1 ? "s" : ""} with ${investments.length} holding${investments.length > 1 ? "s" : ""}. ${gainPct >= 0 ? "Overall gain" : "Overall loss"}: ${gainPct.toFixed(1)}%. Diversification: ${diversificationScore}/100, Risk: ${riskScore}/100.`;

  return NextResponse.json({
    summary,
    insights: insights.slice(0, 6),
    recommendations,
    riskScore,
    diversificationScore,
    stats: {
      totalInvested, totalValue, totalGain, gainPct,
      typeCount, holdingCount: investments.length, maxConcentration,
    },
  });
}
