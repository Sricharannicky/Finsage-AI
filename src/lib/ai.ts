import ZAI from "z-ai-web-dev-sdk";
import { db } from "./db";
import {
  getUserFinancialData,
  getCurrentMonthKey,
  getMonthRange,
  getMonthsAgo,
  calculateHealthScore,
  detectOverspending,
  buildCategoryBreakdown,
} from "./finance";
import {
  predictNextMonthExpense,
  predictExpectedSavings,
  predictCategoryExpenses,
} from "./prediction";

let zaiInstance: any = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Build a comprehensive financial context string for the AI
export async function buildFinancialContext(userId: string): Promise<string> {
  const monthKey = getCurrentMonthKey();
  const data = await getUserFinancialData(userId, monthKey);
  const prevMonthKey = getMonthsAgo(1);
  const prevData = await getUserFinancialData(userId, prevMonthKey);

  const health = calculateHealthScore({
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    monthlyBudget: data.monthlyBudget,
    savingsRate: data.savingsRate,
    goals: data.goals,
    categorySpending: data.categorySpending,
  });

  const alerts = detectOverspending(
    data.expenses.map((e) => ({ category: e.category, amount: e.amount, date: new Date(e.date), note: e.note })),
    prevData.categorySpending,
    data.budgets.map((b) => ({ category: b.category, amount: b.amount }))
  );

  const categoryBreakdown = buildCategoryBreakdown(data.categorySpending);

  const recentTransactions = [...data.expenses.slice(0, 15), ...data.incomes.slice(0, 5)]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12)
    .map((t) => {
      const isIncome = "source" in t;
      return `${isIncome ? "INCOME" : "EXPENSE"} | ${t.category} | ${t.amount} | ${new Date(t.date).toLocaleDateString("en-IN")} | ${t.note || "-"}`;
    })
    .join("\n");

  const goalsInfo = data.goals
    .map((g) => `${g.title} (target ${g.targetAmount}, saved ${g.currentAmount}, ${Math.round((g.currentAmount / g.targetAmount) * 100)}% complete, deadline ${g.deadline ? new Date(g.deadline).toLocaleDateString("en-IN") : "none"})`)
    .join("\n");

  const budgetInfo = data.budgets
    .map((b) => {
      const spent = data.categorySpending[b.category] || 0;
      return `${b.category}: budget ${b.amount}, spent ${spent} (${Math.round((spent / b.amount) * 100)}%)`;
    })
    .join("\n");

  return `FINANCIAL CONTEXT (Current Month: ${monthKey})

INCOME & EXPENSES
- Total Income: ${data.totalIncome}
- Total Expense: ${data.totalExpense}
- Remaining Balance: ${data.remainingBalance}
- Savings Rate: ${data.savingsRate.toFixed(1)}%
- Monthly Budget: ${data.monthlyBudget}

PREVIOUS MONTH (${prevMonthKey})
- Income: ${prevData.totalIncome}
- Expense: ${prevData.totalExpense}

FINANCIAL HEALTH SCORE: ${health.score}/100 (${health.grade})
Breakdown: Savings ${health.breakdown.savings}/30, Expenses ${health.breakdown.expenses}/20, Budget ${health.breakdown.budget}/20, Goals ${health.breakdown.goals}/15, Emergency ${health.breakdown.emergency}/15

CATEGORY SPENDING (current month):
${categoryBreakdown.map((c) => `- ${c.category}: ${c.amount}`).join("\n") || "- No expenses yet"}

BUDGETS vs SPENDING:
${budgetInfo || "- No budgets set"}

SAVINGS GOALS:
${goalsInfo || "- No goals set"}

RECENT TRANSACTIONS (latest 12):
${recentTransactions || "- No transactions yet"}

OVERSPENDING ALERTS:
${alerts.length > 0 ? alerts.map((a) => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.message}`).join("\n") : "- None detected"}

RECOMMENDATIONS FROM HEALTH SCORE:
${health.recommendations.map((r) => `- ${r}`).join("\n")}`;
}

// AI Financial Advisor chat with context
export async function chatWithAdvisor(
  userId: string,
  userMessage: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<string> {
  const zai = await getZAI();
  const context = await buildFinancialContext(userId);

  const systemPrompt = `You are FinSage, an expert AI personal financial advisor integrated into a budgeting app.

Your role is to provide personalized, actionable financial advice based on the user's real financial data.

CORE PRINCIPLES:
1. Always analyze the user's actual income, expenses, budgets, savings, and goals before answering.
2. Provide specific, actionable recommendations with numbers and reasoning.
3. NEVER provide investment guarantees or specific stock/fund picks. Use phrases like "consider", "you may want to", "based on your data".
4. Be encouraging but honest about financial reality.
5. Keep responses concise but complete. Use markdown formatting (headers, bold, bullet points) for readability.
6. When the user asks "can I afford X", calculate using their savings rate, remaining balance, and discretionary spending.
7. Always explain your reasoning and reference their actual numbers.
8. If asked about investment products, suggest general categories (index funds, emergency funds) but never guarantee returns.
9. Use the user's currency (₹ for INR) when discussing amounts.

