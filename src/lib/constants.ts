import type { ExpenseCategory, IncomeCategory } from "./types";

export const INCOME_CATEGORIES: { value: IncomeCategory; label: string; icon: string }[] = [
  { value: "Salary", label: "Salary", icon: "💼" },
  { value: "Business", label: "Business", icon: "🏢" },
  { value: "Freelancing", label: "Freelancing", icon: "💻" },
  { value: "Investment", label: "Investment", icon: "📈" },
  { value: "Bonus", label: "Bonus", icon: "🎁" },
  { value: "Interest", label: "Interest", icon: "🏦" },
  { value: "Other", label: "Other", icon: "💰" },
];

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string; color: string }[] = [
  { value: "Food", label: "Food", icon: "🍽️", color: "#f97316" },
  { value: "Travel", label: "Travel", icon: "✈️", color: "#06b6d4" },
  { value: "Shopping", label: "Shopping", icon: "🛍️", color: "#ec4899" },
  { value: "Healthcare", label: "Healthcare", icon: "🏥", color: "#ef4444" },
  { value: "Entertainment", label: "Entertainment", icon: "🎬", color: "#a855f7" },
  { value: "Education", label: "Education", icon: "📚", color: "#3b82f6" },
  { value: "Rent", label: "Rent", icon: "🏠", color: "#14b8a6" },
  { value: "Utilities", label: "Utilities", icon: "💡", color: "#eab308" },
  { value: "EMI", label: "EMI", icon: "💳", color: "#f43f5e" },
  { value: "Insurance", label: "Insurance", icon: "🛡️", color: "#8b5cf6" },
  { value: "Investment", label: "Investment", icon: "📊", color: "#22c55e" },
  { value: "Others", label: "Others", icon: "📦", color: "#64748b" },
];

export const SAVINGS_GOAL_CATEGORIES = [
  "Electronics",
  "Vacation",
  "Emergency Fund",
  "Vehicle",
  "Real Estate",
  "Education",
  "Wedding",
  "Retirement",
  "Other",
];

export const PAYMENT_METHODS = ["Cash", "Credit Card", "Debit Card", "UPI", "Net Banking", "Wallet"];

export const CHART_COLORS = [
  "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4",
  "#ec4899", "#84cc16", "#f97316", "#6366f1", "#14b8a6",
  "#eab308", "#64748b",
];

export function getCategoryColor(category: string): string {
  const found = EXPENSE_CATEGORIES.find((c) => c.value === category);
  if (found) return found.color;
  const idx = EXPENSE_CATEGORIES.length + (category.charCodeAt(0) % CHART_COLORS.length);
  return CHART_COLORS[idx % CHART_COLORS.length];
}

export function getCategoryIcon(category: string): string {
  const found = EXPENSE_CATEGORIES.find((c) => c.value === category);
  return found?.icon ?? "📦";
}

export function formatCurrency(amount: number, currency = "INR"): string {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : ""}${symbol}${formatted}`;
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
