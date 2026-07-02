// Shared types for the AI Personal Budget Planning Agent

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  currency: string;
  monthlyIncomeGoal: number;
  savingsTarget: number;
  createdAt: string;
}

export type IncomeCategory =
  | "Salary"
  | "Business"
  | "Freelancing"
  | "Investment"
  | "Bonus"
  | "Interest"
  | "Other";

export type ExpenseCategory =
  | "Food"
  | "Travel"
  | "Shopping"
  | "Healthcare"
  | "Entertainment"
  | "Education"
  | "Rent"
  | "Utilities"
  | "EMI"
  | "Insurance"
  | "Investment"
  | "Others";

export interface Income {
  id: string;
  userId: string;
  amount: number;
  source: string;
  category: IncomeCategory;
  date: string;
  note: string | null;
  recurring: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  note: string | null;
  paymentMethod: string;
  recurring: boolean;
  flagged: boolean;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  period: "weekly" | "monthly";
  month: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  severity: "info" | "warning" | "success" | "danger";
  createdAt: string;
}

export interface Prediction {
  id: string;
  userId: string;
  type: string;
  value: number;
  confidence: number;
  month: string;
  details: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  remainingBalance: number;
  monthlyBudget: number;
  monthlySavings: number;
  savingsRate: number;
  healthScore: number;
  healthGrade: string;
  recentTransactions: RecentTransaction[];
  incomeTrend: { month: string; income: number; expense: number }[];
  categoryBreakdown: { category: string; amount: number; color: string }[];
  goalsProgress: { title: string; progress: number; target: number; current: number }[];
  aiSuggestions: string[];
}

export interface RecentTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note: string | null;
}

export interface FinancialContext {
  totalIncome: number;
  totalExpense: number;
  remainingBalance: number;
  savingsRate: number;
  monthlyBudget: number;
  categorySpending: Record<string, number>;
  recentTransactions: RecentTransaction[];
  goals: SavingsGoal[];
  healthScore: number;
}
