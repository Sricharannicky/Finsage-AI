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
import { ReportsView } from "@/components/reports/reports-view";
import { SettingsView } from "@/components/settings/settings-view";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, hydrated, refresh } = useAuthStore();
  const [activeView, setActiveView] = useState<ViewType>("dashboard");

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Show loading screen until hydration completes
  if (!hydrated) {
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

  if (!user) {
    return <AuthView />;
  }

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
