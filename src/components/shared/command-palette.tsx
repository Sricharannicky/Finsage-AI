"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup,
  CommandItem, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, PiggyBank, Target,
  Bot, Sparkles, Layers, BarChart3, Settings, Moon, Sun, Plus, FileDown, Upload,
  TrendingUp, Home, CalendarDays, Receipt, Trophy, Wallet, Landmark,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { ViewType } from "@/components/layout/app-shell";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: ViewType) => void;
  onQuickAdd?: (type: "income" | "expense" | "import") => void;
}

export function CommandPalette({ open, onOpenChange, onNavigate, onQuickAdd }: CommandPaletteProps) {
  const { theme, setTheme } = useTheme();

  const navItems: { id: ViewType; label: string; icon: any; desc: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & insights" },
    { id: "transactions", label: "All Transactions", icon: ArrowLeftRight, desc: "Income & expenses" },
    { id: "income", label: "Income", icon: ArrowDownCircle, desc: "Manage earnings" },
    { id: "expenses", label: "Expenses", icon: ArrowUpCircle, desc: "Track spending" },
    { id: "budgets", label: "Budgets", icon: PiggyBank, desc: "Plan spending" },
    { id: "goals", label: "Savings Goals", icon: Target, desc: "Track targets" },
    { id: "bills", label: "Bills & Subscriptions", icon: Receipt, desc: "Due date reminders" },
    { id: "investments", label: "Investments", icon: TrendingUp, desc: "Portfolio tracker" },
    { id: "networth", label: "Net Worth", icon: Wallet, desc: "Complete financial picture" },
    { id: "tax", label: "Tax Advisor", icon: Landmark, desc: "Section 80C/80D savings" },
    { id: "advisor", label: "AI Advisor", icon: Bot, desc: "Chat with FinSage" },
    { id: "insights", label: "AI Insights", icon: Sparkles, desc: "Analysis & predictions" },
    { id: "categories", label: "Categories", icon: Layers, desc: "Category analytics" },
    { id: "calendar", label: "Spending Calendar", icon: CalendarDays, desc: "Daily heatmap" },
    { id: "reports", label: "Reports", icon: BarChart3, desc: "Trends & export" },
    { id: "achievements", label: "Achievements", icon: Trophy, desc: "Financial milestones" },
    { id: "settings", label: "Settings", icon: Settings, desc: "Profile & preferences" },
  ];

  function run(action: () => void) {
    onOpenChange(false);
    setTimeout(action, 50);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, actions, or ask FinSage..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {onQuickAdd && (
            <CommandItem onSelect={() => run(() => onQuickAdd("expense"))} className="gap-2">
              <div className="size-7 rounded-lg bg-rose-500/15 flex items-center justify-center">
                <Plus className="size-3.5 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Add Expense</p>
                <p className="text-xs text-muted-foreground">Record a new expense</p>
              </div>
              <CommandShortcut>E</CommandShortcut>
            </CommandItem>
          )}
          {onQuickAdd && (
            <CommandItem onSelect={() => run(() => onQuickAdd("income"))} className="gap-2">
              <div className="size-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Plus className="size-3.5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Add Income</p>
                <p className="text-xs text-muted-foreground">Record new income</p>
              </div>
              <CommandShortcut>I</CommandShortcut>
            </CommandItem>
          )}
          {onQuickAdd && (
            <CommandItem onSelect={() => run(() => onQuickAdd("import"))} className="gap-2">
              <div className="size-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Upload className="size-3.5 text-violet-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Import CSV</p>
                <p className="text-xs text-muted-foreground">Bulk import transactions</p>
              </div>
            </CommandItem>
          )}
          <CommandItem onSelect={() => run(() => onNavigate("advisor"))} className="gap-2">
            <div className="size-7 rounded-lg gradient-emerald flex items-center justify-center">
              <Bot className="size-3.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Ask AI Advisor</p>
              <p className="text-xs text-muted-foreground">Chat with FinSage</p>
            </div>
            <CommandShortcut>A</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => window.open("/api/reports/pdf", "_blank"))} className="gap-2">
            <div className="size-7 rounded-lg bg-rose-500/15 flex items-center justify-center">
              <FileDown className="size-3.5 text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Download PDF Report</p>
              <p className="text-xs text-muted-foreground">Generate monthly PDF</p>
            </div>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={() => run(() => onNavigate(item.id))}
              className="gap-2"
            >
              <item.icon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{item.desc}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Preferences">
          <CommandItem onSelect={() => run(() => setTheme(theme === "dark" ? "light" : "dark"))} className="gap-2">
            {theme === "dark" ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4 text-violet-500" />}
            <span className="text-sm font-medium">Switch to {theme === "dark" ? "Light" : "Dark"} Mode</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
