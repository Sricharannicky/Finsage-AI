import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCurrentMonthKey, getMonthsAgo, getMonthRange } from "@/lib/finance";

const EXPENSE_CATS = ["Food", "Travel", "Shopping", "Healthcare", "Entertainment", "Education", "Rent", "Utilities", "EMI", "Insurance", "Investment", "Others"];
const INCOME_CATS = ["Salary", "Business", "Freelancing", "Investment", "Bonus", "Interest", "Other"];
const PAY_METHODS = ["Cash", "Credit Card", "Debit Card", "UPI", "Net Banking", "Wallet"];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if already has data
  const existingExpenses = await db.expense.count({ where: { userId: user.id } });
  if (existingExpenses > 5) {
    return NextResponse.json({ message: "Already has data", count: existingExpenses });
  }

  // Generate 4 months of historical data + current month
  const now = new Date();
  const created: { incomes: number; expenses: number; budgets: number; goals: number } = { incomes: 0, expenses: 0, budgets: 0, goals: 0 };

  for (let mo = 4; mo >= 0; mo--) {
    const mk = mo === 0 ? getCurrentMonthKey() : getMonthsAgo(mo);
    const { start, end } = getMonthRange(mk);

    // Monthly salary income
    await db.income.create({
      data: {
        userId: user.id,
        amount: rand(55000, 95000),
        source: "Monthly Salary",
        category: "Salary",
        date: new Date(start.getFullYear(), start.getMonth(), rand(1, 5)),
        note: "Monthly salary",
        recurring: true,
      },
    });
    created.incomes++;

    // Occasional income
    if (Math.random() > 0.5) {
      await db.income.create({
        data: {
          userId: user.id,
          amount: rand(3000, 15000),
          source: pick(["Freelance project", "Stock dividend", "Referral bonus", "Interest payout"]),
          category: pick(["Freelancing", "Investment", "Bonus", "Interest"]),
          date: new Date(start.getFullYear(), start.getMonth(), rand(10, 25)),
          note: "Extra income",
        },
      });
      created.incomes++;
    }

    // Recurring expenses
    const recurringExpenses = [
      { category: "Rent", amount: rand(14000, 22000), note: "Monthly rent" },
      { category: "Utilities", amount: rand(1800, 3500), note: "Electricity & water" },
      { category: "Insurance", amount: rand(1500, 3500), note: "Health insurance" },
      { category: "EMI", amount: Math.random() > 0.5 ? rand(5000, 12000) : 0, note: "Loan EMI" },
      { category: "Investment", amount: rand(5000, 10000), note: "SIP investment" },
    ];
    for (const re of recurringExpenses) {
      if (re.amount === 0) continue;
      await db.expense.create({
        data: {
          userId: user.id,
          amount: re.amount,
          category: re.category,
          date: new Date(start.getFullYear(), start.getMonth(), rand(1, 10)),
          note: re.note,
          paymentMethod: "Auto",
          recurring: true,
        },
      });
      created.expenses++;
    }

    // Random daily expenses
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const endDate = mo === 0 ? now : end;
    const numDays = Math.min(daysInMonth, Math.floor((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const numTransactions = rand(20, 40);
    for (let i = 0; i < numTransactions; i++) {
      const day = rand(1, Math.max(1, numDays));
      const cat = pick(EXPENSE_CATS.filter((c) => !["Rent", "Utilities", "Insurance", "EMI", "Investment"].includes(c)));
      let amount = rand(100, 3000);
      if (cat === "Food") amount = rand(80, 1200);
      if (cat === "Travel") amount = rand(150, 2500);
      if (cat === "Shopping") amount = rand(300, 8000);
      if (cat === "Healthcare") amount = rand(200, 5000);
      if (cat === "Entertainment") amount = rand(200, 2000);
      if (cat === "Education") amount = rand(500, 4000);

      const txDate = new Date(start.getFullYear(), start.getMonth(), day, rand(8, 23), rand(0, 59));
      await db.expense.create({
        data: {
          userId: user.id,
          amount,
          category: cat,
          date: txDate,
          note: pick([
            `${cat} purchase`,
            `${cat} - ${pick(["grocery", "online", "local store", "subscription", "weekly"])}`,
            "",
          ]),
          paymentMethod: pick(PAY_METHODS),
          recurring: false,
        },
      });
      created.expenses++;
    }

    // Set budgets for current month only
    if (mo === 0) {
      const budgetCats = ["Food", "Travel", "Shopping", "Entertainment", "Healthcare", "Education", "Rent", "Utilities"];
      for (const cat of budgetCats) {
        const amount = cat === "Rent" ? rand(14000, 22000)
          : cat === "Food" ? rand(8000, 12000)
          : cat === "Utilities" ? rand(2000, 4000)
          : cat === "Shopping" ? rand(5000, 8000)
          : cat === "Travel" ? rand(3000, 6000)
          : cat === "Entertainment" ? rand(2000, 4000)
          : cat === "Healthcare" ? rand(2000, 4000)
          : rand(1500, 3000);
        await db.budget.create({
          data: { userId: user.id, category: cat, amount, period: "monthly", month: mk },
        });
        created.budgets++;
      }
    }
  }

  // Sample savings goals
  const goals = [
    { title: "Emergency Fund", category: "Emergency Fund", targetAmount: 150000, currentAmount: rand(20000, 60000), priority: "high", deadline: null },
    { title: "New Laptop", category: "Electronics", targetAmount: 90000, currentAmount: rand(30000, 70000), priority: "medium", deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90) },
    { title: "Vacation to Goa", category: "Vacation", targetAmount: 50000, currentAmount: rand(5000, 25000), priority: "low", deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120) },
  ];
  for (const g of goals) {
    await db.savingsGoal.create({
      data: { userId: user.id, ...g },
    });
    created.goals++;
  }

  // Sample bills
  const bills = [
    { name: "House Rent", amount: 18000, category: "Rent", dueDay: 1, frequency: "monthly", autoPay: true, note: "Monthly rent" },
    { name: "Netflix Subscription", amount: 649, category: "Entertainment", dueDay: 15, frequency: "monthly", autoPay: true, note: "Premium plan" },
    { name: "Electricity Bill", amount: 2200, category: "Utilities", dueDay: 20, frequency: "monthly", autoPay: false },
    { name: "Mobile Recharge", amount: 399, category: "Utilities", dueDay: 5, frequency: "monthly", autoPay: true },
    { name: "Gym Membership", amount: 1500, category: "Healthcare", dueDay: 10, frequency: "monthly", autoPay: false },
    { name: "Internet Bill", amount: 1199, category: "Utilities", dueDay: 25, frequency: "monthly", autoPay: true },
  ];
  for (const b of bills) {
    const next = new Date();
    next.setDate(b.dueDay);
    if (next < new Date()) next.setMonth(next.getMonth() + 1);
    await db.bill.create({
      data: { userId: user.id, ...b, nextDueDate: next, paid: false },
    });
  }

  // Sample investments
  const investments = [
    { name: "Nifty 50 Index Fund", type: "mutual_fund", investedAmount: 50000, currentValue: 62000, units: 1240, purchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180) },
    { name: "HDFC Balanced Fund", type: "mutual_fund", investedAmount: 30000, currentValue: 33500, units: 850, purchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120) },
    { name: "SBI Fixed Deposit", type: "fixed_deposit", investedAmount: 100000, currentValue: 107500, units: 0, purchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365) },
    { name: "Gold ETF", type: "etf", investedAmount: 20000, currentValue: 23800, units: 4.5, purchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90) },
    { name: "PPF Account", type: "ppf", investedAmount: 150000, currentValue: 168000, units: 0, purchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 400) },
  ];
  for (const inv of investments) {
    await db.investment.create({
      data: { userId: user.id, ...inv, note: null },
    });
  }

  // Welcome notification
  await db.notification.create({
    data: {
      userId: user.id,
      type: "ai_tip",
      title: "Welcome to FinSage AI",
      message: "Sample data has been loaded. Explore your dashboard, ask the AI advisor, and review your financial health score.",
      severity: "success",
    },
  });

  return NextResponse.json({ success: true, created });
}
