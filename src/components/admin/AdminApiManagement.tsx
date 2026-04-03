import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Key, Shield, Activity, Webhook, Ban, TrendingUp, Clock, Search, ChevronDown, ChevronUp, AlertTriangle, DollarSign, Globe, Zap, BarChart3, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { aestheticTooltipStyle, aestheticAxisTick, ChartGradient } from "@/components/ui/aesthetic-chart";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PLAN_COLORS: Record<string, string> = { free: "text-muted-foreground", pro: "text-primary", enterprise: "text-chart-3" };
const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 9, enterprise: 999 };
const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--muted-foreground))"];

type SubTab = "keys" | "subscriptions" | "analytics" | "webhooks" | "health" | "revenue" | "blocklist";

export function AdminApiManagement() {
  const [subTab, setSubTab] = useState<SubTab>("keys");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [planOverride, setPlanOverride] = useState<Record<string, string>>({});
  const [rateOverride, setRateOverride] = useState<Record<string, string>>({});
  const [newBlockedIp, setNewBlockedIp] = useState("");
  const qc = useQueryClient();

  // ─── Data Queries ───
  const { data: allKeys } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allSubs } = useQuery({
    queryKey: ["admin-api-subs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_subscriptions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allLogs } = useQuery({
    queryKey: ["admin-api-logs"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase.from("api_usage_logs").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: allWebhooks } = useQuery({
    queryKey: ["admin-api-webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_webhooks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: apiTransactions } = useQuery({
    queryKey: ["admin-api-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("is_api_plan", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: blockedIps } = useQuery({
    queryKey: ["admin-blocked-ips"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_config").select("*").eq("key", "blocked_ips").maybeSingle();
      if (error) throw error;
      const ips: string[] = data?.value ? JSON.parse(data.value) : [];
      return ips;
    },
  });

  // ─── Mutations ───
  const revokeKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase.from("api_keys").update({ is_active: false }).eq("id", keyId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-api-keys"] }); toast.success("API key revoked by admin"); },
  });

  const activateKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase.from("api_keys").update({ is_active: true }).eq("id", keyId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-api-keys"] }); toast.success("API key re-activated"); },
  });

  const updateSubPlan = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      const { error } = await supabase.from("api_subscriptions").update({ plan, status: "active", updated_at: new Date().toISOString() }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-api-subs"] }); toast.success("Subscription plan updated"); },
  });

  const updateBlockedIps = useMutation({
    mutationFn: async (ips: string[]) => {
      const { data: existing } = await supabase.from("system_config").select("id").eq("key", "blocked_ips").maybeSingle();
      if (existing) {
        const { error } = await supabase.from("system_config").update({ value: JSON.stringify(ips) }).eq("key", "blocked_ips");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("system_config").insert({ key: "blocked_ips", value: JSON.stringify(ips) });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-blocked-ips"] }); },
  });

  // ─── Computed Analytics ───
  const analytics = useMemo(() => {
    const logs = allLogs ?? [];
    const total = logs.length;
    const errors = logs.filter(l => l.status_code >= 400).length;
    const avgTime = total > 0 ? Math.round(logs.reduce((s, l) => s + (l.response_time_ms || 0), 0) / total) : 0;
    const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : "0";

    // Daily breakdown
    const dailyMap: Record<string, { calls: number; errors: number }> = {};
    logs.forEach(l => {
      const day = l.created_at.substring(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { calls: 0, errors: 0 };
      dailyMap[day].calls++;
      if (l.status_code >= 400) dailyMap[day].errors++;
    });
    const daily = Object.entries(dailyMap).map(([date, v]) => ({ date: date.slice(5), ...v })).sort((a, b) => a.date.localeCompare(b.date));

    // Top endpoints
    const epMap: Record<string, { count: number; avgTime: number; times: number[] }> = {};
    logs.forEach(l => {
      if (!epMap[l.endpoint]) epMap[l.endpoint] = { count: 0, avgTime: 0, times: [] };
      epMap[l.endpoint].count++;
      epMap[l.endpoint].times.push(l.response_time_ms || 0);
    });
    const topEndpoints = Object.entries(epMap).map(([ep, v]) => ({
      endpoint: ep, count: v.count,
      avgTime: v.times.length > 0 ? Math.round(v.times.reduce((a, b) => a + b, 0) / v.times.length) : 0,
    })).sort((a, b) => b.count - a.count).slice(0, 8);

    // Status distribution
    const statusMap: Record<string, number> = {};
    logs.forEach(l => {
      const g = l.status_code < 300 ? "2xx Success" : l.status_code < 400 ? "3xx Redirect" : l.status_code < 500 ? "4xx Client Error" : "5xx Server Error";
      statusMap[g] = (statusMap[g] || 0) + 1;
    });
    const statusDist = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // Per-user usage
    const userMap: Record<string, number> = {};
    logs.forEach(l => { userMap[l.user_id] = (userMap[l.user_id] || 0) + 1; });
    const topUsers = Object.entries(userMap).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    return { total, errors, avgTime, errorRate, daily, topEndpoints, statusDist, topUsers };
  }, [allLogs]);

  const revenueData = useMemo(() => {
    const txns = (apiTransactions ?? []).filter((t: any) => t.status === "completed");
    const totalRevenue = txns.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const monthlyMap: Record<string, number> = {};
    txns.forEach((t: any) => {
      const month = t.created_at.substring(0, 7);
      monthlyMap[month] = (monthlyMap[month] || 0) + (t.amount || 0);
    });
    const monthly = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month));

    const planMap: Record<string, { count: number; revenue: number }> = {};
    txns.forEach((t: any) => {
      if (!planMap[t.plan]) planMap[t.plan] = { count: 0, revenue: 0 };
      planMap[t.plan].count++;
      planMap[t.plan].revenue += t.amount || 0;
    });

    return { totalRevenue, totalTxns: txns.length, monthly, planMap };
  }, [apiTransactions]);

  const filteredKeys = useMemo(() => {
    if (!allKeys) return [];
    if (!searchQuery) return allKeys;
    const q = searchQuery.toLowerCase();
    return allKeys.filter(k => k.name.toLowerCase().includes(q) || k.key_prefix.toLowerCase().includes(q) || k.user_id.toLowerCase().includes(q));
  }, [allKeys, searchQuery]);

  const tabs: { id: SubTab; label: string; icon: any; count?: number }[] = [
    { id: "keys", label: "API Keys", icon: Key, count: allKeys?.length },
    { id: "subscriptions", label: "Subscriptions", icon: Shield, count: allSubs?.length },
    { id: "analytics", label: "Usage Analytics", icon: BarChart3, count: analytics.total },
    { id: "health", label: "Health Monitor", icon: Activity },
    { id: "webhooks", label: "Webhooks", icon: Webhook, count: allWebhooks?.length },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "blocklist", label: "IP Blocklist", icon: Ban, count: blockedIps?.length },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Key className="w-4.5 h-4.5 text-primary" /> API & Developer Management
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Centralized control panel for managing all API keys, developer subscriptions, usage analytics, webhook monitoring, and platform security across the entire system.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Monitor real-time API health metrics, track revenue from API plans, override rate limits for specific users, and block suspicious IP addresses.
          All administrative actions are logged for audit compliance.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors shrink-0",
              subTab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            )}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count !== undefined && <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", subTab === t.id ? "bg-primary-foreground/20" : "bg-muted")}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══ API KEYS ═══ */}
      {subTab === "keys" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-muted-foreground flex-1">
              View and manage all API keys across every user account. Revoke compromised keys instantly or re-activate suspended ones.
              Each key shows its prefix, scopes, creation date, and last usage timestamp.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, prefix, or user ID..."
              className="w-full h-9 pl-10 pr-4 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <p className="text-[10px] text-muted-foreground">{filteredKeys.length} keys found</p>
          <div className="space-y-1.5 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
            {filteredKeys.map(k => (
              <div key={k.id} className="rounded-xl border border-border/40 bg-card overflow-hidden">
                <button onClick={() => setExpandedKey(expandedKey === k.id ? null : k.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/30 transition-colors">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", k.is_active ? "bg-green-500" : "bg-destructive")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{k.name}</p>
                      <span className="text-[10px] font-mono text-muted-foreground">{k.key_prefix}…</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">User: {k.user_id.slice(0, 12)}…</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(k.created_at)}</span>
                  {expandedKey === k.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {expandedKey === k.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div><span className="text-muted-foreground">Status:</span> <span className={k.is_active ? "text-green-500" : "text-destructive"}>{k.is_active ? "Active" : "Revoked"}</span></div>
                          <div><span className="text-muted-foreground">Created:</span> <span className="text-foreground">{formatDate(k.created_at)}</span></div>
                          <div><span className="text-muted-foreground">Last Used:</span> <span className="text-foreground">{k.last_used_at ? timeAgo(k.last_used_at) : "Never"}</span></div>
                          <div><span className="text-muted-foreground">Expires:</span> <span className="text-foreground">{k.expires_at ? formatDate(k.expires_at) : "Never"}</span></div>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Scopes:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {k.scopes.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 bg-secondary rounded-md text-muted-foreground font-mono">{s}</span>)}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          {k.is_active ? (
                            <Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={() => revokeKey.mutate(k.id)}>
                              <Ban className="w-3 h-3 mr-1" /> Revoke Key
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => activateKey.mutate(k.id)}>
                              <RefreshCw className="w-3 h-3 mr-1" /> Re-activate
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            {filteredKeys.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No API keys found across any user account.</p>}
          </div>
        </div>
      )}

      {/* ═══ SUBSCRIPTIONS ═══ */}
      {subTab === "subscriptions" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Manage all API subscriptions. Manually upgrade or downgrade any user's plan. Override rate limits for specific users who need custom quotas.
            Changes take effect immediately and are reflected in the API middleware's rate limiting logic.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {["free", "pro", "enterprise"].map(plan => {
              const count = (allSubs ?? []).filter(s => s.plan === plan).length;
              return (
                <div key={plan} className="p-3 rounded-xl border border-border/50 bg-card text-center">
                  <p className={cn("text-lg font-bold font-display", PLAN_COLORS[plan])}>{count}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{plan} Users</p>
                  <p className="text-[9px] text-muted-foreground/70 mt-0.5">{PLAN_LIMITS[plan]} RPM limit</p>
                </div>
              );
            })}
          </div>
          <div className="space-y-1.5 max-h-[calc(100vh-450px)] overflow-y-auto pr-1">
            {(allSubs ?? []).map(sub => (
              <div key={sub.id} className="rounded-xl border border-border/40 bg-card overflow-hidden">
                <button onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/30 transition-colors">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", sub.status === "active" ? "bg-green-500" : "bg-yellow-500")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold capitalize", PLAN_COLORS[sub.plan])}>{sub.plan}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{sub.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{sub.user_id.slice(0, 12)}…</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{sub.expires_at ? `Expires ${formatDate(sub.expires_at)}` : "No expiry"}</span>
                  {expandedSub === sub.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {expandedSub === sub.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 space-y-2.5 border-t border-border/30 pt-2">
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div><span className="text-muted-foreground">Started:</span> <span className="text-foreground">{formatDate(sub.started_at)}</span></div>
                          <div><span className="text-muted-foreground">Auto-Renew:</span> <span className={sub.auto_renew ? "text-green-500" : "text-yellow-500"}>{sub.auto_renew ? "Yes" : "No"}</span></div>
                          <div><span className="text-muted-foreground">Cancelled:</span> <span className="text-foreground">{sub.cancelled_at ? formatDate(sub.cancelled_at) : "—"}</span></div>
                          <div><span className="text-muted-foreground">Rate Limit:</span> <span className="text-foreground">{PLAN_LIMITS[sub.plan] ?? "?"} RPM</span></div>
                        </div>
                        {/* Plan override */}
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium">Change Plan:</label>
                          <div className="flex gap-1.5 mt-1">
                            {["free", "pro", "enterprise"].map(p => (
                              <Button key={p} size="sm" variant={sub.plan === p ? "default" : "outline"} className="h-7 text-[10px] capitalize flex-1"
                                disabled={sub.plan === p}
                                onClick={() => updateSubPlan.mutate({ userId: sub.user_id, plan: p })}>
                                {p}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            {(!allSubs || allSubs.length === 0) && <p className="text-sm text-muted-foreground text-center py-12">No API subscriptions found.</p>}
          </div>
        </div>
      )}

      {/* ═══ USAGE ANALYTICS ═══ */}
      {subTab === "analytics" && (
        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground">
            Platform-wide API usage analytics for the last 30 days. Track total API calls, success rates, response times, and identify the most popular endpoints.
            Use this data to optimize infrastructure, identify abuse patterns, and plan capacity.
          </p>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total API Calls", value: analytics.total.toLocaleString(), icon: Activity, accent: "text-primary" },
              { label: "Error Rate", value: `${analytics.errorRate}%`, icon: AlertTriangle, accent: analytics.errors > 0 ? "text-destructive" : "text-green-500" },
              { label: "Avg Response Time", value: `${analytics.avgTime}ms`, icon: Clock, accent: "text-chart-1" },
              { label: "Active Developers", value: String(analytics.topUsers.length), icon: Key, accent: "text-chart-2" },
            ].map((s, i) => (
              <div key={s.label} className="p-3 rounded-xl border border-border/50 bg-card">
                <s.icon className={cn("w-4 h-4 mb-2", s.accent)} />
                <p className="text-lg font-bold font-display text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Daily chart */}
          {analytics.daily.length > 0 && (
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <h3 className="text-xs font-semibold text-foreground mb-1">Daily API Traffic — Last 30 Days</h3>
              <p className="text-[10px] text-muted-foreground mb-3">Visual breakdown of successful calls vs errors per day. Spikes may indicate bot activity or viral usage.</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.daily} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs>
                      <ChartGradient id="apiCallGrad" color="hsl(var(--primary))" opacity={0.4} />
                      <ChartGradient id="apiErrGrad" color="hsl(var(--destructive))" opacity={0.25} />
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                    <XAxis dataKey="date" tick={aestheticAxisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={aestheticAxisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={aestheticTooltipStyle} />
                    <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fill="url(#apiCallGrad)" strokeWidth={2.5} dot={false} />
                    <Area type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" fill="url(#apiErrGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {/* Top endpoints */}
          <div className="p-4 rounded-xl border border-border/50 bg-card">
            <h3 className="text-xs font-semibold text-foreground mb-1">Top Endpoints by Volume</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Most frequently called API endpoints with average response times. Optimize slow endpoints to improve developer experience.</p>
            <div className="space-y-1.5">
              {analytics.topEndpoints.map((ep, i) => (
                <div key={ep.endpoint} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/30">
                  <span className="text-[10px] text-muted-foreground w-5 shrink-0 font-mono">#{i + 1}</span>
                  <span className="text-[11px] font-mono text-foreground flex-1 truncate">{ep.endpoint}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{ep.count} calls</span>
                  <span className="text-[10px] text-chart-1 shrink-0">{ep.avgTime}ms avg</span>
                </div>
              ))}
              {analytics.topEndpoints.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-6">No API calls recorded in the last 30 days.</p>}
            </div>
          </div>
          {/* Top users */}
          <div className="p-4 rounded-xl border border-border/50 bg-card">
            <h3 className="text-xs font-semibold text-foreground mb-1">Top API Consumers</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Users with the highest API call volume. High-volume users may need plan upgrades or rate limit adjustments.</p>
            <div className="space-y-1">
              {analytics.topUsers.map((u, i) => (
                <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/30">
                  <span className="text-[10px] text-muted-foreground w-5 shrink-0 font-mono">#{i + 1}</span>
                  <span className="text-[11px] font-mono text-foreground flex-1 truncate">{u.id.slice(0, 16)}…</span>
                  <span className="text-[10px] text-primary font-semibold shrink-0">{u.count} calls</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HEALTH MONITOR ═══ */}
      {subTab === "health" && (
        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground">
            Real-time API health monitoring dashboard. Track error rates, response time performance, uptime availability, and status code distribution.
            Use this to detect outages, performance degradation, or abuse patterns before they impact users.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <Activity className="w-5 h-5 text-green-500 mb-2" />
              <p className="text-xl font-bold font-display text-green-500">
                {analytics.total > 0 ? (100 - parseFloat(analytics.errorRate)).toFixed(1) : "100"}%
              </p>
              <p className="text-[10px] text-muted-foreground">Success Rate (30d)</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Percentage of requests returning 2xx/3xx status codes</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <Clock className="w-5 h-5 text-chart-1 mb-2" />
              <p className="text-xl font-bold font-display text-foreground">{analytics.avgTime}ms</p>
              <p className="text-[10px] text-muted-foreground">Avg Response Time</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Mean time from request receipt to response delivery</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <AlertTriangle className="w-5 h-5 text-destructive mb-2" />
              <p className="text-xl font-bold font-display text-foreground">{analytics.errors}</p>
              <p className="text-[10px] text-muted-foreground">Total Errors (30d)</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Requests that returned 4xx or 5xx HTTP status codes</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <Zap className="w-5 h-5 text-chart-3 mb-2" />
              <p className="text-xl font-bold font-display text-foreground">{analytics.total}</p>
              <p className="text-[10px] text-muted-foreground">Total Requests (30d)</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">All API calls processed by the platform edge function</p>
            </div>
          </div>
          {/* Status distribution pie */}
          {analytics.statusDist.length > 0 && (
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <h3 className="text-xs font-semibold text-foreground mb-1">Status Code Distribution</h3>
              <p className="text-[10px] text-muted-foreground mb-3">Breakdown of all API responses by HTTP status code group. A high 4xx ratio may indicate authentication issues or client misuse.</p>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} strokeWidth={2}>
                        {analytics.statusDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 10, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {analytics.statusDist.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[10px] text-foreground">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ WEBHOOKS ═══ */}
      {subTab === "webhooks" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Monitor all registered webhooks across every developer account. Track delivery success rates, failure counts, and last triggered timestamps.
            Webhooks with high failure counts may need to be investigated or disabled to prevent unnecessary retry overhead.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-border/50 bg-card text-center">
              <p className="text-lg font-bold font-display text-foreground">{allWebhooks?.length ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Total Webhooks</p>
            </div>
            <div className="p-3 rounded-xl border border-border/50 bg-card text-center">
              <p className="text-lg font-bold font-display text-green-500">{(allWebhooks ?? []).filter(w => w.is_active).length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
            <div className="p-3 rounded-xl border border-border/50 bg-card text-center">
              <p className="text-lg font-bold font-display text-destructive">{(allWebhooks ?? []).reduce((s, w) => s + (w.failure_count || 0), 0)}</p>
              <p className="text-[10px] text-muted-foreground">Total Failures</p>
            </div>
          </div>
          <div className="space-y-1.5 max-h-[calc(100vh-450px)] overflow-y-auto pr-1">
            {(allWebhooks ?? []).map(wh => (
              <div key={wh.id} className="p-3 rounded-xl border border-border/40 bg-card">
                <div className="flex items-start gap-2">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", wh.is_active ? "bg-green-500" : "bg-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-foreground truncate">{wh.url}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                      <span className="font-mono">User: {wh.user_id.slice(0, 8)}…</span>
                      <span>·</span>
                      <span>{wh.is_active ? "Active" : "Disabled"}</span>
                      <span>·</span>
                      <span className={wh.failure_count > 3 ? "text-destructive font-medium" : ""}>{wh.failure_count} failures</span>
                      {wh.last_triggered_at && <><span>·</span><span>Last triggered {timeAgo(wh.last_triggered_at)}</span></>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {wh.events.map(e => <span key={e} className="text-[9px] px-1.5 py-0.5 bg-secondary rounded-md text-muted-foreground font-mono">{e}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!allWebhooks || allWebhooks.length === 0) && <p className="text-sm text-muted-foreground text-center py-12">No webhooks registered on the platform.</p>}
          </div>
        </div>
      )}

      {/* ═══ REVENUE ═══ */}
      {subTab === "revenue" && (
        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground">
            API plan revenue dashboard. Track monthly recurring revenue (MRR), total earnings, and revenue distribution by plan tier.
            This data helps optimize pricing strategy and forecast growth from the developer platform.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <DollarSign className="w-5 h-5 text-chart-3 mb-2" />
              <p className="text-xl font-bold font-display text-foreground">৳{revenueData.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total API Revenue</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Cumulative revenue from all completed API plan transactions</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <TrendingUp className="w-5 h-5 text-primary mb-2" />
              <p className="text-xl font-bold font-display text-foreground">{revenueData.totalTxns}</p>
              <p className="text-[10px] text-muted-foreground">Completed Transactions</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Successfully processed API plan purchases via UddoktaPay</p>
            </div>
            <div className="p-4 rounded-xl border border-border/50 bg-card col-span-2 lg:col-span-1">
              <Globe className="w-5 h-5 text-chart-2 mb-2" />
              <p className="text-xl font-bold font-display text-foreground">
                ৳{revenueData.totalTxns > 0 ? Math.round(revenueData.totalRevenue / revenueData.totalTxns) : 0}
              </p>
              <p className="text-[10px] text-muted-foreground">Avg Transaction Value</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">Average revenue per completed API subscription purchase</p>
            </div>
          </div>
          {/* Revenue by plan */}
          <div className="p-4 rounded-xl border border-border/50 bg-card">
            <h3 className="text-xs font-semibold text-foreground mb-1">Revenue by Plan Tier</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Breakdown showing which plans generate the most revenue. Enterprise plans typically drive the highest ARPU.</p>
            <div className="space-y-2">
              {Object.entries(revenueData.planMap).map(([plan, data]) => (
                <div key={plan} className="flex items-center justify-between p-2.5 rounded-lg border border-border/30">
                  <div>
                    <span className={cn("text-xs font-semibold capitalize", PLAN_COLORS[plan])}>{plan}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{data.count} transactions</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-foreground">৳{data.revenue.toLocaleString()}</span>
                </div>
              ))}
              {Object.keys(revenueData.planMap).length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">No API plan revenue recorded yet.</p>}
            </div>
          </div>
          {/* Monthly revenue chart */}
          {revenueData.monthly.length > 0 && (
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <h3 className="text-xs font-semibold text-foreground mb-1">Monthly Revenue Trend</h3>
              <p className="text-[10px] text-muted-foreground mb-3">Revenue trajectory from API plan subscriptions over time. Upward trends indicate healthy developer adoption.</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData.monthly}>
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => [`৳${v}`, "Revenue"]} />
                    <Bar dataKey="amount" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ IP BLOCKLIST ═══ */}
      {subTab === "blocklist" && (
        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground">
            Block suspicious IP addresses from accessing the API. Blocked IPs will receive a 403 Forbidden response on all API endpoints.
            Use this to prevent brute-force attacks, credential stuffing, or excessive scraping from known bad actors.
          </p>
          <div className="flex gap-2">
            <input type="text" value={newBlockedIp} onChange={e => setNewBlockedIp(e.target.value)}
              placeholder="Enter IP address (e.g. 192.168.1.100)"
              className="flex-1 h-9 px-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
            <Button size="sm" className="h-9" disabled={!newBlockedIp.trim()}
              onClick={() => {
                const ip = newBlockedIp.trim();
                if (!ip) return;
                const updated = [...(blockedIps ?? []), ip];
                updateBlockedIps.mutate(updated);
                setNewBlockedIp("");
                toast.success(`IP ${ip} added to blocklist`);
              }}>
              <Ban className="w-3.5 h-3.5 mr-1" /> Block
            </Button>
          </div>
          <div className="space-y-1.5">
            {(blockedIps ?? []).length === 0 ? (
              <div className="text-center py-12">
                <Ban className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No blocked IPs</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">The blocklist is empty. Add IP addresses above to restrict API access from suspicious sources.</p>
              </div>
            ) : (
              (blockedIps ?? []).map((ip, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-card">
                  <Ban className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <span className="text-xs font-mono text-foreground flex-1">{ip}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive"
                    onClick={() => {
                      const updated = (blockedIps ?? []).filter((_, idx) => idx !== i);
                      updateBlockedIps.mutate(updated);
                      toast.success(`IP ${ip} removed from blocklist`);
                    }}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
