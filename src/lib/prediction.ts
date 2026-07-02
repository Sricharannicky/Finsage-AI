// Machine Learning utilities for expense prediction
// Implements Linear Regression and Moving Average models in TypeScript
// (substitute for scikit-learn since we run in a Node/Next.js environment)

import { db } from "./db";

export interface PredictionResult {
  type: "next_expense" | "expected_savings" | "future_balance";
  value: number;
  confidence: number; // 0-1
  month: string;
  details?: string;
  series?: { month: string; actual: number | null; predicted: number | null }[];
}

// Simple Linear Regression: y = mx + b
export function linearRegression(points: { x: number; y: number }[]): { m: number; b: number } {
  const n = points.length;
  if (n === 0) return { m: 0, b: 0 };
  if (n === 1) return { m: 0, b: points[0].y };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  const m = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

// R-squared to gauge confidence
export function rSquared(points: { x: number; y: number }[], m: number, b: number): number {
  const meanY = points.reduce((s, p) => s + p.y, 0) / Math.max(1, points.length);
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const yPred = m * p.x + b;
    ssTot += Math.pow(p.y - meanY, 2);
    ssRes += Math.pow(p.y - yPred, 2);
  }
  if (ssTot === 0) return 0.5;
  return Math.max(0, Math.min(1, 1 - ssRes / ssTot));
}

// Moving average prediction
export function movingAverage(values: number[], window = 3): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-window);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

// Seasonal naive forecast (use same month last year if available, else trend)
export function seasonalNaive(values: number[]): number | null {
  if (values.length < 12) return null;
  return values[values.length - 12];
}

// Get last N months of expense totals for a user
export async function getMonthlyExpenseHistory(userId: string, months = 12) {
  const history: { month: string; total: number; category: string }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const expenses = await db.expense.findMany({
      where: { userId, date: { gte: start, lte: end } },
    });
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    }
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    history.push({ month: mk, total, category: JSON.stringify(byCategory) });
  }
  return history;
}

// Get last N months of income totals
export async function getMonthlyIncomeHistory(userId: string, months = 12) {
  const history: { month: string; total: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const incomes = await db.income.findMany({
      where: { userId, date: { gte: start, lte: end } },
    });
    history.push({ month: mk, total: incomes.reduce((s, x) => s + x.amount, 0) });
  }
  return history;
}

// Predict next month's total expense using ensemble (linear regression + moving average)
export async function predictNextMonthExpense(userId: string): Promise<PredictionResult> {
  const history = await getMonthlyExpenseHistory(userId, 12);
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMk = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  if (history.length === 0) {
    return {
      type: "next_expense",
      value: 0,
      confidence: 0,
      month: nextMk,
      details: "No historical data available yet. Start adding expenses to enable predictions.",
      series: [],
    };
  }

  const points = history.map((h, i) => ({ x: i, y: h.total }));
  const { m, b } = linearRegression(points);
  const r2 = rSquared(points, m, b);

  const trendPrediction = m * history.length + b;
  const maPrediction = movingAverage(history.map((h) => h.total), 3);
  const seasonal = seasonalNaive(history.map((h) => h.total));

  // Ensemble: weight trend, MA, and seasonal
  let ensemble = trendPrediction * 0.5 + maPrediction * 0.5;
  if (seasonal !== null) {
    ensemble = trendPrediction * 0.4 + maPrediction * 0.3 + seasonal * 0.3;
  }

  // Confidence based on R-squared and data volume
  const dataConfidence = Math.min(1, history.length / 6);
  const confidence = Math.max(0.3, Math.min(0.95, r2 * 0.6 + dataConfidence * 0.4));

  const series = history.map((h, i) => ({
    month: h.month,
    actual: h.total,
    predicted: null,
  }));
  series.push({
    month: nextMk,
    actual: null,
    predicted: Math.round(ensemble),
  });
  // Also overlay fitted line for actual months
  for (let i = 0; i < history.length; i++) {
    series[i].predicted = Math.round(m * i + b);
  }

  return {
    type: "next_expense",
    value: Math.round(ensemble),
    confidence: Math.round(confidence * 100) / 100,
    month: nextMk,
    details: `Based on ${history.length} months of data. Trend slope: ${m > 0 ? "+" : ""}${Math.round(m)}/month. R² = ${r2.toFixed(2)}.`,
    series,
  };
}