${context}

Respond to the user's question below with personalized advice based on this context.`;

  const messages: { role: string; content: string }[] = [
    { role: "assistant", content: systemPrompt },
    ...conversationHistory.slice(-8).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });
    return completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
  } catch (err: any) {
    console.error("AI chat error:", err?.message);
    return `I'm having trouble connecting to my analysis engine right now. Based on your current data: your savings rate is shown in the dashboard. Try asking again in a moment.`;
  }
}

// AI Spending Analysis - natural language summary of spending patterns
export async function generateSpendingAnalysis(userId: string): Promise<{
  summary: string;
  insights: { type: "positive" | "negative" | "neutral"; title: string; description: string }[];
}> {
  const monthKey = getCurrentMonthKey();
  const data = await getUserFinancialData(userId, monthKey);
  const prevMonthKey = getMonthsAgo(1);
  const prevData = await getUserFinancialData(userId, prevMonthKey);
  const prevPrevData = await getUserFinancialData(userId, getMonthsAgo(2));

  const categoryBreakdown = buildCategoryBreakdown(data.categorySpending);
  const alerts = detectOverspending(
    data.expenses.map((e) => ({ category: e.category, amount: e.amount, date: new Date(e.date), note: e.note })),
    prevData.categorySpending,
    data.budgets.map((b) => ({ category: b.category, amount: b.amount }))
  );

  // Build machine-readable insights for the AI to synthesize
  const changes: string[] = [];
  for (const [cat, amt] of Object.entries(data.categorySpending)) {
    const prev = prevData.categorySpending[cat] || 0;
    if (prev > 0) {
      const pct = Math.round(((amt - prev) / prev) * 100);
      if (pct !== 0) changes.push(`${cat}: ${pct > 0 ? "+" : ""}${pct}% (${Math.round(prev)} → ${Math.round(amt)})`);
    } else if (amt > 0) {
      changes.push(`${cat}: new spending of ${Math.round(amt)}`);
    }
  }
  for (const [cat, prev] of Object.entries(prevData.categorySpending)) {
    if (!(cat in data.categorySpending) && prev > 0) {
      changes.push(`${cat}: stopped spending (was ${Math.round(prev)})`);
    }
  }

  const zai = await getZAI();
  const prompt = `Analyze this month's spending data and produce a JSON response.

CURRENT MONTH (${monthKey}): total expense ${data.totalExpense}, income ${data.totalIncome}, savings rate ${data.savingsRate.toFixed(1)}%
PREVIOUS MONTH (${prevMonthKey}): total expense ${prevData.totalExpense}
TWO MONTHS AGO: total expense ${prevPrevData.totalExpense}

CATEGORY CHANGES vs last month:
${changes.join("\n") || "- No comparable data"}

TOP CATEGORIES THIS MONTH:
${categoryBreakdown.slice(0, 5).map((c) => `- ${c.category}: ${c.amount} (${Math.round((c.amount / data.totalExpense) * 100)}% of total)`).join("\n") || "- No expenses"}

ALERTS:
${alerts.length > 0 ? alerts.map((a) => `- [${a.severity}] ${a.title}`).join("\n") : "- None"}

Respond with STRICT JSON only (no markdown, no explanation) in this exact format:
{
  "summary": "2-3 sentence natural language summary of spending this month",
  "insights": [
    {"type": "positive" | "negative" | "neutral", "title": "short title", "description": "1 sentence explanation with numbers"}
  ]
}
Provide 4-6 insights. Include both positive and negative findings.`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: "You are a financial data analyst. Respond only with valid JSON, no extra text." },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    return {
      summary: parsed.summary || "Spending analysis unavailable this month.",
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
    };
  } catch (err: any) {
    console.error("Spending analysis error:", err?.message);
    // Fallback rule-based insights
    const insights: { type: "positive" | "negative" | "neutral"; title: string; description: string }[] = [];
    if (data.savingsRate > 20) {
      insights.push({ type: "positive", title: "Healthy savings rate", description: `You're saving ${data.savingsRate.toFixed(1)}% of income this month, above the recommended 20%.` });
    } else if (data.savingsRate < 10) {
      insights.push({ type: "negative", title: "Low savings rate", description: `Your savings rate is only ${data.savingsRate.toFixed(1)}%. Aim for at least 20%.` });
    }
    if (data.totalExpense < prevData.totalExpense) {
      const pct = Math.round(((prevData.totalExpense - data.totalExpense) / prevData.totalExpense) * 100);
      insights.push({ type: "positive", title: "Reduced spending", description: `You spent ${pct}% less than last month.` });
    } else if (data.totalExpense > prevData.totalExpense * 1.1) {
      const pct = Math.round(((data.totalExpense - prevData.totalExpense) / prevData.totalExpense) * 100);
      insights.push({ type: "negative", title: "Spending increased", description: `Your expenses rose ${pct}% compared to last month.` });
    }
    if (categoryBreakdown[0]) {
      insights.push({ type: "neutral", title: `Top category: ${categoryBreakdown[0].category}`, description: `${categoryBreakdown[0].category} accounts for ${Math.round((categoryBreakdown[0].amount / data.totalExpense) * 100)}% of your spending.` });
    }
    return {
      summary: `This month you spent ${Math.round(data.totalExpense).toLocaleString("en-IN")} against income of ${Math.round(data.totalIncome).toLocaleString("en-IN")}, saving ${data.savingsRate.toFixed(1)}%.`,
      insights: insights.length > 0 ? insights : [{ type: "neutral", title: "Add more transactions", description: "Add transactions to receive detailed spending insights." }],
    };
  }
}

