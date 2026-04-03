import { useMemo } from "react";
import { TrendingUp, Users, FileIcon, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { aestheticTooltipStyle, aestheticAxisTick, ChartGradient } from "@/components/ui/aesthetic-chart";

interface Props {
  users: any[];
  allFiles: any[];
  activity: any[];
}

export function AdminDashboardCharts({ users, allFiles, activity }: Props) {
  // Signups over time (last 30 days)
  const signupData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      days[key] = 0;
    }
    (users ?? []).forEach((u: any) => {
      const d = new Date(u.created_at);
      if (now - d.getTime() <= 30 * 86400000) {
        const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (key in days) days[key]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({ date, signups: count }));
  }, [users]);

  // Uploads per day (last 30 days)
  const uploadData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      days[key] = 0;
    }
    (allFiles ?? []).forEach((f: any) => {
      const d = new Date(f.created_at);
      if (now - d.getTime() <= 30 * 86400000) {
        const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (key in days) days[key]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({ date, uploads: count }));
  }, [allFiles]);

  // Activity per day (last 14 days)
  const activityData = useMemo(() => {
    const days: Record<string, { actions: number; uniqueUsers: Set<string> }> = {};
    const now = Date.now();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      days[key] = { actions: 0, uniqueUsers: new Set() };
    }
    (activity ?? []).forEach((a: any) => {
      const d = new Date(a.created_at);
      if (now - d.getTime() <= 14 * 86400000) {
        const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (key in days) {
          days[key].actions++;
          days[key].uniqueUsers.add(a.user_id);
        }
      }
    });
    return Object.entries(days).map(([date, data]) => ({ date, actions: data.actions, activeUsers: data.uniqueUsers.size }));
  }, [activity]);

  // Summary stats
  const last7dSignups = signupData.slice(-7).reduce((s, d) => s + d.signups, 0);
  const last7dUploads = uploadData.slice(-7).reduce((s, d) => s + d.uploads, 0);
  const todayActions = activityData.length > 0 ? activityData[activityData.length - 1].actions : 0;
  const todayActiveUsers = activityData.length > 0 ? activityData[activityData.length - 1].activeUsers : 0;

  const chartStyle = aestheticAxisTick;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4.5 h-4.5 text-primary" />
          Dashboard Charts
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visual analytics for user growth, file uploads, and platform activity over time.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Charts update in real-time as new data flows in. Use these trends to identify growth patterns,
          peak usage times, and potential capacity issues. Data shown for the last 30 days (signups & uploads) and 14 days (activity).
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Signups (7d)", value: String(last7dSignups), icon: Users, accent: "text-primary" },
          { label: "Uploads (7d)", value: String(last7dUploads), icon: FileIcon, accent: "text-chart-1" },
          { label: "Actions Today", value: String(todayActions), icon: Activity, accent: "text-chart-2" },
          { label: "Active Today", value: String(todayActiveUsers), icon: Users, accent: "text-chart-3" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="p-3 rounded-xl border border-border bg-card">
            <stat.icon className={cn("w-4 h-4 mb-1.5", stat.accent)} />
            <p className="text-lg font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Signups Chart */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> User Signups — Last 30 Days
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">New user registrations per day. Helps track organic growth and the effectiveness of campaigns or features launches.</p>
        </div>
        <div className="h-48 md:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={signupData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <ChartGradient id="signupGrad" color="hsl(var(--primary))" opacity={0.4} />
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis dataKey="date" tick={chartStyle} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis tick={chartStyle} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={aestheticTooltipStyle} />
              <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="url(#signupGrad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Uploads Chart */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileIcon className="w-4 h-4 text-chart-1" /> File Uploads — Last 30 Days
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Daily file upload volume. Spikes indicate high engagement or bulk upload sessions. Monitor for capacity planning.</p>
        </div>
        <div className="h-48 md:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={uploadData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <ChartGradient id="uploadGrad" color="hsl(var(--chart-1))" opacity={0.35} />
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis dataKey="date" tick={chartStyle} interval="preserveStartEnd" axisLine={false} tickLine={false} />
              <YAxis tick={chartStyle} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={aestheticTooltipStyle} />
              <Area type="monotone" dataKey="uploads" stroke="hsl(var(--chart-1))" fill="url(#uploadGrad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Users Chart */}
      <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-chart-2" /> Platform Activity — Last 14 Days
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total actions (uploads, downloads, shares, renames) and unique active users per day. Indicates platform health and engagement depth.</p>
        </div>
        <div className="h-48 md:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <ChartGradient id="actionsGrad" color="hsl(var(--chart-2))" opacity={0.35} />
                <ChartGradient id="usersGrad" color="hsl(var(--chart-3))" opacity={0.3} />
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis dataKey="date" tick={chartStyle} axisLine={false} tickLine={false} />
              <YAxis tick={chartStyle} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={aestheticTooltipStyle} />
              <Area type="monotone" dataKey="actions" stroke="hsl(var(--chart-2))" fill="url(#actionsGrad)" strokeWidth={2.5} dot={false} name="Actions" />
              <Area type="monotone" dataKey="activeUsers" stroke="hsl(var(--chart-3))" fill="url(#usersGrad)" strokeWidth={2.5} dot={false} name="Active Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
