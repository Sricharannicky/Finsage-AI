"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Lock, Star, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Achievement {
  id: string; type: string; title: string; description: string; icon: string;
  unlockedAt: string | null; progress: number;
}
interface AchievementsData {
  achievements: Achievement[];
  newlyUnlocked: Achievement[];
  stats: { unlockedCount: number; totalPossible: number; progressPct: number };
}

export function AchievementsView() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<AchievementsData>("/api/achievements");
      setData(res);
      if (res.newlyUnlocked.length > 0) {
        toast.success(`🏆 ${res.newlyUnlocked.length} new achievement${res.newlyUnlocked.length > 1 ? "s" : ""} unlocked!`);
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState message="Checking achievements..." />;

  const unlocked = data?.achievements.filter((a) => a.progress >= 100) || [];
  const inProgress = data?.achievements.filter((a) => a.progress < 100) || [];
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achievements"
        subtitle="Celebrate your financial milestones"
        icon={Trophy}
      />

      {/* Progress overview */}
      <Card className="shadow-sm relative overflow-hidden border-amber-500/20">
        <div className="absolute inset-0 mesh-bg opacity-50" />
        <CardContent className="relative p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl gradient-amber flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Trophy className="size-8 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.unlockedCount || 0} / {stats?.totalPossible || 0}</p>
                <p className="text-sm text-muted-foreground">Achievements unlocked</p>
              </div>
            </div>
            <div className="w-full sm:w-64">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Overall progress</span>
                <span className="font-semibold">{(stats?.progressPct || 0).toFixed(0)}%</span>
              </div>
              <Progress value={stats?.progressPct || 0} className="h-2.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unlocked achievements */}
      {unlocked.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Star className="size-4 text-amber-500" /> Unlocked ({unlocked.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlocked.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: "spring" }}
              >
                <Card className="shadow-sm border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <div className="size-14 rounded-2xl bg-amber-500/15 flex items-center justify-center text-3xl mx-auto mb-2">
                      {a.icon}
                    </div>
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{a.description}</p>
                    <Badge variant="outline" className="mt-2 text-[9px] py-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <Trophy className="size-2.5 mr-0.5" /> Unlocked
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Lock className="size-4 text-muted-foreground" /> In Progress ({inProgress.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inProgress.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="shadow-sm opacity-75 hover:opacity-100 transition-opacity">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-xl flex-shrink-0 grayscale">
                        {a.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{a.description}</p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{a.progress}%</span>
                          </div>
                          <Progress value={a.progress} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {unlocked.length === 0 && inProgress.length === 0 && (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <Sparkles className="size-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Start adding transactions to unlock achievements!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
