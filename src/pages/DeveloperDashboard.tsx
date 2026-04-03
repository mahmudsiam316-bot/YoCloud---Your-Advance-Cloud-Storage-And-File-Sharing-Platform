import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Key, BarChart3, BookOpen, Webhook, Plus, Copy, Eye, EyeOff, Trash2,
  Shield, Clock, Activity, Zap, AlertTriangle, Check, Code, ExternalLink,
  Terminal, FileText, Upload, Download, FolderPlus, Share2, Tag, Settings,
  ChevronRight, ToggleLeft, ToggleRight, Globe, CreditCard, Crown, Loader2,
  CalendarDays, RefreshCw, XCircle, CheckCircle2, Infinity, TrendingUp,
  TrendingDown, Filter, Search, ChevronDown, Server, Cpu, Hash, ArrowUpRight,
  PieChart, Timer, Gauge, Radio, Wifi, WifiOff, RotateCcw, Calendar, Lock,
  Ban, FileDown, ChevronUp, Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey,
  useApiUsageStats, useApiWebhooks, useCreateWebhook, useDeleteWebhook, useToggleWebhook,
} from "@/hooks/useApiKeys";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Pie, Cell
} from "recharts";
import { aestheticTooltipStyle, aestheticAxisTick, ChartGradient } from "@/components/ui/aesthetic-chart";
import { API_PLANS, useInitPayment } from "@/hooks/usePayment";
import { useApiSubscription, useApiPaymentHistory, useCancelApiSubscription, useToggleAutoRenew } from "@/hooks/useApiSubscription";
import { Progress } from "@/components/ui/progress";

const ALL_SCOPES = [
  { id: "files:read", label: "Read Files", icon: FileText, category: "Files" },
  { id: "files:write", label: "Upload Files", icon: Upload, category: "Files" },
  { id: "files:delete", label: "Delete Files", icon: Trash2, category: "Files" },
  { id: "folders:create", label: "Create Folders", icon: FolderPlus, category: "Files" },
  { id: "shares:read", label: "Read Shares", icon: Share2, category: "Sharing" },
  { id: "shares:write", label: "Create Shares", icon: Share2, category: "Sharing" },
  { id: "tags:read", label: "Read Tags", icon: Tag, category: "Tags" },
  { id: "tags:write", label: "Create Tags", icon: Tag, category: "Tags" },
  { id: "user:read", label: "Read User Info", icon: Shield, category: "User" },
  { id: "workspaces:read", label: "Read Workspaces", icon: Server, category: "Workspace" },
  { id: "ai:analyze", label: "AI Image Analysis", icon: Cpu, category: "AI" },
];

const WEBHOOK_EVENTS = [
  { id: "file.uploaded", label: "File Uploaded" },
  { id: "file.deleted", label: "File Deleted" },
  { id: "file.shared", label: "File Shared" },
];

