"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { AuthView } from "@/components/auth/auth-view";
import { AppShell, type ViewType } from "@/components/layout/app-shell";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { TransactionsView } from "@/components/transactions/transactions-view";
import { IncomeView } from "@/components/income/income-view";
import { ExpenseView } from "@/components/expenses/expense-view";
import { BudgetView } from "@/components/budgets/budget-view";
import { GoalView } from "@/components/goals/goal-view";
import { AdvisorView } from "@/components/ai/advisor-view";
import { InsightsView } from "@/components/insights/insights-view";
import { CategoriesView } from "@/components/categories/categories-view";
import { CalendarView } from "@/components/calendar/calendar-view";
import { BillsView } from "@/components/bills/bills-view";
import { RecurringView } from "@/components/recurring/recurring-view";
import { DebtPayoffView } from "@/components/debt/debt-payoff-view";
import { InvestmentsView } from "@/components/investments/investments-view";
import { NetWorthView } from "@/components/networth/networth-view";
import { TaxView } from "@/components/tax/tax-view";
import { ChallengesView } from "@/components/challenges/challenges-view";
import { BenchmarkView } from "@/components/benchmark/benchmark-view";
import { CurrencyView } from "@/components/currency/currency-view";
import { ScenarioView } from "@/components/scenario/scenario-view";
import { AchievementsView } from "@/components/achievements/achievements-view";
import { ReportsView } from "@/components/reports/reports-view";
import { SettingsView } from "@/components/settings/settings-view";
import { Loader2 } from "lucide-react";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const refresh = useAuthStore((s) => s.refresh);
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [serverChecked, setServerChecked] = useState(false);

  // Check auth with server ONCE on mount
  useEffect(() => {
    refresh().finally(() => setServerChecked(true));
  }, [refresh]);

  // Show loading until we've checked with the server
  if (!serverChecked || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-2xl gradient-emerald flex items-center justify-center animate-pulse-glow">
            <Loader2 className="size-6 text-white animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading FinSage AI...</p>
        </div>
      </div>
    );
  }

  // If no user after server check, show login
  if (!user) {
    return <AuthView />;
  }

  // User is logged in — render the app
  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardView onViewChange={setActiveView} />;
      case "transactions":
        return <TransactionsView onViewChange={setActiveView} />;
      case "income":
        return <IncomeView />;
      case "expenses":
        return <ExpenseView />;
      case "budgets":
        return <BudgetView />;
      case "goals":
        return <GoalView />;
      case "bills":
        return <BillsView />;
      case "recurring":
        return <RecurringView />;
      case "debt":
        return <DebtPayoffView />;
      case "investments":
        return <InvestmentsView />;
      case "networth":
        return <NetWorthView />;
      case "tax":
        return <TaxView />;
      case "challenges":
        return <ChallengesView />;
      case "benchmark":
        return <BenchmarkView />;
      case "currency":
        return <CurrencyView />;
      case "scenario":
        return <ScenarioView />;
      case "advisor":
        return <AdvisorView />;
      case "insights":
        return <InsightsView />;
      case "categories":
        return <CategoriesView />;
      case "calendar":
        return <CalendarView />;
      case "reports":
        return <ReportsView />;
      case "achievements":
        return <AchievementsView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView onViewChange={setActiveView} />;
    }
  };

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {renderView()}
    </AppShell>
  );
}
