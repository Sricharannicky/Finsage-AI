"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";

interface TransactionDialogProps {
  type: "income" | "expense";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: any;
  onSaved?: () => void;
}

export function TransactionDialog({ type, open, onOpenChange, editing, onSaved }: TransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [recurring, setRecurring] = useState(false);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const endpoint = type === "income" ? "/api/income" : "/api/expenses";

  useEffect(() => {
    if (editing) {
      setAmount(editing.amount.toString());
      setCategory(editing.category);
      if (type === "income") setSource(editing.source || "");
      setNote(editing.note || "");
      setPaymentMethod(editing.paymentMethod || "Cash");
      setRecurring(editing.recurring || false);
      setDate(new Date(editing.date).toISOString().split("T")[0]);
    } else {
      setAmount("");
      setCategory("");
      setSource("");
      setNote("");
      setPaymentMethod("Cash");
      setRecurring(false);
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [editing, open, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const body: any = {
        amount: parseFloat(amount),
        category,
        date,
        note: note || null,
        recurring,
      };
      if (type === "income") body.source = source || category;
      else body.paymentMethod = paymentMethod;

      if (editing) {
        body.id = editing.id;
        await api.put(endpoint, body);
        toast.success(`${type === "income" ? "Income" : "Expense"} updated`);
      } else {
        await api.post(endpoint, body);
        toast.success(`${type === "income" ? "Income" : "Expense"} added`);
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit" : "Add"} {type === "income" ? "Income" : "Expense"}
          </DialogTitle>
          <DialogDescription>
            {editing ? "Update the transaction details" : `Record a new ${type}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount {type === "income" ? "(₹)" : "(₹)"} *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-10"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "income" && (
            <div className="space-y-1.5">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Company name"
                className="h-10"
              />
            </div>
          )}

          {type === "expense" && (
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional details..."
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="recurring" className="text-sm font-medium cursor-pointer">Recurring</Label>
              <p className="text-xs text-muted-foreground">Auto-repeats monthly</p>
            </div>
            <Switch id="recurring" checked={recurring} onCheckedChange={setRecurring} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gradient-emerald text-white border-0">
              {loading ? <Loader2 className="size-4 animate-spin" /> : editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
