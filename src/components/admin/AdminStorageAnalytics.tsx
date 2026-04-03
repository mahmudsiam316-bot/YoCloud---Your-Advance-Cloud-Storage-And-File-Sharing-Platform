import { useMemo } from "react";
import { BarChart3, HardDrive, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
  users: any[];
  allFiles: any[];
  userStorageMap: Record<string, number>;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

export function AdminStorageAnalytics({ users, allFiles, userStorageMap }: Props) {
  const totalStorage = useMemo(() =>
    (allFiles ?? []).reduce((s, f: any) => s + (f.size || 0), 0), [allFiles]);

  const topConsumers = useMemo(() => {
    return (users ?? [])
      .map((u: any) => ({
        id: u.id,
        name: u.display_name || u.email?.split("@")[0] || "Unknown",
        email: u.email,
        used: userStorageMap[u.id] || 0,
        limit: u.storage_limit || 5368709120,
        plan: u.storage_plan,
      }))
      .sort((a, b) => b.used - a.used)
      .slice(0, 20);
  }, [users, userStorageMap]);

  const maxUsed = topConsumers[0]?.used || 1;

  const planBreakdown = useMemo(() => {
    const plans: Record<string, { count: number; totalUsed: number; totalLimit: number }> = {};
    (users ?? []).forEach((u: any) => {
      const plan = u.storage_plan || "free";
      if (!plans[plan]) plans[plan] = { count: 0, totalUsed: 0, totalLimit: 0 };
      plans[plan].count++;
      plans[plan].totalUsed += userStorageMap[u.id] || 0;
      plans[plan].totalLimit += u.storage_limit || 5368709120;
    });
    return plans;
  }, [users, userStorageMap]);

  const avgUsage = (users ?? []).length > 0 ? totalStorage / (users ?? []).length : 0;
  const usersAbove80 = (users ?? []).filter((u: any) => {
    const pct = ((userStorageMap[u.id] || 0) / (u.storage_limit || 5368709120)) * 100;
    return pct > 80;
  }).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5 text-primary" />
          Storage Analytics
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Per-user storage breakdown, top consumers, and plan distribution analysis.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Monitor storage consumption patterns across your user base. Identify heavy users who may need plan upgrades or storage limit adjustments.
          Users consuming over 80% of their quota are flagged for proactive management.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Storage", value: formatSize(totalStorage), icon: HardDrive, accent: "text-primary" },
          { label: "Avg Per User", value: formatSize(avgUsage), icon: TrendingUp, accent: "text-chart-1" },
          { label: "Users >80%", value: String(usersAbove80), icon: Users, accent: "text-destructive" },
          { label: "Total Users", value: String((users ?? []).length), icon: Users, accent: "text-chart-2" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="p-3 rounded-xl border border-border bg-card">
            <stat.icon className={cn("w-4 h-4 mb-2", stat.accent)} />
            <p className="text-lg font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground">Plan Distribution</h3>
        <p className="text-[10px] text-muted-foreground">Storage usage broken down by subscription tier. Shows aggregate consumption and remaining capacity per plan.</p>
        <div className="space-y-2">
          {Object.entries(planBreakdown).map(([plan, data]) => {
            const pct = data.totalLimit > 0 ? (data.totalUsed / data.totalLimit) * 100 : 0;
            return (
              <div key={plan} className="p-3 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize",
                      plan === "premium" ? "bg-chart-3/10 text-chart-3" : "bg-secondary text-muted-foreground"
                    )}>{plan}</span>
                    <span className="text-[11px] text-muted-foreground">{data.count} users</span>
                  </div>
                  <span className="text-xs font-mono text-foreground">{formatSize(data.totalUsed)} / {formatSize(data.totalLimit)}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", pct > 80 ? "bg-destructive" : "bg-primary")}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, 0.5)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(1)}% utilized</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top consumers */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground">Top Storage Consumers</h3>
        <p className="text-[10px] text-muted-foreground">Users ranked by storage usage. Bar width is relative to the highest consumer for easy visual comparison.</p>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {topConsumers.map((user, i) => {
            const pct = (user.used / user.limit) * 100;
            const barWidth = (user.used / maxUsed) * 100;
            return (
              <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="p-2.5 rounded-lg border border-border/40 hover:border-border bg-card transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-muted-foreground font-mono w-5 shrink-0">#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[11px] font-mono text-foreground">{formatSize(user.used)}</p>
                    <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% of {formatSize(user.limit)}</p>
                  </div>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", pct > 80 ? "bg-destructive" : "bg-primary/70")}
                    style={{ width: `${Math.max(barWidth, 1)}%` }} />
                </div>
              </motion.div>
            );
          })}
          {topConsumers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No storage data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
