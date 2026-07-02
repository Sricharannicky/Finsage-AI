"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Target, Plus, Trash2, Pencil, Trophy, Calendar, TrendingUp, Sparkles, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { SAVINGS_GOAL_CATEGORIES, formatCurrency, formatDate } from "@/lib/constants";
import { toast } from "sonner";
import type { SavingsGoal } from "@/lib/types";

export function GoalView() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [contributeId, setContributeId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");

  // form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    setLoading(true);
    try {
      const res = await api.get<{ goals: SavingsGoal[] }>("/api/goals");
      setGoals(res.goals);
    } catch (err: any) {
      toast.error(err.message || "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(undefined);
    setTitle(""); setCategory(""); setTargetAmount(""); setCurrentAmount(""); setDeadline(""); setPriority("medium");
    setDialogOpen(true);
  }

  function openEdit(g: SavingsGoal) {
    setEditing(g);
    setTitle(g.title); setCategory(g.category); setTargetAmount(g.targetAmount.toString());
    setCurrentAmount(g.currentAmount.toString());
    setDeadline(g.deadline ? new Date(g.deadline).toISOString().split("T")[0] : "");
    setPriority(g.priority);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!title || !category || !targetAmount) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const body = {
        title, category,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount || "0"),
        deadline: deadline || null,
        priority,
      };
      if (editing) {
        await api.put("/api/goals", { id: editing.id, ...body });
        toast.success("Goal updated");
      } else {
        await api.post("/api/goals", body);
        toast.success("Goal created");
      }
      setDialogOpen(false);
      loadGoals();
    } catch (err: any) {
      toast.error(err.message || "Failed to save goal");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/api/goals?id=${deleteId}`);
      toast.success("Goal deleted");
      setDeleteId(null);
      loadGoals();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  }

  async function handleContribute() {
    if (!contributeId || !contributeAmount) return;
    const goal = goals.find((g) => g.id === contributeId);
    if (!goal) return;
    try {
      const newAmount = goal.currentAmount + parseFloat(contributeAmount);
      await api.put("/api/goals", { id: goal.id, currentAmount: newAmount });
      toast.success(`Added ${formatCurrency(parseFloat(contributeAmount))} to ${goal.title}`);
      setContributeId(null);
      setContributeAmount("");
      loadGoals();
    } catch (err: any) {
      toast.error(err.message || "Failed to contribute");
    }
  }

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const completedCount = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings Goals"
        subtitle="Set targets and track your progress"
        icon={Target}
        actions={
          <Button size="sm" className="gap-1.5 gradient-emerald text-white border-0" onClick={openAdd}>
            <Plus className="size-3.5" /> New Goal
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-emerald opacity-95" />
          <CardContent className="relative p-5 text-white">
            <p className="text-xs text-white/80 uppercase tracking-wider">Total Saved</p>
            <p className="text-2xl lg:text-3xl font-bold mt-1">{formatCurrency(totalSaved)}</p>
            <p className="text-xs text-white/70 mt-2">across {goals.length} goals</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-amber opacity-95" />
          <CardContent className="relative p-5 text-white">
            <p className="text-xs text-white/80 uppercase tracking-wider">Total Target</p>
            <p className="text-2xl lg:text-3xl font-bold mt-1">{formatCurrency(totalTarget)}</p>
            <p className="text-xs text-white/70 mt-2">
              {totalTarget > 0 ? `${((totalSaved / totalTarget) * 100).toFixed(0)}% complete` : "Set a goal"}
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-violet opacity-95" />
          <CardContent className="relative p-5 text-white">
            <p className="text-xs text-white/80 uppercase tracking-wider">Completed</p>
            <p className="text-2xl lg:text-3xl font-bold mt-1">{completedCount}</p>
            <p className="text-xs text-white/70 mt-2">{goals.length - completedCount} in progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals grid */}
      {loading ? (
        <LoadingState />
      ) : goals.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent>
            <EmptyState
              icon={Target}
              title="No savings goals yet"
              description="Create your first goal — a laptop, vacation, emergency fund, or anything you're saving for"
              action={<Button size="sm" className="gradient-emerald text-white border-0 gap-1.5" onClick={openAdd}><Plus className="size-3.5" /> New Goal</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((g, i) => {
            const progress = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const completed = g.currentAmount >= g.targetAmount;
            const deadlineDate = g.deadline ? new Date(g.deadline) : null;
            const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            const monthlyNeeded = daysLeft && daysLeft > 0 && remaining > 0 ? remaining / (daysLeft / 30) : 0;

            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden ${completed ? "border-emerald-500/40" : ""}`}>
                  {completed && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
                      <Trophy className="size-3" /> COMPLETED
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{g.title}</CardTitle>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(g)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-rose-500 hover:text-rose-600" onClick={() => setDeleteId(g.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] py-0">{g.category}</Badge>
                      <Badge variant="outline" className={`text-[10px] py-0 ${
                        g.priority === "high" ? "text-rose-500 border-rose-500/30" :
                        g.priority === "medium" ? "text-amber-500 border-amber-500/30" :
                        "text-emerald-500 border-emerald-500/30"
                      }`}>{g.priority}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-semibold">{formatCurrency(g.currentAmount)}</span>
                        <span className="text-muted-foreground text-xs">of {formatCurrency(g.targetAmount)}</span>
                      </div>
                      <Progress value={progress} className={`h-2.5 ${completed ? "[&>div]:bg-emerald-500" : ""}`} />
                      <p className="text-xs text-muted-foreground mt-1.5 text-right">{progress.toFixed(0)}% complete</p>
                    </div>

                    {deadlineDate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="size-3.5" />
                        <span>Due {formatDate(g.deadline)}</span>
                        {daysLeft !== null && !completed && (
                          <Badge variant="outline" className={`ml-auto text-[10px] py-0 ${daysLeft < 30 ? "text-amber-500 border-amber-500/30" : ""}`}>
                            {daysLeft > 0 ? `${daysLeft}d left` : "Overdue"}
                          </Badge>
                        )}
                      </div>
                    )}

                    {!completed && monthlyNeeded > 0 && (
                      <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs">
                        <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <TrendingUp className="size-3.5" />
                          Save {formatCurrency(monthlyNeeded)}/mo to finish on time
                        </p>
                      </div>
                    )}

                    {!completed && (
                      <Button size="sm" variant="outline" className="w-full gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => { setContributeId(g.id); setContributeAmount(""); }}>
                        <Sparkles className="size-3.5 text-emerald-500" /> Add Funds
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Goal" : "New Savings Goal"}</DialogTitle>
            <DialogDescription>{editing ? "Update your savings goal" : "Create a new target to save toward"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Goal Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New Laptop" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {SAVINGS_GOAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Amount (₹) *</Label>
                <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="50000" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Already Saved (₹)</Label>
                <Input type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="0" className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Date</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="gradient-emerald text-white border-0" onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={!!contributeId} onOpenChange={(o) => !o && setContributeId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Funds to Goal</DialogTitle>
            <DialogDescription>Record a contribution toward this savings goal</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Amount (₹)</Label>
            <Input type="number" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} placeholder="5000" className="h-10" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributeId(null)}>Cancel</Button>
            <Button className="gradient-emerald text-white border-0" onClick={handleContribute}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the savings goal and its progress.</AlertDialogDescription>
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