// Predict expected savings next month (income trend - expense prediction)
export async function predictExpectedSavings(userId: string): Promise<PredictionResult> {
  const [incomeHistory, expensePrediction] = await Promise.all([
    getMonthlyIncomeHistory(userId, 12),
    predictNextMonthExpense(userId),
  ]);

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMk = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  if (incomeHistory.length === 0) {
    return {
      type: "expected_savings",
      value: 0,
      confidence: 0,
      month: nextMk,
      details: "No income history available.",
    };
  }

  const incomePoints = incomeHistory.map((h, i) => ({ x: i, y: h.total }));
  const { m, b } = linearRegression(incomePoints);
  const predictedIncome = m * incomeHistory.length + b;
  const maIncome = movingAverage(incomeHistory.map((h) => h.total), 3);
  const expectedIncome = predictedIncome * 0.6 + maIncome * 0.4;

  const expectedSavings = Math.max(0, expectedIncome - expensePrediction.value);
  const confidence = Math.min(expensePrediction.confidence, 0.9);

  return {
    type: "expected_savings",
    value: Math.round(expectedSavings),
    confidence,
    month: nextMk,
    details: `Expected income ~${Math.round(expectedIncome).toLocaleString("en-IN")} minus predicted expense ${expensePrediction.value.toLocaleString("en-IN")}.`,
  };
}

// Predict future balance (current balance + expected savings)
export async function predictFutureBalance(userId: string): Promise<PredictionResult> {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMk = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  // Current total balance = all income - all expenses ever
  const [allIncome, allExpense] = await Promise.all([
    db.income.findMany({ where: { userId }, select: { amount: true } }),
    db.expense.findMany({ where: { userId }, select: { amount: true } }),
  ]);
  const currentBalance = allIncome.reduce((s, x) => s + x.amount, 0) - allExpense.reduce((s, x) => s + x.amount, 0);

  const savingsPrediction = await predictExpectedSavings(userId);
  const futureBalance = currentBalance + savingsPrediction.value;

  return {
    type: "future_balance",
    value: Math.round(futureBalance),
    confidence: savingsPrediction.confidence,
    month: nextMk,
    details: `Current balance ${Math.round(currentBalance).toLocaleString("en-IN")} + projected savings ${savingsPrediction.value.toLocaleString("en-IN")} next month.`,
  };
}

// Predict per-category next month expense (for category-level forecasting)
export async function predictCategoryExpenses(userId: string, months = 6) {
  const now = new Date();
  const categories: Record<string, number[]> = {};

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const expenses = await db.expense.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { category: true, amount: true },
    });
    const byCat: Record<string, number> = {};
    for (const e of expenses) {
      byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    }
    for (const [cat, amt] of Object.entries(byCat)) {
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(amt);
    }
  }

  const predictions: { category: string; predicted: number; trend: number; confidence: number }[] = [];
  for (const [cat, values] of Object.entries(categories)) {
    const points = values.map((v, i) => ({ x: i, y: v }));
    const { m, b } = linearRegression(points);
    const r2 = rSquared(points, m, b);
    const ma = movingAverage(values, 3);
    const predicted = values.length >= 3 ? m * values.length + b * 0.4 + ma * 0.6 : ma;
    predictions.push({
      category: cat,
      predicted: Math.round(predicted),
      trend: Math.round(m),
      confidence: Math.round(r2 * 100) / 100,
    });
  }

  return predictions.sort((a, b) => b.predicted - a.predicted);
}
