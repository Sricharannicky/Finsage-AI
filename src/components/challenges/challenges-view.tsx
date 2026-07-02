"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Plus, CheckCircle2, X, Flame, Loader2, Zap, Target, Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/constants";
import { toast } from "sonner";

interface Challenge {
  id: string; type: string; title: string; description: string; icon: string;
  targetDays: number; completedDays: number; status: string; startDate: string;
  endDate: string | null; reward: string;
}
interface Template {
  type: string; title: string; description: string; icon: string; targetDays: number; reward: string;
}
interface ChallengesData {
  challenges: Challenge[];
  available: Template[];
  stats: { total: number; active: number; completed: number; abandoned: number };
}

export function ChallengesView() {
  const [data, setData] = useState<ChallengesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<ChallengesData>("/api/challenges");
      setData(res);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function startChallenge(type: string) {
    try {
      await api.post("/api/challenges", { type });
      toast.success("Challenge started! Good luck! 🎯");
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function updateChallenge(id: string, action: string) {
    try {
      await api.put("/api/challenges", { id, action });
      if (action === "complete") toast.success("Challenge completed! 🏆");
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  if (loading) return <LoadingState message="Loading challenges..." />;

  const stats = data?.stats;
  const activeChallenges = data?.challenges.filter((c) => c.status === "active") || [];
  const completedChallenges = data?.challenges.filter((c) => c.status === "completed") || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings Challenges"
        subtitle="Gamified challenges to build better money habits"
        icon={Trophy}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-emerald opacity-95" />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Active</p>
            <p className="text-xl font-bold mt-1">{stats?.active || 0}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-amber opacity-95" />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Completed</p>
            <p className="text-xl font-bold mt-1">{stats?.completed || 0}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-violet opacity-95" />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Total Attempted</p>
            <p className="text-xl font-bold mt-1">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-lg">
          <div className="absolute inset-0 gradient-teal opacity-95" />
          <CardContent className="relative p-4 text-white">
            <p className="text-[10px] text-white/80 uppercase tracking-wider">Badges Earned</p>
            <p className="text-xl font-bold mt-1">{stats?.completed || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active challenges */}
      {activeChallenges.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Flame className="size-4 text-amber-500" /> Active Challenges ({activeChallenges.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeChallenges.map((c, i) => {
              const pct = (c.completedDays / c.targetDays) * 100;
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="shadow-sm border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="size-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-2xl flex-shrink-0">
                          {c.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{c.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{c.completedDays} / {c.targetDays} days</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline" className="text-[10px] py-0 gap-0.5">
                          <Award className="size-2.5" /> {c.reward}
                        </Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => updateChallenge(c.id, "increment")}>
                            <CheckCircle2 className="size-3" /> Day Done
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-500 hover:text-rose-600 px-2">
                                <X className="size-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Abandon this challenge?</AlertDialogTitle>
                                <AlertDialogDescription>You'll lose progress on "{c.title}". This can't be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => updateChallenge(c.id, "abandon")} className="bg-rose-500 hover:bg-rose-600">Abandon</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed challenges */}
      {completedChallenges.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Award className="size-4 text-emerald-500" /> Completed ({completedChallenges.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {completedChallenges.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-sm border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
                  <CardContent className="p-3 text-center">
                    <div className="size-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-2xl mx-auto mb-2">
                      {c.icon}
                    </div>
                    <p className="font-semibold text-xs">{c.title}</p>
                    <Badge variant="outline" className="text-[9px] py-0 mt-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <Trophy className="size-2.5 mr-0.5" /> {c.reward}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Available challenges */}
      {data && data.available.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Zap className="size-4 text-violet-500" /> Available Challenges ({data.available.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.available.map((t, i) => (
              <motion.div key={t.type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-sm hover:shadow-md transition-shadow group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-xl flex-shrink-0">
                        {t.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{t.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] py-0">
                          <Target className="size-2.5 mr-0.5" /> {t.targetDays}d
                        </Badge>
                        <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-500/20">
                          <Award className="size-2.5 mr-0.5" /> {t.reward}
                        </Badge>
                      </div>
                      <Button size="sm" className="h-7 text-xs gap-1 gradient-emerald text-white border-0" onClick={() => startChallenge(t.type)}>
                        <Plus className="size-3" /> Start
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {data && data.challenges.length === 0 && data.available.length === 0 && (
        <Card className="shadow-sm">
          <CardContent>
            <EmptyState icon={Trophy} title="No challenges available" description="Check back later for new savings challenges" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
