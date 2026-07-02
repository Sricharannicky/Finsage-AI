"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Receipt, Plus, Trash2, Pencil, CheckCircle2, Clock, AlertCircle, Calendar,
  Zap, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { EXPENSE_CATEGORIES, formatCurrency, formatDate, getCategoryIcon } from "@/lib/constants";
import { toast } from "sonner";

interface Bill {
  id: string; name: string; amount: number; category: string; dueDay: number;
  nextDueDate: string; frequency: string; paid: boolean; autoPay: boolean; note: string | null;
  diffDays: number; status: "overdue" | "due-soon" | "upcoming" | "paid";
}
interface BillsData {
  bills: Bill[];
  stats: { totalMonthly: number; unpaidTotal: number; overdueCount: number; dueSoonCount: number; total: number };
}

export function BillsView() {
  const [data, setData] = useState<BillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [frequency, setFrequency] = useState("monthly");
  const [autoPay, setAutoPay] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => { loadBills(); }, []);

  async function loadBills() {
    setLoading(true);
    try {
      const res = await api.get<BillsData>("/api/bills");
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(undefined);
    setName(""); setAmount(""); setCategory(""); setDueDay("1"); setFrequency("monthly"); setAutoPay(false); setNote("");
    setDialogOpen(true);
  }
  function openEdit(b: Bill) {
    setEditing(b);
    setName(b.name); setAmount(b.amount.toString()); setCategory(b.category); setDueDay(b.dueDay.toString());
    setFrequency(b.frequency); setAutoPay(b.autoPay); setNote(b.note || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name || !amount || !category) { toast.error("Please fill required fields"); return; }
    try {
      const nextDue = new Date();
      nextDue.setDate(parseInt(dueDay));
      if (nextDue < new Date()) nextDue.setMonth(nextDue.getMonth() + 1);
      const body = { name, amount: parseFloat(amount), category, dueDay: parseInt(dueDay), nextDueDate: nextDue.toISOString(), frequency, autoPay, note: note || null };
      if (editing) {
        await api.put("/api/bills", { id: editing.id, ...body });
        toast.success("Bill updated");
      } else {
        await api.post("/api/bills", body);
        toast.success("Bill added");
      }
      setDialogOpen(false);
      loadBills();
    } catch (err: any) { toast.error(err.message || "Failed to save"); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/api/bills?id=${deleteId}`);
      toast.success("Bill deleted");
      setDeleteId(null);
      loadBills();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handlePay(b: Bill) {
    setPayingId(b.id);
    try {
      await api.post("/api/bills/pay", { id: b.id, createExpense: true });
      toast.success(`Paid ${b.name} — expense recorded`);
      loadBills();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark paid");
    } finally {
      setPayingId(null);
    }
  }

  if (loading) return <LoadingState message="Loading bills..." />;
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills & Subscriptions"
        subtitle="Track recurring bills and never miss a due date"
        icon={Receipt}
        actions={<Button size="sm" className="gap-1.5 gradient-emerald text-white border-0" onClick={openAdd}><Plus className="size-3.5" /> Add Bill</Button>}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-teal opacity-95" />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Monthly Total</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(stats?.totalMonthly || 0)}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-amber opacity-95" />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Unpaid</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(stats?.unpaidTotal || 0)}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-rose opacity-95" />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Overdue</p>
            <p className="text-xl font-bold mt-1">{stats?.overdueCount || 0}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-violet opacity-95" />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Due Soon</p>
            <p className="text-xl font-bold mt-1">{stats?.dueSoonCount || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bills list */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">All Bills</CardTitle></CardHeader>
        <CardContent>
          {!data || data.bills.length === 0 ? (
            <EmptyState icon={Receipt} title="No bills tracked yet"
              description="Add recurring bills like rent, utilities, subscriptions to get reminders before due dates"
              action={<Button size="sm" className="gradient-emerald text-white border-0 gap-1.5" onClick={openAdd}><Plus className="size-3.5" /> Add Bill</Button>} />
          ) : (
            <div className="space-y-2">
              {data.bills.map((b, i) => {
                const config = {
                  overdue: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: AlertCircle, label: "Overdue" },
                  "due-soon": { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock, label: "Due Soon" },
                  upcoming: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Calendar, label: "Upcoming" },
                  paid: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2, label: "Paid" },
                }[b.status];
                const Icon = config.icon;
                return (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${config.border} ${config.bg} group`}>
                    <div className={`size-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${config.bg}`}>
                      {getCategoryIcon(b.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{b.name}</p>
                        {b.autoPay && <Badge variant="outline" className="text-[10px] py-0 gap-0.5"><Zap className="size-2.5" /> Auto</Badge>}
                        <Badge variant="outline" className={`text-[10px] py-0 ${config.color} ${config.border}`}>
                          <Icon className="size-2.5 mr-0.5" /> {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {b.category} · Due day {b.dueDay} · {b.frequency}
                        {b.status !== "paid" && ` · ${b.diffDays < 0 ? `${Math.abs(b.diffDays)}d overdue` : b.diffDays === 0 ? "due today" : `in ${b.diffDays}d`}`}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{formatCurrency(b.amount)}</span>
                    {b.status !== "paid" && (
                      <Button size="sm" variant="outline" className="h-8 gap-1 border-emerald-500/30 hover:bg-emerald-500/10" disabled={payingId === b.id} onClick={() => handlePay(b)}>
                        {payingId === b.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Pay
                      </Button>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(b)}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="size-7 text-rose-500" onClick={() => setDeleteId(b.id)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bill" : "Add Bill"}</DialogTitle>
            <DialogDescription>{editing ? "Update bill details" : "Track a recurring bill or subscription"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Bill Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix, Electricity" className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="499" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Due Day *</Label>
                <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium cursor-pointer">Auto-Pay</Label>
                <p className="text-xs text-muted-foreground">Bill is auto-deducted</p>
              </div>
              <Switch checked={autoPay} onCheckedChange={setAutoPay} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="gradient-emerald text-white border-0" onClick={handleSave}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the bill tracking.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
