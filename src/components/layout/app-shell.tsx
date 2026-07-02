"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, LayoutDashboard, ArrowDownCircle, ArrowUpCircle, PiggyBank, Target,
  Sparkles, BarChart3, Bot, Settings, Bell, Menu, X, LogOut, Sun, Moon,
  Search, ChevronDown, CheckCheck, TrendingUp, AlertTriangle, Info, CheckCircle2, Trash2, ArrowLeftRight, Layers, CalendarDays, Receipt, TrendingUp as TrendingUpIcon, Trophy, Wallet, Landmark, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { QuickAddFAB } from "@/components/shared/quick-add-fab";
import { CommandPalette } from "@/components/shared/command-palette";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/constants";
import { toast } from "sonner";
import type { Notification } from "@/lib/types";

export type ViewType =
  | "dashboard"
  | "transactions"
  | "income"
  | "expenses"
  | "budgets"
  | "goals"
  | "bills"
  | "investments"
  | "networth"
  | "tax"
  | "challenges"
  | "advisor"
  | "insights"
  | "categories"
  | "calendar"
  | "reports"
  | "achievements"
  | "settings";

const NAV_ITEMS: { id: ViewType; label: string; icon: any; description: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & insights" },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight, description: "All income & expenses" },
  { id: "income", label: "Income", icon: ArrowDownCircle, description: "Manage earnings" },
  { id: "expenses", label: "Expenses", icon: ArrowUpCircle, description: "Track spending" },
  { id: "budgets", label: "Budgets", icon: PiggyBank, description: "Plan spending" },
  { id: "goals", label: "Goals", icon: Target, description: "Savings targets" },
  { id: "bills", label: "Bills", icon: Receipt, description: "Reminders & due dates" },
  { id: "investments", label: "Investments", icon: TrendingUpIcon, description: "Portfolio tracker" },
  { id: "networth", label: "Net Worth", icon: Wallet, description: "Complete financial picture" },
  { id: "tax", label: "Tax Advisor", icon: Landmark, description: "Section 80C/80D savings" },
  { id: "challenges", label: "Challenges", icon: Flame, description: "Savings challenges" },
  { id: "advisor", label: "AI Advisor", icon: Bot, description: "Chat with FinSage" },
  { id: "insights", label: "AI Insights", icon: Sparkles, description: "Analysis & predictions" },
  { id: "categories", label: "Categories", icon: Layers, description: "Category drill-down" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, description: "Spending heatmap" },
  { id: "reports", label: "Reports", icon: BarChart3, description: "Trends & export" },
  { id: "achievements", label: "Achievements", icon: Trophy, description: "Financial milestones" },
  { id: "settings", label: "Settings", icon: Settings, description: "Profile & preferences" },
];

interface AppShellProps {
  activeView: ViewType;
  onViewChange: (v: ViewType) => void;
  children: React.ReactNode;
}