// AI Budget Suggestion - recommend budget allocation based on income & history
export async function suggestBudgetAllocation(userId: string): Promise<{
  suggestions: { category: string; amount: number; reason: string }[];
  total: number;
  explanation: string;
}> {
  const monthKey = getCurrentMonthKey();
  const data = await getUserFinancialData(userId, monthKey);
  const prevData = await getUserFinancialData(userId, getMonthsAgo(1));
  const prevPrevData = await getUserFinancialData(userId, getMonthsAgo(2));

  // Average last 3 months of category spending
  const avgCategorySpending: Record<string, number> = {};
  const allCategories = new Set([
    ...Object.keys(data.categorySpending),
    ...Object.keys(prevData.categorySpending),
    ...Object.keys(prevPrevData.categorySpending),
  ]);
  for (const cat of allCategories) {
    const vals = [data.categorySpending[cat] || 0, prevData.categorySpending[cat] || 0, prevPrevData.categorySpending[cat] || 0];
    avgCategorySpending[cat] = vals.reduce((s, v) => s + v, 0) / vals.length;
  }

  const totalIncome = (data.totalIncome + prevData.totalIncome + prevPrevData.totalIncome) / 3 || data.totalIncome;
  const zai = await getZAI();

  const prompt = `Recommend a monthly budget allocation as JSON.

User's average monthly income: ${Math.round(totalIncome)}
Average spending by category (last 3 months):
${Object.entries(avgCategorySpending).map(([c, a]) => `- ${c}: ${Math.round(a)}`).join("\n") || "- Limited history"}

Standard 50/30/20 rule: 50% needs, 30% wants, 20% savings.
Needs: Rent, Utilities, Food, Healthcare, Insurance, EMI
Wants: Shopping, Entertainment, Travel, Education (optional)
Savings: Investment, Emergency Fund

Respond with STRICT JSON only:
{
  "suggestions": [{"category": "CategoryName", "amount": number, "reason": "short reason"}],
  "total": number,
  "explanation": "2-3 sentence rationale for the allocation"
}
Cover the main expense categories. Total budget should be ~80% of income (leaving 20% for savings).`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: "You are a financial planner. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    return {
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      total: parsed.total || 0,
      explanation: parsed.explanation || "Budget allocation based on your spending history and the 50/30/20 rule.",
    };
  } catch (err: any) {
    console.error("Budget suggestion error:", err?.message);
    // Fallback: rule-based 50/30/20
    const needs = totalIncome * 0.5;
    const suggestions = [
      { category: "Rent", amount: Math.round(needs * 0.4), reason: "Essential housing" },
      { category: "Food", amount: Math.round(needs * 0.3), reason: "Essential groceries and meals" },
      { category: "Utilities", amount: Math.round(needs * 0.2), reason: "Electricity, water, internet" },
      { category: "Healthcare", amount: Math.round(needs * 0.1), reason: "Medical essentials" },
      { category: "Shopping", amount: Math.round(totalIncome * 0.1), reason: "Discretionary" },
      { category: "Entertainment", amount: Math.round(totalIncome * 0.08), reason: "Discretionary" },
      { category: "Travel", amount: Math.round(totalIncome * 0.07), reason: "Discretionary" },
      { category: "Investment", amount: Math.round(totalIncome * 0.2), reason: "Savings & investments" },
    ];
    return {
      suggestions,
      total: suggestions.reduce((s, x) => s + x.amount, 0),
      explanation: "Based on the 50/30/20 rule with adjustments. Add more transaction history for a personalized allocation.",
    };
  }
}

