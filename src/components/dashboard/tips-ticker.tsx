"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ChevronRight, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ViewType } from "@/components/layout/app-shell";

interface Tip {
  icon: string;
  text: string;
  view?: ViewType;
}

const TIPS: Tip[] = [
  { icon: "💡", text: "Aim to save at least 20% of your income monthly.", view: "insights" },
  { icon: "🛡️", text: "Build an emergency fund covering 3-6 months of expenses.", view: "goals" },
  { icon: "📊", text: "Track every expense for a month — find hidden spending.", view: "expenses" },
  { icon: "🎯", text: "Set SMART financial goals with clear deadlines.", view: "goals" },
  { icon: "💸", text: "Pay yourself first: automate savings on payday.", view: "budgets" },
  { icon: "📉", text: "Cancel subscriptions you haven't used in 30 days.", view: "bills" },
  { icon: "🏦", text: "Start a SIP — ₹1000/month compounds over time.", view: "investments" },
  { icon: "⚖️", text: "Follow the 50/30/20 rule: needs, wants, savings.", view: "benchmark" },
  { icon: "🚫", text: "Wait 48 hours before impulse purchases over ₹2000.", view: "challenges" },
  { icon: "📈", text: "Diversify investments to reduce risk.", view: "investments" },
  { icon: "💳", text: "Keep credit utilization below 30% for good credit score.", view: "benchmark" },
  { icon: "🏆", text: "Take savings challenges to build money habits!", view: "challenges" },
  { icon: "💰", text: "Increase savings rate by 1% every 3 months.", view: "insights" },
  { icon: "📋", text: "Review your budget weekly — catch overspending early.", view: "budgets" },
  { icon: "🌍", text: "Use Section 80C investments to save on taxes.", view: "tax" },
  { icon: "⚡", text: "Monitor your spending velocity daily.", view: "dashboard" },
];

export function TipsTicker({ onViewChange }: { onViewChange: (v: ViewType) => void }) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [dismissed]);

  if (dismissed) return null;

  const tip = TIPS[index];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="shadow-sm border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-violet-500/5 overflow-hidden">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="size-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="size-4 text-amber-500" />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3 }}
              className="flex-1 min-w-0 flex items-center gap-2"
            >
              <span className="text-lg flex-shrink-0">{tip.icon}</span>
              <p className="text-sm leading-relaxed truncate">{tip.text}</p>
            </motion.div>
          </AnimatePresence>
          {tip.view && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0"
              onClick={() => onViewChange(tip.view!)}
            >
              Learn <ChevronRight className="size-3" />
            </Button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground flex-shrink-0 p-1"
          >
            <X className="size-3.5" />
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