export function AppShell({ activeView, onViewChange, children }: AppShellProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function loadNotifications() {
    try {
      const res = await api.get<{ notifications: Notification[] }>("/api/notifications");
      setNotifications(res.notifications);
      setUnreadCount(res.notifications.filter((n) => !n.read).length);
    } catch {}
  }

  // Load notifications periodically
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-generate notifications + recurring transactions + check achievements on mount
  useEffect(() => {
    api.post("/api/notifications").catch(() => {});
    api.post("/api/recurring").catch(() => {});
    api.get("/api/achievements").catch(() => {}); // triggers achievement unlock checks
  }, []);

  async function markAllRead() {
    try {
      await api.post("/api/notifications/read", { all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {}
  }

  async function clearRead() {
    try {
      await api.post("/api/notifications/clear");
      setNotifications((prev) => prev.filter((n) => !n.read));
      toast.success("Read notifications cleared");
    } catch {}
  }

  async function deleteNotification(id: string) {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications((prev) => {
        const next = prev.filter((n) => n.id !== id);
        setUnreadCount(next.filter((n) => !n.read).length);
        return next;
      });
    } catch {}
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNavClick = (v: ViewType) => {
    onViewChange(v);
    setMobileOpen(false);
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 border-r bg-sidebar z-30">
        <SidebarContent activeView={activeView} onNavClick={handleNavClick} user={user} initials={initials} onLogout={logout} />
      </aside>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r z-50 lg:hidden flex flex-col"
            >
              <SidebarContent activeView={activeView} onNavClick={handleNavClick} user={user} initials={initials} onLogout={logout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 border-b glass-strong flex items-center justify-between px-4 lg:px-6 gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 max-w-md flex-1 hover:bg-muted transition-colors text-left"
            >
              <Search className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground flex-1">Search or jump to...</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border bg-background text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full"
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            )}

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative"
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse-glow">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 glass-strong rounded-2xl shadow-xl border overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3 border-b">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        {unreadCount > 0 && <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead} title="Mark all as read">
                            <CheckCheck className="size-3 mr-1" /> Mark read
                          </Button>
                        )}
                        {notifications.some((n) => n.read) && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:text-rose-600" onClick={clearRead} title="Clear read notifications">
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <ScrollArea className="h-[400px]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          <Bell className="size-8 mx-auto mb-2 opacity-30" />
                          No notifications yet
                        </div>
                      ) : (
                        <div className="divide-y">
                          {notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 flex gap-3 hover:bg-accent/50 transition-colors group ${!n.read ? "bg-emerald-500/5" : ""}`}
                            >
                              <div className={`mt-0.5 size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                n.severity === "danger" ? "bg-rose-500/15 text-rose-500" :
                                n.severity === "warning" ? "bg-amber-500/15 text-amber-500" :
                                n.severity === "success" ? "bg-emerald-500/15 text-emerald-500" :
                                "bg-blue-500/15 text-blue-500"
                              }`}>
                                {n.severity === "danger" ? <AlertTriangle className="size-4" /> :
                                 n.severity === "warning" ? <AlertTriangle className="size-4" /> :
                                 n.severity === "success" ? <CheckCircle2 className="size-4" /> :
                                 <Info className="size-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-tight">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-muted-foreground/70 mt-1">{formatRelativeTime(n.createdAt)}</p>
                              </div>
                              {!n.read && <div className="size-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />}
                              <button
                                onClick={() => deleteNotification(n.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 flex-shrink-0 mt-1"
                                title="Delete"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User menu */}
            <Button variant="ghost" className="gap-2 px-2 hover:bg-accent" onClick={() => onViewChange("settings")}>
              <Avatar className="size-8">
                <AvatarFallback className="gradient-emerald text-white text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-tight">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{user?.email}</p>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-5 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mt-auto border-t py-4 px-6 text-center text-xs text-muted-foreground">
          <p>FinSage AI · Personal Budget Planning Agent · Built with Next.js, Prisma & Z.ai LLM</p>
        </footer>
      </div>

      {/* Global Quick Add FAB */}
      <QuickAddFAB />

      {/* Command Palette (Cmd+K) */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNavigate={onViewChange} />
    </div>
  );
}

function SidebarContent({
  activeView,
  onNavClick,
  user,
  initials,
  onLogout,
}: {
  activeView: ViewType;
  onNavClick: (v: ViewType) => void;
  user: any;
  initials: string;
  onLogout: () => Promise<void>;
}) {
  return (
    <>
      <div className="h-16 flex items-center gap-3 px-6 border-b">
        <div className="size-9 rounded-xl gradient-emerald flex items-center justify-center shadow-md shadow-emerald-500/20">
          <Brain className="size-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight">FinSage AI</h1>
          <p className="text-[10px] text-muted-foreground">Budget Planning Agent</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 scrollbar-thin overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-emerald-500/20"
                  : "hover:bg-accent text-foreground/80 hover:text-foreground"
              }`}
            >
              <item.icon className={`size-4.5 ${active ? "" : "text-muted-foreground group-hover:text-foreground"}`} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                <p className={`text-[10px] leading-tight ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {item.description}
                </p>
              </div>
              {active && <motion.div layoutId="navIndicator" className="absolute right-2 size-1.5 rounded-full bg-primary-foreground" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-3.5 text-emerald-500" />
            <span className="text-xs font-medium">AI Insight</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Ask your AI Advisor "Can I afford an iPhone?" for personalized guidance.
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onLogout}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </>
  );
}