const TIME_FILTERS = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "keys", label: "API Keys", icon: Key },
  { id: "logs", label: "Request Logs", icon: Terminal },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "docs", label: "Docs", icon: BookOpen },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
];

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))", "#f59e0b"];

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const { data: keys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (keys?.length && !selectedKeyId) {
      setSelectedKeyId(keys[0].id);
    }
  }, [keys, selectedKeyId]);

  const selectedKey = keys?.find(k => k.id === selectedKeyId);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-[1400px] mx-auto px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-3 h-14">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Terminal className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-foreground text-sm leading-none truncate">Developer Console</h1>
                {!isMobile && <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Real-time API Analytics, Key Management & Billing</p>}
              </div>
            </div>
            <div className="flex-1" />
            {keys && keys.length > 0 && (
              <Select value={selectedKeyId || ""} onValueChange={setSelectedKeyId}>
                <SelectTrigger className={cn("h-8 text-xs gap-1.5 border-border/60", isMobile ? "w-[130px]" : "w-auto max-w-[200px]")}>
                  <Key className="w-3 h-3 text-primary shrink-0" />
                  <SelectValue placeholder="Key" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Keys</SelectItem>
                  {keys.map(k => (
                    <SelectItem key={k.id} value={k.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{k.name}</span>
                        <code className="text-[9px] text-muted-foreground">{k.key_prefix}••••</code>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Badge variant="outline" className="text-[9px] hidden md:inline-flex">v1.0</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-4">
        <div className="flex gap-5">
          {!isMobile && (
            <div className="w-52 shrink-0">
              <div className="sticky top-20 space-y-0.5">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm",
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )}
                  >
                    <tab.icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {isMobile && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 pb-1 -mx-1 px-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                      activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {activeTab === "overview" && <OverviewTab selectedKeyId={selectedKeyId === "all" ? undefined : selectedKeyId || undefined} selectedKey={selectedKey} />}
                {activeTab === "keys" && <ApiKeysTab />}
                {activeTab === "logs" && <LogsTab selectedKeyId={selectedKeyId === "all" ? undefined : selectedKeyId || undefined} />}
                {activeTab === "billing" && <BillingTab />}
                {activeTab === "docs" && <DocsTabRedirect />}
                {activeTab === "webhooks" && <WebhooksTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {isMobile && <div className="h-24" />}
    </div>
  );
}

// ==================== Overview Tab ====================
function OverviewTab({ selectedKeyId, selectedKey }: { selectedKeyId?: string; selectedKey?: any }) {
  const [timeRange, setTimeRange] = useState(30);
  const { data: stats, isLoading } = useApiUsageStats(timeRange, selectedKeyId);
  const { data: subscription } = useApiSubscription();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [liveCount, setLiveCount] = useState(0);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;
    const channel = supabase
      .channel('api-usage-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'api_usage_logs' }, () => {
        setLiveCount(prev => prev + 1);
        queryClient.invalidateQueries({ queryKey: ["api-usage-stats"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLive, queryClient]);

  const currentPlan = subscription?.plan || "free";
  const planRpm = currentPlan === "enterprise" ? "∞" : currentPlan === "pro" ? "9" : "3";
  const planRpmNum = currentPlan === "enterprise" ? 999999 : currentPlan === "pro" ? 9 : 3;
  const dailyQuota = planRpmNum * 60 * 24;

  const trend = useMemo(() => {
    if (!stats?.daily || stats.daily.length < 2) return 0;
    const half = Math.floor(stats.daily.length / 2);
    const first = stats.daily.slice(0, half).reduce((s, d) => s + d.calls, 0);
    const second = stats.daily.slice(half).reduce((s, d) => s + d.calls, 0);
    if (first === 0) return second > 0 ? 100 : 0;
    return Math.round(((second - first) / first) * 100);
  }, [stats?.daily]);

  // Error breakdown data for 4xx vs 5xx chart
  const errorBreakdown = useMemo(() => {
    if (!stats?.statusDist) return [];
    return stats.statusDist.filter(s => s.status === "4xx" || s.status === "5xx");
  }, [stats?.statusDist]);

  // Daily quota usage
  const todayCalls = stats?.daily?.length ? stats.daily[stats.daily.length - 1]?.calls || 0 : 0;
  const quotaPercent = currentPlan === "enterprise" ? 0 : Math.min(100, (todayCalls / dailyQuota) * 100);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">API Analytics Overview</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md leading-relaxed">
            {selectedKey
              ? `Monitoring performance metrics for "${selectedKey.name}" — track request volume, latency, errors, and endpoint usage in real-time.`
              : "Comprehensive analytics across all your API keys — monitor request patterns, success rates, response times, and bandwidth consumption."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsLive(!isLive)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border",
              isLive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-secondary text-muted-foreground border-border"
            )}
          >
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? "LIVE" : "PAUSED"}
            {isLive && liveCount > 0 && (
              <span className="bg-emerald-500 text-white text-[8px] px-1 rounded-full min-w-[14px] text-center">+{liveCount}</span>
            )}
          </button>
          <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5">
            {TIME_FILTERS.map(tf => (
              <button key={tf.label} onClick={() => setTimeRange(tf.days)}
                className={cn("px-2 py-1 rounded-md text-xs font-semibold transition-all",
                  timeRange === tf.days ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>{tf.label}</button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={Zap} label="Total Requests" value={formatNumber((stats?.totalCalls || 0) + liveCount)}
              trend={trend} trendLabel="vs previous period"
              subValue={`${liveCount > 0 ? `+${liveCount} live` : "All authenticated API calls"}`}
              gradient="from-primary/10 to-primary/5" />
            <MetricCard icon={CheckCircle2} label="Success Rate"
              value={stats?.totalCalls ? `${(((stats.successCount || 0) / stats.totalCalls) * 100).toFixed(1)}%` : "0%"}
              subValue={`${stats?.successCount || 0} out of ${stats?.totalCalls || 0} requests succeeded`}
              gradient="from-emerald-500/10 to-emerald-500/5" iconColor="text-emerald-500" />
            <MetricCard icon={Timer} label="Avg Latency" value={`${stats?.avgResponseTime || 0}ms`}
              subValue="Mean server response time across all endpoints"
              gradient="from-amber-500/10 to-amber-500/5" iconColor="text-amber-500" />
            <MetricCard icon={AlertTriangle} label="Errors" value={String(stats?.errorCount || 0)}
              subValue={`${stats?.errorRate || 0}% of requests returned 4xx/5xx status`}
              gradient="from-destructive/10 to-destructive/5" iconColor="text-destructive" />
          </div>

          {/* Usage Quota Progress - Gap #3 */}
          {currentPlan !== "enterprise" && (
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Daily Usage Quota</h3>
                <Badge variant="outline" className="text-[9px] capitalize ml-auto">{currentPlan} Plan</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">
                Your {currentPlan} plan allows {planRpmNum} requests/minute (~{dailyQuota.toLocaleString()} daily theoretical max). 
                Track your consumption to avoid hitting rate limits.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Today's requests</span>
                  <span className="font-semibold text-foreground">{todayCalls} / {dailyQuota.toLocaleString()}</span>
                </div>
                <Progress value={quotaPercent} className={cn("h-2.5", quotaPercent > 80 ? "[&>div]:bg-destructive" : quotaPercent > 50 ? "[&>div]:bg-amber-500" : "")} />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{quotaPercent.toFixed(1)}% used</span>
                  {quotaPercent > 80 && <span className="text-destructive font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Approaching limit</span>}
                </div>
              </div>
            </div>
          )}

          {/* Main Chart */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="p-4 pb-0">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Requests Over Time — Daily Breakdown</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">{formatNumber((stats?.totalCalls || 0) + liveCount)}</span>
                    {trend !== 0 && (
                      <span className={cn("text-xs font-semibold flex items-center gap-0.5", trend > 0 ? "text-emerald-500" : "text-destructive")}>
                        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trend)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Track daily request volume and identify traffic patterns across your integration.</p>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />Success</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" />Errors</span>
                </div>
              </div>
            </div>
            <div className="h-56 md:h-64 px-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.daily || []} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <ChartGradient id="gradSuccess" color="hsl(var(--primary))" opacity={0.4} />
                    <ChartGradient id="gradError" color="hsl(var(--destructive))" opacity={0.25} />
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis dataKey="date" tick={aestheticAxisTick} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={aestheticAxisTick} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={aestheticTooltipStyle} />
                  <Area type="monotone" dataKey="success" stroke="hsl(var(--primary))" fill="url(#gradSuccess)" strokeWidth={2.5} dot={false} name="Success" />
                  <Area type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" fill="url(#gradError)" strokeWidth={2} dot={false} name="Errors" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Response Time Chart */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Response Time Trend</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Average server processing time per day in milliseconds. Lower is better — aim for under 200ms.</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.daily || []} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs><ChartGradient id="latencyGrad" color="#f59e0b" opacity={0.3} /></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                    <XAxis dataKey="date" tick={aestheticAxisTick} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                    <YAxis tick={aestheticAxisTick} axisLine={false} tickLine={false} width={30} unit="ms" />
                    <Tooltip contentStyle={aestheticTooltipStyle} />
                    <Area type="monotone" dataKey="avgTime" stroke="#f59e0b" fill="url(#latencyGrad)" strokeWidth={2.5} dot={false} name="Avg Time (ms)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Error Breakdown Chart - Gap #5 */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <h3 className="text-sm font-semibold text-foreground">Error Breakdown — 4xx vs 5xx</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                4xx errors indicate client-side issues (bad requests, auth failures). 5xx errors indicate server-side problems requiring immediate investigation.
              </p>
              {errorBreakdown.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="h-36 w-36 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={errorBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3}>
                          <Cell fill="#f59e0b" />
                          <Cell fill="hsl(var(--destructive))" />
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 flex-1">
                    {errorBreakdown.map((e) => (
                      <div key={e.status} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", e.status === "4xx" ? "bg-amber-500" : "bg-destructive")} />
                            <span className="font-mono font-semibold text-foreground">{e.status}</span>
                            <span className="text-muted-foreground">{e.status === "4xx" ? "Client Errors" : "Server Errors"}</span>
                          </span>
                          <span className="font-bold text-foreground">{e.count}</span>
                        </div>
                        <Progress value={stats?.errorCount ? (e.count / stats.errorCount) * 100 : 0} 
                          className={cn("h-1.5", e.status === "4xx" ? "[&>div]:bg-amber-500" : "[&>div]:bg-destructive")} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-36 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
                  <span>No errors — all requests successful 🎉</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Distribution + Rate Limit + Key Details + Endpoints */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Rate Limit</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Your plan's maximum allowed requests per minute. Exceeding this returns HTTP 429.</p>
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-foreground">{planRpm}</p>
                <p className="text-xs text-muted-foreground">requests / minute</p>
                <div className="mt-3"><Badge variant="outline" className="text-[10px] capitalize">{currentPlan} Plan</Badge></div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Max pagination</span><span className="font-semibold text-foreground">100 items</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Retry window</span><span className="font-semibold text-foreground">60 seconds</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Bandwidth</span><span className="font-semibold text-foreground">{formatBytes(stats?.totalBandwidth || 0)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Key className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Selected Key Details</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Metadata and usage summary for the currently selected API key.</p>
              {selectedKey ? (
                <div className="space-y-2.5">
                  <div><p className="text-[10px] text-muted-foreground font-medium">Name</p><p className="text-sm font-semibold text-foreground">{selectedKey.name}</p></div>
                  <div><p className="text-[10px] text-muted-foreground font-medium">Key Preview</p><code className="text-xs font-mono text-foreground">{selectedKey.key_prefix}••••••••••</code></div>
                  <div><p className="text-[10px] text-muted-foreground font-medium">Created</p><p className="text-xs text-foreground">{format(new Date(selectedKey.created_at), "MMM dd, yyyy")}</p></div>
                  <div><p className="text-[10px] text-muted-foreground font-medium">Last Used</p><p className="text-xs text-foreground">{selectedKey.last_used_at ? formatDistanceToNow(new Date(selectedKey.last_used_at), { addSuffix: true }) : "Never"}</p></div>
                  <div><p className="text-[10px] text-muted-foreground font-medium">Expires</p><p className="text-xs text-foreground">{selectedKey.expires_at ? format(new Date(selectedKey.expires_at), "MMM dd, yyyy") : "Never"}</p></div>
                  <div><p className="text-[10px] text-muted-foreground font-medium">Scopes</p><p className="text-xs text-foreground">{(selectedKey.scopes as string[])?.length || 0} permissions</p></div>
                  <div><p className="text-[10px] text-muted-foreground font-medium">Total Calls</p><p className="text-lg font-bold text-primary">{formatNumber(stats?.totalCalls || 0)}</p></div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">Select a key to view details</div>
              )}
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Top Endpoints</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Most frequently called API endpoints ranked by request volume.</p>
              {stats?.topEndpoints && stats.topEndpoints.length > 0 ? (
                <div className="space-y-2">
                  {stats.topEndpoints.slice(0, 5).map((ep) => {
                    const pct = stats.totalCalls ? (ep.count / stats.totalCalls) * 100 : 0;
                    return (
                      <div key={ep.endpoint} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <code className="font-mono text-foreground truncate max-w-[120px] md:max-w-[140px]">{ep.endpoint}</code>
                          <span className="text-muted-foreground shrink-0">{ep.count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No endpoint data yet</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat icon={Clock} label="Peak Hour" value={stats?.peakHour || "N/A"} sub={`${stats?.peakHourCalls || 0} calls`} />
            <MiniStat icon={Activity} label="Bandwidth" value={formatBytes(stats?.totalBandwidth || 0)} sub="Total transferred" />
            <MiniStat icon={Hash} label="Unique Endpoints" value={String(stats?.topEndpoints?.length || 0)} sub="Distinct paths" />
            <MiniStat icon={Radio} label="Methods" value={String(stats?.methodDist?.length || 0)} sub={stats?.methodDist?.map(m => m.method).join(", ") || "None"} />
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, trend, trendLabel, subValue, gradient, iconColor }: {
  icon: any; label: string; value: string; trend?: number; trendLabel?: string; subValue?: string; gradient?: string; iconColor?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={cn("p-3.5 rounded-xl border border-border bg-gradient-to-br", gradient || "from-secondary/20 to-transparent")}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("w-4 h-4", iconColor || "text-primary")} />
        {trend !== undefined && trend !== 0 && (
          <span className={cn("text-[10px] font-semibold flex items-center gap-0.5", trend > 0 ? "text-emerald-500" : "text-destructive")}>
            {trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{subValue || trendLabel || label}</p>
    </motion.div>
  );
}

function MiniStat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <div className="p-3 rounded-xl border border-border">
      <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground font-medium">{label}</span></div>
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}

// ==================== API Keys Tab ====================
function ApiKeysTab() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const deleteKey = useDeleteApiKey();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Default Key");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(ALL_SCOPES.map(s => s.id));
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState<string>("never");
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);
  
  // Key rotation
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [keyToRotate, setKeyToRotate] = useState<any>(null);

  // Expiry edit
  const [showExpiryEdit, setShowExpiryEdit] = useState(false);
  const [editingKey, setEditingKey] = useState<any>(null);
  const [newExpiryDate, setNewExpiryDate] = useState("");

  const handleCreate = async () => {
    const expiresAt = expiryDays === "never" ? undefined : new Date(Date.now() + Number(expiryDays) * 86400000).toISOString();
    const result = await createKey.mutateAsync({ name: newKeyName, scopes: selectedScopes });
    
    if (expiresAt && result.id) {
      await supabase.from("api_keys").update({ expires_at: expiresAt }).eq("id", result.id);
    }
    
    setNewRawKey(result.raw_key);
    setShowCreate(false);
    setNewKeyName("Default Key");
    setExpiryDays("never");
  };

  const handleRotate = async () => {
    if (!keyToRotate) return;
    await revokeKey.mutateAsync(keyToRotate.id);
    const result = await createKey.mutateAsync({ name: `${keyToRotate.name} (rotated)`, scopes: keyToRotate.scopes as string[] });
    setNewRawKey(result.raw_key);
    setShowRotateConfirm(false);
    setKeyToRotate(null);
    toast.success("Key rotated — old key revoked, new key created");
  };

  const handleExpiryUpdate = async () => {
    if (!editingKey) return;
    const expiresAt = newExpiryDate ? new Date(newExpiryDate).toISOString() : null;
    const { error } = await supabase.from("api_keys").update({ expires_at: expiresAt }).eq("id", editingKey.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Expiry date updated");
    setShowExpiryEdit(false);
    setEditingKey(null);
  };

  const copyApiKey = (key: any) => {
    const fullKey = sessionStorage.getItem(`yocloud_api_key_${key.id}`) || sessionStorage.getItem('yocloud_last_api_key');
    if (fullKey && fullKey.startsWith(key.key_prefix)) {
      navigator.clipboard.writeText(fullKey);
      toast.success("Full API key copied!");
    } else {
      navigator.clipboard.writeText(key.key_prefix);
      toast.info("Only prefix copied — full key is only available right after creation.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">API Keys</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
            Generate and manage API keys with expiry dates, permission scopes, and key rotation.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" /> Create Key
        </Button>
      </div>

      {newRawKey && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">API Key Created</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Copy now — it won't be shown again.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 text-xs bg-card p-2 rounded-lg font-mono break-all border border-border select-all">{newRawKey}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newRawKey); toast.success("Copied!"); }}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setNewRawKey(null)}>Dismiss</Button>
            </div>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : !keys?.length ? (
        <div className="text-center py-16">
          <Key className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No API Keys Yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first API key to start integrating.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(key => {
            const isExpired = key.expires_at && new Date(key.expires_at) < new Date();
            const isExpanded = expandedKeyId === key.id;
            const scopes = key.scopes as string[];
            return (
              <motion.div key={key.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={cn("rounded-xl border transition-all",
                  isExpired ? "border-destructive/30 bg-destructive/5" : 
                  isExpanded ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
                )}>
                {/* Clickable header */}
                <button
                  onClick={() => setExpandedKeyId(isExpanded ? null : key.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{key.name}</h3>
                        <Badge variant={key.is_active ? (isExpired ? "destructive" : "default") : "destructive"} className="text-[9px]">
                          {!key.is_active ? "Revoked" : isExpired ? "Expired" : "Active"}
                        </Badge>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform ml-auto", isExpanded && "rotate-180")} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono select-all">{key.key_prefix}••••••••••••</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}</span>
                        {key.last_used_at && (
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Used {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}</span>
                        )}
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {scopes?.length || 0} scopes</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                        {/* Key details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-2.5 rounded-lg bg-secondary/30">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Created</p>
                            <p className="text-xs font-semibold text-foreground mt-0.5">{format(new Date(key.created_at), "MMM dd, yyyy")}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-secondary/30">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Last Used</p>
                            <p className="text-xs font-semibold text-foreground mt-0.5">{key.last_used_at ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true }) : "Never"}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-secondary/30">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Expiry</p>
                            <p className={cn("text-xs font-semibold mt-0.5", isExpired ? "text-destructive" : "text-foreground")}>
                              {key.expires_at ? (isExpired ? "Expired " : "") + format(new Date(key.expires_at), "MMM dd, yyyy") : "Never"}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-secondary/30">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Status</p>
                            <p className={cn("text-xs font-semibold mt-0.5", key.is_active && !isExpired ? "text-emerald-500" : "text-destructive")}>
                              {!key.is_active ? "Revoked" : isExpired ? "Expired" : "Active"}
                            </p>
                          </div>
                        </div>

                        {/* Scopes */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Permissions ({scopes?.length || 0})</p>
                          <div className="flex flex-wrap gap-1">
                            {scopes?.map(scope => (
                              <span key={scope} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">{scope}</span>
                            ))}
                          </div>
                        </div>

                        {/* Key ID */}
                        <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/50">
                          <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Key ID</p>
                          <code className="text-[10px] font-mono text-foreground select-all break-all">{key.id}</code>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={(e) => { e.stopPropagation(); copyApiKey(key); }}>
                            <Copy className="w-3 h-3" /> Copy Key
                          </Button>
                          {key.is_active && (
                            <>
                              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={(e) => { e.stopPropagation(); setEditingKey(key); setNewExpiryDate(key.expires_at ? key.expires_at.split('T')[0] : ''); setShowExpiryEdit(true); }}>
                                <Calendar className="w-3 h-3" /> Set Expiry
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={(e) => { e.stopPropagation(); setKeyToRotate(key); setShowRotateConfirm(true); }}>
                                <RotateCcw className="w-3 h-3" /> Rotate
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); revokeKey.mutate(key.id); }}>
                                <Ban className="w-3 h-3" /> Revoke
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-destructive" onClick={(e) => { e.stopPropagation(); deleteKey.mutate(key.id); }}>
                            <Trash2 className="w-3 h-3" /> Delete
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
      {/* Create Key Dialog - with expiry */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Key Name</label>
              <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="My App Key" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Expiry</label>
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Keys with expiry dates auto-deactivate for better security.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Permissions</label>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {Object.entries(
                  ALL_SCOPES.reduce((acc, scope) => {
                    (acc[scope.category] = acc[scope.category] || []).push(scope);
                    return acc;
                  }, {} as Record<string, typeof ALL_SCOPES>)
                ).map(([cat, scopes]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{cat}</p>
                    <div className="space-y-0.5">
                      {scopes.map(scope => (
                        <label key={scope.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/30 cursor-pointer">
                          <input type="checkbox" checked={selectedScopes.includes(scope.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedScopes(p => [...p, scope.id]);
                              else setSelectedScopes(p => p.filter(s => s !== scope.id));
                            }} className="rounded" />
                          <scope.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{scope.label}</span>
                          <code className="text-[9px] text-muted-foreground ml-auto">{scope.id}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newKeyName || selectedScopes.length === 0}>Generate Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Key Confirmation */}
      <Dialog open={showRotateConfirm} onOpenChange={setShowRotateConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-primary" /> Rotate API Key</DialogTitle>
            <DialogDescription>
              This will revoke "{keyToRotate?.name}" and create a new key with the same permissions. 
              Any integrations using the old key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRotateConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRotate}>Rotate Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expiry Dialog */}
      <Dialog open={showExpiryEdit} onOpenChange={setShowExpiryEdit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Set Key Expiry</DialogTitle>
            <DialogDescription>Set or update the expiry date for "{editingKey?.name}". Leave empty for no expiry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="date" value={newExpiryDate} onChange={e => setNewExpiryDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} />
            {newExpiryDate && <p className="text-[10px] text-muted-foreground">Key will auto-deactivate on {format(new Date(newExpiryDate), "MMM dd, yyyy")}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewExpiryDate(""); }}>Clear Expiry</Button>
            <Button onClick={handleExpiryUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Logs Tab ====================
function LogsTab({ selectedKeyId }: { selectedKeyId?: string }) {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: stats, isLoading } = useApiUsageStats(days, selectedKeyId);
  const isMobile = useIsMobile();

  const filteredLogs = useMemo(() => {
    if (!stats?.recentLogs) return [];
    return stats.recentLogs.filter((log: any) => {
      if (statusFilter === "4xx" && (log.status_code < 400 || log.status_code >= 500)) return false;
      if (statusFilter === "5xx" && log.status_code < 500) return false;
      if (statusFilter === "success" && log.status_code >= 400) return false;
      if (statusFilter === "error" && log.status_code < 400) return false;
      if (methodFilter !== "all" && log.method !== methodFilter) return false;
      if (searchTerm && !log.endpoint.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [stats?.recentLogs, statusFilter, methodFilter, searchTerm]);

  const handleExport = (format: "csv" | "json") => {
    if (!filteredLogs.length) { toast.error("No logs to export"); return; }
    if (format === "json") {
      const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `api-logs-${new Date().toISOString().split('T')[0]}.json`; a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["status_code", "method", "endpoint", "response_time_ms", "ip_address", "user_agent", "created_at"];
      const csv = [headers.join(","), ...filteredLogs.map((l: any) => headers.map(h => `"${l[h] ?? ''}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `api-logs-${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Exported ${filteredLogs.length} logs as ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Request Logs</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-lg leading-relaxed">
            Full request/response visibility with a dedicated inspector page for both mobile and desktop. Open any row to review method, endpoint, payloads, response output, and error context.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleExport("csv")}>
            <FileDown className="w-3 h-3" /> CSV
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleExport("json")}>
            <FileDown className="w-3 h-3" /> JSON
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search endpoints..." className="pl-8 h-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-auto h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success (2xx)</SelectItem>
            <SelectItem value="error">All Errors</SelectItem>
            <SelectItem value="4xx">Client Errors (4xx)</SelectItem>
            <SelectItem value="5xx">Server Errors (5xx)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-auto h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
          <SelectTrigger className="w-auto h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24h</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{filteredLogs.length} requests</span><span>•</span>
        <span>{filteredLogs.filter((l: any) => l.status_code >= 400 && l.status_code < 500).length} client errors</span><span>•</span>
        <span>{filteredLogs.filter((l: any) => l.status_code >= 500).length} server errors</span><span>•</span>
        <span>Avg {filteredLogs.length > 0 ? Math.round(filteredLogs.reduce((s: number, l: any) => s + (l.response_time_ms || 0), 0) / filteredLogs.length) : 0}ms</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16">
          <Terminal className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No Logs Found</p>
          <p className="text-xs text-muted-foreground mt-1">API request logs will appear here as calls are made.</p>
        </div>
      ) : (
        <div className="space-y-0 max-h-[500px] overflow-y-auto rounded-xl border border-border">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-2.5 bg-secondary/30 sticky top-0 z-10">
            <span className="w-12">Status</span>
            <span className="w-12">Method</span>
            <span className="flex-1">Endpoint</span>
            <span className="w-14 text-right">Time</span>
            <span className="w-24 text-right hidden md:block">Timestamp</span>
            <span className="w-6" />
          </div>
          {filteredLogs.map((log: any, i: number) => (
            <div key={log.id || i}>
              <div
                className="flex items-center gap-2 text-[11px] py-2.5 px-2.5 hover:bg-secondary/20 transition-colors border-t border-border/30 cursor-pointer active:scale-[0.99]"
                onClick={() => navigate(`/developer/logs/${log.id}`, { state: { log } })}
              >
                <Badge variant={log.status_code < 400 ? "default" : log.status_code < 500 ? "secondary" : "destructive"} className="text-[9px] w-12 justify-center font-mono">
                  {log.status_code}
                </Badge>
                <span className={cn("font-mono font-semibold w-12",
                  log.method === "GET" ? "text-emerald-500" : log.method === "POST" ? "text-blue-500" : "text-red-500"
                )}>{log.method}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-foreground block truncate">{log.endpoint}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {log.user_agent || "Open inspector to see the full request and response details."}
                  </span>
                </div>
                <span className="text-muted-foreground w-14 text-right font-mono">{log.response_time_ms}ms</span>
                <span className="text-muted-foreground w-24 text-right hidden md:block text-[10px]">{format(new Date(log.created_at), "HH:mm:ss")}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ==================== Docs Tab (Redirect) ====================
function DocsTabRedirect() {
  const navigate = useNavigate();
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

  const endpointGroups = [
    {
      label: "📁 Files & Folders",
      endpoints: [
        { m: "GET", p: "/files", d: "List files" },
        { m: "GET", p: "/files/:id", d: "Get file details" },
        { m: "GET", p: "/files/:id/details", d: "Full file metadata + tags + versions" },
        { m: "POST", p: "/files/upload", d: "Upload file (base64)" },
        { m: "DELETE", p: "/files/:id", d: "Delete file" },
        { m: "POST", p: "/folders", d: "Create folder" },
      ],
    },
    {
      label: "👤 User",
      endpoints: [
        { m: "GET", p: "/user/me", d: "Current user profile & storage" },
        { m: "GET", p: "/user/:id", d: "Public user profile" },
      ],
    },
    {
      label: "🏢 Workspaces",
      endpoints: [
        { m: "GET", p: "/workspaces", d: "List workspaces" },
        { m: "GET", p: "/workspaces/:id", d: "Workspace details" },
        { m: "GET", p: "/workspaces/:id/members", d: "Workspace members & roles" },
      ],
    },
    {
      label: "🤖 AI Services",
      endpoints: [
        { m: "POST", p: "/ai/analyze-image", d: "AI image analysis (Gemini)" },
      ],
    },
    {
      label: "🔗 Sharing & Tags",
      endpoints: [
        { m: "GET", p: "/shares", d: "List shares" },
        { m: "POST", p: "/shares", d: "Create share" },
        { m: "GET", p: "/tags", d: "List tags" },
        { m: "POST", p: "/tags", d: "Create tag" },
      ],
    },
    {
      label: "📊 Usage",
      endpoints: [
        { m: "GET", p: "/usage", d: "Usage statistics" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">API Documentation</h2>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
          Complete API reference with multi-language code examples, framework integration guides, and detailed endpoint documentation.
        </p>
      </div>

      <div className="p-6 rounded-xl border border-border bg-secondary/10 text-center">
        <BookOpen className="w-12 h-12 text-primary mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground mb-1">Full API Documentation</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
          View the complete API reference with code examples in JavaScript, Python, PHP, Go, and cURL.
        </p>
        <Button onClick={() => navigate("/developer/docs")} className="gap-2">
          <BookOpen className="w-4 h-4" /> Open Documentation <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">Base URL</h3>
        <div className="flex items-center gap-2 mt-2">
          <code className="text-[11px] font-mono bg-card px-2 py-1 rounded border border-border flex-1 truncate">{baseUrl}</code>
          <Button size="sm" variant="outline" className="h-7" onClick={() => { navigator.clipboard.writeText(baseUrl); toast.success("Copied!"); }}>
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">All Endpoints</h3>
          <Badge variant="outline" className="text-[9px]">{endpointGroups.reduce((s, g) => s + g.endpoints.length, 0)} endpoints</Badge>
        </div>
        <div className="space-y-4">
          {endpointGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{group.label}</p>
              <div className="space-y-1">
                {group.endpoints.map((ep, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1">
                    <Badge variant="outline" className={cn("text-[9px] font-mono w-14 justify-center",
                      ep.m === "GET" ? "text-emerald-500 border-emerald-500/30" : ep.m === "POST" ? "text-blue-500 border-blue-500/30" : "text-red-500 border-red-500/30"
                    )}>{ep.m}</Badge>
                    <code className="font-mono text-foreground flex-1">{ep.p}</code>
                    <span className="text-muted-foreground text-[10px] hidden sm:block">{ep.d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== Webhooks Tab ====================
function WebhooksTab() {
  const { data: webhooks, isLoading } = useApiWebhooks();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const toggleWebhook = useToggleWebhook();
  const [showCreate, setShowCreate] = useState(false);
  const [whUrl, setWhUrl] = useState("");
  const [whEvents, setWhEvents] = useState<string[]>(WEBHOOK_EVENTS.map(e => e.id));
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  const handleCreate = async () => {
    if (!whUrl) return;
    const result = await createWebhook.mutateAsync({ url: whUrl, events: whEvents });
    setShowCreate(false);
    setWhUrl("");
    if (result) setRevealedSecrets(p => new Set(p).add(result.id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Webhooks</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
            Receive real-time HTTP POST notifications when events occur. Each webhook includes a cryptographic secret for signature verification.
            Track delivery status and failure counts for each endpoint.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Webhook
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !webhooks?.length ? (
        <div className="text-center py-16">
          <Webhook className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No Webhooks</p>
          <p className="text-xs text-muted-foreground mt-1">Add a webhook to receive real-time event notifications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map(wh => (
            <div key={wh.id} className="p-4 rounded-xl border border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <code className="text-xs font-mono text-foreground truncate">{wh.url}</code>
                    <Badge variant={wh.is_active ? "default" : "secondary"} className="text-[9px]">
                      {wh.is_active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                    <span>Events: {(wh.events as string[])?.join(", ")}</span>
                    {wh.failure_count > 0 && (
                      <Badge variant="destructive" className="text-[9px]">{wh.failure_count} failures</Badge>
                    )}
                  </div>
                  {/* Webhook delivery info - Gap #6 */}
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    {wh.last_triggered_at ? (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <CheckCircle2 className="w-3 h-3" />
                        Last delivered {formatDistanceToNow(new Date(wh.last_triggered_at), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" /> Never triggered
                      </span>
                    )}
                    {wh.failure_count > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="w-3 h-3" />
                        {wh.failure_count} consecutive {wh.failure_count === 1 ? "failure" : "failures"}
                        {wh.failure_count >= 5 && " — webhook may be auto-disabled"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground">Secret:</span>
                    <code className="text-[10px] font-mono bg-card px-1.5 py-0.5 rounded border border-border">
                      {revealedSecrets.has(wh.id) ? wh.secret : "whsec_••••••••"}
                    </code>
                    <button onClick={() => setRevealedSecrets(p => {
                      const s = new Set(p); s.has(wh.id) ? s.delete(wh.id) : s.add(wh.id); return s;
                    })} className="text-muted-foreground hover:text-foreground">
                      {revealedSecrets.has(wh.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => toggleWebhook.mutate({ id: wh.id, is_active: !wh.is_active })}>
                    {wh.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteWebhook.mutate(wh.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Webhook</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Endpoint URL</label>
              <Input value={whUrl} onChange={e => setWhUrl(e.target.value)} placeholder="https://your-app.com/webhook" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">Events</label>
              <div className="space-y-1.5">
                {WEBHOOK_EVENTS.map(evt => (
                  <label key={evt.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/30 cursor-pointer">
                    <input type="checkbox" checked={whEvents.includes(evt.id)}
                      onChange={e => {
                        if (e.target.checked) setWhEvents(p => [...p, evt.id]);
                        else setWhEvents(p => p.filter(x => x !== evt.id));
                      }} className="rounded" />
                    <span className="text-xs font-medium">{evt.label}</span>
                    <code className="text-[9px] text-muted-foreground ml-auto">{evt.id}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!whUrl || whEvents.length === 0}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Subscription Countdown ====================
function SubscriptionCountdown({ expiresAt }: { expiresAt: Date }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return null;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const isUrgent = days <= 3;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs",
      isUrgent ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/30"
    )}>
      <Clock className={cn("w-3.5 h-3.5 shrink-0", isUrgent ? "text-destructive" : "text-primary")} />
      <span className={cn("font-mono font-semibold", isUrgent ? "text-destructive" : "text-foreground")}>
        {days > 0 && `${days}d `}{hours}h {minutes}m {seconds}s
      </span>
      <span className="text-muted-foreground">remaining</span>
      {isUrgent && <AlertTriangle className="w-3 h-3 text-destructive ml-auto" />}
    </div>
  );
}

// ==================== Billing Tab ====================
function BillingTab() {
  const { data: subscription, isLoading: subLoading } = useApiSubscription();
  const { data: paymentHistory, isLoading: historyLoading } = useApiPaymentHistory();
  const { data: usageStats } = useApiUsageStats(1);
  const initPayment = useInitPayment();
  const cancelSub = useCancelApiSubscription();
  const toggleRenew = useToggleAutoRenew();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const currentPlan = subscription?.plan || "free";
  const isActive = subscription?.status === "active";
  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  const planInfo = API_PLANS.find(p => {
    if (currentPlan === "free") return p.id === "free";
    if (currentPlan === "pro") return p.id === "api-pro";
    if (currentPlan === "enterprise") return p.id === "api-enterprise";
    return false;
  }) || API_PLANS[0];

  const todayCalls = usageStats?.totalCalls || 0;

  const handleUpgrade = async (planId: string) => {
    if (planId === "free") return;
    setSelectedPlan(planId);
    try {
      const result = await initPayment.mutateAsync(planId);
      if (result.payment_url) window.location.href = result.payment_url;
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Billing & Subscription Plans</h2>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
          Manage your API subscription tier, view payment history, and monitor usage against your plan limits.
        </p>
      </div>

      {subLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Current Plan: {planInfo.name}</h3>
                {isActive && !isExpired && <Badge className="text-[9px]">Active</Badge>}
                {isExpired && <Badge variant="destructive" className="text-[9px]">Expired</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">Rate Limit: {planInfo.rpm === -1 ? "Unlimited" : `${planInfo.rpm} RPM`}</p>
              {expiresAt && !isExpired && (
                <div className="space-y-1.5 mt-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Renews {format(expiresAt, "MMM dd, yyyy")}
                  </p>
                  <SubscriptionCountdown expiresAt={expiresAt} />
                </div>
              )}
            </div>
            {currentPlan !== "free" && isActive && (
              <div className="flex flex-col gap-1 items-end">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Auto-renew</span>
                  <Switch checked={subscription?.auto_renew ?? true} onCheckedChange={(v) => toggleRenew.mutate(v)} />
                </div>
                <Button size="sm" variant="ghost" className="text-xs text-destructive h-7" onClick={() => cancelSub.mutate()}>
                  <XCircle className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Today's Calls</span>
              <span className="font-semibold text-foreground">{todayCalls}</span>
            </div>
            {planInfo.rpm !== -1 && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Rate limit</span><span>{planInfo.rpm} RPM</span>
                </div>
                <Progress value={0} className="h-1.5" />
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">Choose a Plan</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {API_PLANS.map((plan, i) => {
            const isCurrent = (currentPlan === "free" && plan.id === "free") ||
              (currentPlan === "pro" && plan.id === "api-pro") ||
              (currentPlan === "enterprise" && plan.id === "api-enterprise");
            const isLoading = selectedPlan === plan.id && initPayment.isPending;
            const isPro = plan.id === "api-pro";
            const isEnt = plan.id === "api-enterprise";

            return (
              <motion.div key={plan.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/20",
                  isPro && !isCurrent && "border-primary/30"
                )}>
                {isPro && <Badge className="text-[8px] mb-2">POPULAR</Badge>}
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  {isEnt && <Crown className="w-3.5 h-3.5 text-amber-500" />}{plan.name}
                </h4>
                <div className="mt-2 mb-3">
                  {plan.amount === 0 ? (
                    <p className="text-2xl font-bold text-foreground">Free</p>
                  ) : (
                    <p className="text-2xl font-bold text-foreground">৳{plan.amount.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                  )}
                </div>
                <div className="space-y-1.5 mb-4">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /><span>{f}</span>
                    </div>
                  ))}
                </div>
                {isCurrent ? (
                  <Button size="sm" variant="outline" className="w-full text-xs" disabled>Current Plan</Button>
                ) : plan.id === "free" ? (
                  <Button size="sm" variant="ghost" className="w-full text-xs" disabled>Default</Button>
                ) : (
                  <Button size="sm" className="w-full text-xs" onClick={() => handleUpgrade(plan.id)} disabled={initPayment.isPending}>
                    {isLoading ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Processing</> :
                      <><CreditCard className="w-3 h-3 mr-1" /> Upgrade — ৳{plan.amount.toLocaleString()}</>}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Payment History - Gap #10 improved empty state */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">Payment History</h3>
        {historyLoading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : !paymentHistory?.length ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl bg-secondary/5">
            <CreditCard className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No Payment History</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Your payment transactions will appear here after upgrading to a paid plan. 
              Currently on the Free tier — no charges apply.
            </p>
            <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              View Plans Above
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {paymentHistory.map(txn => (
              <div key={txn.id} className="flex items-center gap-3 text-xs p-3 rounded-xl border border-border hover:bg-secondary/20">
                <Badge variant={txn.status === "completed" ? "default" : txn.status === "pending" ? "secondary" : "destructive"}
                  className="text-[9px] w-20 justify-center capitalize">{txn.status}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground capitalize">{txn.plan.replace(/-/g, " ")}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(txn.created_at), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <p className="font-bold text-foreground shrink-0">৳{Number(txn.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Utilities ====================
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, s = bytes;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(1)} ${units[i]}`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
