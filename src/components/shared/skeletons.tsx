"use client";

import { motion } from "framer-motion";

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border bg-card shadow-sm overflow-hidden ${className}`}>
      <div className="p-5 space-y-3">
        <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
        <div className="h-7 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-2 w-1/2 bg-muted/70 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <div className="size-9 rounded-lg bg-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
            <div className="h-2 w-1/2 bg-muted/70 rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 bg-muted/50 rounded-t"
          initial={{ height: "20%" }}
          animate={{ height: `${30 + Math.random() * 60}%` }}
          transition={{ duration: 0.8, delay: i * 0.05, repeat: Infinity, repeatType: "reverse" }}
        />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border-0 shadow-lg overflow-hidden">
      <div className="p-5 space-y-2 bg-muted h-[120px]">
        <div className="h-2.5 w-1/4 bg-muted-foreground/30 rounded animate-pulse" />
        <div className="h-7 w-2/3 bg-muted-foreground/30 rounded animate-pulse mt-2" />
        <div className="h-2 w-1/3 bg-muted-foreground/20 rounded animate-pulse mt-2" />
      </div>
    </div>
  );
}