// AI Weekly Report
export async function generateWeeklyReport(userId: string): Promise<{
  summary: string;
  positiveHabits: string[];
  negativeHabits: string[];
  suggestions: string[];
  achievements: string[];
  warnings: string[];
}> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [expenses, incomes, goals, budgets] = await Promise.all([
    db.expense.findMany({ where: { userId, date: { gte: weekAgo, lte: now } }, orderBy: { date: "desc" } }),
    db.income.findMany({ where: { userId, date: { gte: weekAgo, lte: now } } }),
    db.savingsGoal.findMany({ where: { userId } }),
    db.budget.findMany({ where: { userId, month: getCurrentMonthKey() } }),
  ]);

  const weekExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const weekIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const categorySpending: Record<string, number> = {};
  for (const e of expenses) categorySpending[e.category] = (categorySpending[e.category] || 0) + e.amount;

  const prevWeekStart = new Date(weekAgo);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekExpenses = await db.expense.findMany({
    where: { userId, date: { gte: prevWeekStart, lte: weekAgo } },
    select: { amount: true },
  });
  const prevWeekExpense = prevWeekExpenses.reduce((s, e) => s + e.amount, 0);

  const expensePredictions = await predictCategoryExpenses(userId, 4);
  const zai = await getZAI();

  const prompt = `Generate a weekly financial report as JSON.

THIS WEEK (${weekAgo.toLocaleDateString("en-IN")} to ${now.toLocaleDateString("en-IN")}):
- Income: ${weekIncome}
- Expense: ${weekExpense}
- Net: ${weekIncome - weekExpense}
- Transactions: ${expenses.length} expenses, ${incomes.length} incomes

PREVIOUS WEEK EXPENSE: ${prevWeekExpense}
CHANGE: ${prevWeekExpense > 0 ? Math.round(((weekExpense - prevWeekExpense) / prevWeekExpense) * 100) : 0}%

CATEGORY SPENDING THIS WEEK:
${Object.entries(categorySpending).map(([c, a]) => `- ${c}: ${a}`).join("\n") || "- No expenses"}

GOALS:
${goals.map((g) => `- ${g.title}: ${g.currentAmount}/${g.targetAmount} (${Math.round((g.currentAmount / g.targetAmount) * 100)}%)`).join("\n") || "- None"}

BUDGETS:
${budgets.map((b) => `- ${b.category}: ${b.amount}`).join("\n") || "- None"}

TOP PREDICTED CATEGORIES NEXT MONTH:
${expensePredictions.slice(0, 5).map((p) => `- ${p.category}: ~${p.predicted} (trend ${p.trend > 0 ? "+" : ""}${p.trend})`).join("\n") || "- Limited data"}

Respond with STRICT JSON only:
{
  "summary": "2-3 sentence weekly summary",
  "positiveHabits": ["habit 1", "habit 2"],
  "negativeHabits": ["habit 1"],
  "suggestions": ["actionable suggestion 1", "suggestion 2"],
  "achievements": ["achievement 1"],
  "warnings": ["warning 1"]
}
Each array should have 2-4 items, specific to the data above.`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: "You are a financial coach generating a weekly report. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    return {
      summary: parsed.summary || `This week you spent ${Math.round(weekExpense).toLocaleString("en-IN")} and earned ${Math.round(weekIncome).toLocaleString("en-IN")}.`,
      positiveHabits: Array.isArray(parsed.positiveHabits) ? parsed.positiveHabits : [],
      negativeHabits: Array.isArray(parsed.negativeHabits) ? parsed.negativeHabits : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch (err: any) {
    console.error("Weekly report error:", err?.message);
    return {
      summary: `This week you spent ${Math.round(weekExpense).toLocaleString("en-IN")} across ${expenses.length} transactions.`,
      positiveHabits: weekExpense < prevWeekExpense ? ["Reduced spending compared to last week"] : [],
      negativeHabits: weekExpense > prevWeekExpense * 1.2 ? ["Spending increased significantly"] : [],
      suggestions: ["Review your top spending categories", "Set category budgets if not done already"],
      achievements: goals.filter((g) => g.currentAmount / g.targetAmount > 0.5).map((g) => `Making progress on ${g.title}`),
      warnings: weekExpense > prevWeekExpense * 1.3 ? ["Spending is trending upward"] : [],
    };
  }
}

// AI quick suggestions for dashboard
export async function generateQuickInsights(userId: string): Promise<string[]> {
  try {
    const analysis = await generateSpendingAnalysis(userId);
    return analysis.insights.slice(0, 4).map((i) => `${i.title}: ${i.description}`);
  } catch {
    return [
      "Add your income and expenses to receive personalized AI insights.",
      "Set a monthly budget to track your spending discipline.",
      "Create savings goals to build long-term wealth.",
    ];
  }
}
