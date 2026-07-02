import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

// Multi-currency support: provides exchange rates relative to INR (base)
// Uses static rates with a note that in production these would be fetched from an API
// Rates are approximate as of 2024 and suitable for demo purposes

const EXCHANGE_RATES: Record<string, { rate: number; symbol: string; name: string }> = {
  INR: { rate: 1, symbol: "₹", name: "Indian Rupee" },
  USD: { rate: 0.012, symbol: "$", name: "US Dollar" },
  EUR: { rate: 0.011, symbol: "€", name: "Euro" },
  GBP: { rate: 0.0094, symbol: "£", name: "British Pound" },
  JPY: { rate: 1.78, symbol: "¥", name: "Japanese Yen" },
  AUD: { rate: 0.018, symbol: "A$", name: "Australian Dollar" },
  CAD: { rate: 0.016, symbol: "C$", name: "Canadian Dollar" },
  SGD: { rate: 0.016, symbol: "S$", name: "Singapore Dollar" },
  AED: { rate: 0.044, symbol: "د.إ", name: "UAE Dirham" },
  CNY: { rate: 0.087, symbol: "¥", name: "Chinese Yuan" },
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    base: "INR",
    userCurrency: user.currency,
    rates: EXCHANGE_RATES,
    lastUpdated: new Date().toISOString(),
    note: "Rates are approximate for demo purposes. In production, fetch from a live FX API.",
  });
}

// Helper to convert amount from INR to target currency
export function convertFromINR(amountInINR: number, targetCurrency: string): number {
  const rate = EXCHANGE_RATES[targetCurrency]?.rate || 1;
  return amountInINR * rate;
}

// Helper to format amount in a specific currency
export function formatInCurrency(amountInINR: number, currency: string): string {
  const converted = convertFromINR(amountInINR, currency);
  const symbol = EXCHANGE_RATES[currency]?.symbol || "₹";
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Math.abs(converted));
  return `${amountInINR < 0 ? "-" : ""}${symbol}${formatted}`;
}
