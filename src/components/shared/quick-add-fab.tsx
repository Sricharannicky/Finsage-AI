"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ArrowDownCircle, ArrowUpCircle, X, Upload } from "lucide-react";
import { TransactionDialog } from "./transaction-dialog";
import { CsvImportDialog } from "./csv-import-dialog";

interface QuickAddFABProps {
  onTransactionAdded?: () => void;
}

export function QuickAddFAB({ onTransactionAdded }: QuickAddFABProps) {
  const [open, setOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ delay: 0.05 }}
              >
                <button
                  onClick={() => { setImportOpen(true); setOpen(false); }}
                  className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full glass-strong shadow-lg border border-violet-500/30 hover:bg-violet-500/10 transition-colors text-sm font-medium"
                >
                  <div className="size-7 rounded-full bg-violet-500/15 flex items-center justify-center">
                    <Upload className="size-3.5 text-violet-500" />
                  </div>
                  Import CSV
                </button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ delay: 0.1 }}
              >
                <button
                  onClick={() => { setIncomeOpen(true); setOpen(false); }}
                  className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full glass-strong shadow-lg border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors text-sm font-medium"
                >
                  <div className="size-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <ArrowDownCircle className="size-3.5 text-emerald-500" />
                  </div>
                  Add Income
                </button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ delay: 0.15 }}
              >
                <button
                  onClick={() => { setExpenseOpen(true); setOpen(false); }}
                  className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full glass-strong shadow-lg border border-rose-500/30 hover:bg-rose-500/10 transition-colors text-sm font-medium"
                >
                  <div className="size-7 rounded-full bg-rose-500/15 flex items-center justify-center">
                    <ArrowUpCircle className="size-3.5 text-rose-500" />
                  </div>
                  Add Expense
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setOpen(!open)}
          className="size-14 rounded-full gradient-emerald shadow-2xl shadow-emerald-500/30 flex items-center justify-center text-white border-4 border-background"
        >
          <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
            {open ? <X className="size-6" /> : <Plus className="size-6" />}
          </motion.div>
        </motion.button>
      </div>

      <TransactionDialog type="income" open={incomeOpen} onOpenChange={setIncomeOpen} onSaved={onTransactionAdded} />
      <TransactionDialog type="expense" open={expenseOpen} onOpenChange={setExpenseOpen} onSaved={onTransactionAdded} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={onTransactionAdded} />
    </>
  );
}
