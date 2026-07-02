"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="size-10 rounded-xl gradient-emerald flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Icon className="size-5 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  change,
  changeLabel,
  delay = 0,
}: {
  title: string;
  value: string;
  icon: any;
  gradient: string;
  change?: number;
  changeLabel?: string;
  delay?: number;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow group">
        <div className={cn("absolute inset-0 opacity-90", gradient)} />
        <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
        <CardContent className="relative p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/80 uppercase tracking-wider">{title}</p>
              <p className="text-2xl lg:text-3xl font-bold mt-1 tracking-tight">{value}</p>
            </div>
            <div className="size-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Icon className="size-5 text-white" />
            </div>
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-3">
              <span
                className={cn(
                  "text-xs font-semibold px-1.5 py-0.5 rounded-md",
                  isPositive ? "bg-white/20" : "bg-black/20"
                )}
              >
                {isPositive ? "↑" : "↓"} {Math.abs(change)}%
              </span>
              {changeLabel && <span className="text-xs text-white/70">{changeLabel}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="size-10 rounded-full border-3 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: any;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-base mt-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
