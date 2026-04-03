import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Store, Download, Heart, Eye, FileText, TrendingUp,
  MessageCircle, Upload, ExternalLink, Trash2, BarChart3, Clock,
  Package, Activity, ChevronRight, Plus, Star, Users, Zap, PieChart, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyMarketplaceListings, useUnpublishListing, useMarketplaceAnalytics } from "@/hooks/useMarketplace";
import { useChats, useUnreadChatCount } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNavbar } from "@/components/BottomNavbar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function formatSize(bytes: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, s = bytes;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(1)} ${units[i]}`;
}

export default function MarketplaceDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: listings, isLoading } = useMyMarketplaceListings();
  const { data: chats } = useChats();
  const { data: unreadCount } = useUnreadChatCount();
  const unpublish = useUnpublishListing();
  const [activeTab, setActiveTab] = useState("overview");
  const [chartRange, setChartRange] = useState<"7d" | "30d" | "all">("30d");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const listingIds = useMemo(() => (listings || []).map((l: any) => l.id), [listings]);
  const analyticsDays = chartRange === "7d" ? 7 : chartRange === "30d" ? 30 : 90;
  const { data: analyticsData } = useMarketplaceAnalytics(listingIds, analyticsDays);
  const selectedFileIds = useMemo(() => selectedFileId ? [selectedFileId] : [], [selectedFileId]);
  const { data: fileAnalyticsData } = useMarketplaceAnalytics(selectedFileIds, 30);

  const fileChartData = useMemo(() => {
    if (!fileAnalyticsData?.length) return [];
    const now = Date.now();
    const dateMap: Record<string, { downloads: number; likes: number; saves: number }> = {};
    fileAnalyticsData.forEach(row => {
      dateMap[row.date] = { downloads: row.downloads, likes: row.likes, saves: row.saves };
    });
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now - (29 - i) * 86400000);
      const dateKey = date.toISOString().split("T")[0];
      const dayStr = date.toLocaleDateString("en", { month: "short", day: "numeric" });
      const stats = dateMap[dateKey] || { downloads: 0, likes: 0, saves: 0 };
      return { date: dayStr, downloads: stats.downloads, likes: stats.likes, saves: stats.saves };
    });
  }, [fileAnalyticsData]);

  const selectedFile = useMemo(() => {
    if (!selectedFileId || !listings) return null;
    return listings.find((l: any) => l.id === selectedFileId) || null;
  }, [selectedFileId, listings]);

  const metrics = useMemo(() => {
    if (!listings) return { totalFiles: 0, totalDownloads: 0, totalLikes: 0, totalSaves: 0 };
    return {
      totalFiles: listings.length,
      totalDownloads: listings.reduce((s: number, l: any) => s + (l.download_count || 0), 0),
      totalLikes: listings.reduce((s: number, l: any) => s + (l.like_count || 0), 0),
      totalSaves: listings.reduce((s: number, l: any) => s + (l.save_count || 0), 0),
    };
  }, [listings]);

  const chartData = useMemo(() => {
    const days = analyticsDays;
    const now = Date.now();
    const dateMap: Record<string, { downloads: number; likes: number; saves: number }> = {};
    (analyticsData || []).forEach(row => {
      if (!dateMap[row.date]) dateMap[row.date] = { downloads: 0, likes: 0, saves: 0 };
      dateMap[row.date].downloads += row.downloads;
      dateMap[row.date].likes += row.likes;
      dateMap[row.date].saves += row.saves;
    });
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(now - (days - 1 - i) * 86400000);
      const dateKey = date.toISOString().split("T")[0];
      const dayStr = date.toLocaleDateString("en", { month: "short", day: "numeric" });
      const stats = dateMap[dateKey] || { downloads: 0, likes: 0, saves: 0 };
      return { date: dayStr, downloads: stats.downloads, likes: stats.likes };
    });
  }, [analyticsData, analyticsDays]);

  const myChats = useMemo(() => {
    if (!chats || !user) return [];
    return chats.filter(c => c.product_id);
  }, [chats, user]);

  const activityFeed = useMemo(() => {
    if (!listings) return [];
    return listings
      .slice(0, 10)
      .map((l: any) => ({ id: l.id, title: l.title, downloads: l.download_count, likes: l.like_count, date: l.updated_at || l.created_at }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [listings]);

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3, desc: "Performance summary & key metrics" },
    { id: "files", label: "My Files", icon: Package, desc: "Manage published listings" },
    { id: "analytics", label: "File Analytics", icon: PieChart, desc: "Per-file daily breakdown" },
    { id: "chats", label: "Messages", icon: MessageCircle, badge: unreadCount, desc: "Buyer conversations" },
    { id: "activity", label: "Activity", icon: Activity, desc: "Recent engagement timeline" },
  ];

  // ─── Desktop Sidebar ─────────────────────────────────
  const renderSidebar = () => (
    <div className="w-60 shrink-0 border-r border-border/40 bg-card/30 min-h-screen p-4 space-y-1">
      <div className="flex items-center gap-2 px-2 py-3 mb-3">
        <Store className="w-5 h-5 text-primary" />
        <div>
          <span className="font-bold text-sm text-foreground block">Creator Studio</span>
          <span className="text-[10px] text-muted-foreground">Manage your marketplace presence</span>
        </div>
      </div>

      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">Navigation</p>

      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
            activeTab === tab.id
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <tab.icon className="w-4 h-4 shrink-0" />
          <div className="flex-1 text-left">
            <span className="block text-xs">{tab.label}</span>
            {activeTab === tab.id && (
              <span className="block text-[9px] text-primary/70 font-normal">{tab.desc}</span>
            )}
          </div>
          {tab.badge ? (
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {tab.badge > 99 ? "99+" : tab.badge}
            </span>
          ) : null}
        </button>
      ))}

      <div className="pt-4 mt-4 border-t border-border/40 space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">Quick Links</p>
        <button onClick={() => navigate("/marketplace")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
          <ExternalLink className="w-4 h-4" /> Browse Marketplace
        </button>
        <button onClick={() => navigate("/")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Upload className="w-4 h-4" /> My Storage
        </button>
      </div>

      {/* Stats summary */}
      <div className="pt-4 mt-4 border-t border-border/40 px-3 space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Quick Stats</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Files</span>
          <span className="font-bold text-foreground">{metrics.totalFiles}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Downloads</span>
          <span className="font-bold text-foreground">{formatCount(metrics.totalDownloads)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Likes</span>
          <span className="font-bold text-foreground">{formatCount(metrics.totalLikes)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Unread</span>
          <span className="font-bold text-primary">{unreadCount || 0}</span>
        </div>
      </div>
    </div>
  );

  // ─── Overview Tab ─────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back! Here's a comprehensive summary of your marketplace performance.
          Track downloads, likes, saves, and engagement trends across all your published content.
        </p>
      </div>

      {/* Metrics — text-based, no cards */}
      <div className="border-t border-border/40 pt-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Key Performance Indicators</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Package, label: "Published Files", value: formatCount(metrics.totalFiles), desc: "Total active listings", color: "text-primary" },
            { icon: Download, label: "Total Downloads", value: formatCount(metrics.totalDownloads), desc: "All-time file downloads", color: "text-green-500" },
            { icon: Heart, label: "Total Likes", value: formatCount(metrics.totalLikes), desc: "Community appreciation", color: "text-red-500" },
            { icon: Star, label: "Total Saves", value: formatCount(metrics.totalSaves), desc: "Bookmarked by users", color: "text-amber-500" },
          ].map((m, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <m.icon className={cn("w-4 h-4", m.color)} />
                <span className="text-[10px] text-muted-foreground font-medium">{m.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="border-t border-border/40 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Performance Trends</h3>
            <p className="text-[10px] text-muted-foreground">Daily downloads and likes over time. Use the range selector to zoom in or out.</p>
          </div>
          <div className="flex gap-1">
            {(["7d", "30d", "all"] as const).map(r => (
              <button
                key={r}
                onClick={() => setChartRange(r)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors",
                  chartRange === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="likeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <ReTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              <Area type="monotone" dataKey="downloads" stroke="hsl(var(--primary))" fill="url(#dlGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="likes" stroke="#ef4444" fill="url(#likeGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Downloads</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Likes</span>
        </div>
      </div>

      {/* Top performing files — text-based */}
      <div className="border-t border-border/40 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Top Performing Files</h3>
            <p className="text-[10px] text-muted-foreground">Your most popular content ranked by combined engagement score (downloads + likes).</p>
          </div>
          <button onClick={() => setActiveTab("files")} className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : (
          <div className="space-y-0.5">
            {(listings || [])
              .sort((a: any, b: any) => (b.download_count + b.like_count) - (a.download_count + a.like_count))
              .slice(0, 5)
              .map((listing: any, idx: number) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(`/marketplace/${listing.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground">{idx + 1}</span>
                  <span className="text-base">{listing.marketplace_categories?.icon || "📁"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{listing.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {listing.files?.mime_type?.split("/")[1] || "file"} • {formatSize(listing.files?.size)} • {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground shrink-0">
                    <span className="flex items-center gap-0.5"><Download className="w-3 h-3" /> {listing.download_count}</span>
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {listing.like_count}</span>
                  </div>
                </motion.div>
              ))}
          </div>
        )}
      </div>

      {/* Quick Actions — text-based */}
      <div className="border-t border-border/40 pt-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Publish New File
          </button>
          <button onClick={() => navigate("/marketplace")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors">
            <Store className="w-3.5 h-3.5" /> Browse Marketplace
          </button>
          <button onClick={() => navigate("/marketplace/chat")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors relative">
            <MessageCircle className="w-3.5 h-3.5" /> Open Inbox
            {(unreadCount || 0) > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Files Tab ────────────────────────────────────────
  const renderFiles = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Published Files</h2>
        <p className="text-sm text-muted-foreground">
          Manage all your marketplace listings. You have {metrics.totalFiles} files published with a combined {formatCount(metrics.totalDownloads)} downloads.
          Click on any file to view its public listing, or use the actions to manage visibility and remove content.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : !listings?.length ? (
        <div className="text-center py-16">
          <Package className="w-14 h-14 text-muted-foreground/15 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-1">No published files yet</h3>
          <p className="text-xs text-muted-foreground mb-3">Start sharing your work with the community. Go to your storage, select a file, and publish it to the marketplace.</p>
          <Button size="sm" onClick={() => navigate("/")}>Go to My Files</Button>
        </div>
      ) : (
        <div className="space-y-1 border-t border-border/40 pt-3">
          {listings.map((listing: any, idx: number) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors group"
            >
              <span className="text-base shrink-0">{listing.marketplace_categories?.icon || "📁"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{listing.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                  <Badge variant={listing.status === "active" ? "default" : "secondary"} className="text-[9px] px-1.5 py-0">
                    {listing.visibility}
                  </Badge>
                  <span>{listing.files?.mime_type?.split("/")[1] || "file"}</span>
                  <span>•</span>
                  <span>{formatSize(listing.files?.size)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Download className="w-3 h-3" /> {listing.download_count} downloads</span>
                  <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {listing.like_count} likes</span>
                  <span className="flex items-center gap-0.5"><Star className="w-3 h-3" /> {listing.save_count} saves</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => navigate(`/marketplace/${listing.id}`)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground" title="View">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => navigate(`/marketplace/chat`)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground" title="Chats">
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button onClick={() => { if (confirm("Remove from marketplace?")) unpublish.mutate(listing.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Unpublish">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Chats Tab ────────────────────────────────────────
  const renderChats = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Messages</h2>
        <p className="text-sm text-muted-foreground">
          All conversations with buyers interested in your files. You have {myChats.length} active conversations
          {(unreadCount || 0) > 0 ? ` and ${unreadCount} unread messages waiting for your response` : ""}.
          Click "Open Inbox" for the full messaging experience with real-time chat.
        </p>
      </div>

      <Button size="sm" variant="outline" onClick={() => navigate("/marketplace/chat")} className="gap-1.5 text-xs">
        <ExternalLink className="w-3.5 h-3.5" /> Open Full Inbox
      </Button>

      {myChats.length === 0 ? (
        <div className="text-center py-16 border-t border-border/40 mt-3">
          <MessageCircle className="w-14 h-14 text-muted-foreground/15 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-1">No conversations yet</h3>
          <p className="text-xs text-muted-foreground">When users contact you about your published files, conversations will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-0.5 border-t border-border/40 pt-3">
          {myChats.slice(0, 10).map((chat, idx) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => navigate(`/marketplace/chat`)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {(chat.other_user?.display_name || chat.other_user?.email || "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn("text-sm truncate", (chat.unread_count || 0) > 0 ? "font-bold text-foreground" : "font-medium text-foreground")}>
                    {chat.other_user?.display_name || chat.other_user?.email || "User"}
                  </p>
                  {(chat.unread_count || 0) > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.last_message || "No messages yet"}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {chat.last_message_at ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true }) : ""}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Activity Tab ─────────────────────────────────────
  const renderActivity = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Activity Timeline</h2>
        <p className="text-sm text-muted-foreground">
          A chronological view of your content's performance. See which files are gaining traction
          and track engagement patterns over time. Each entry shows cumulative stats.
        </p>
      </div>

      {activityFeed.length === 0 ? (
        <div className="text-center py-16 border-t border-border/40">
          <Activity className="w-14 h-14 text-muted-foreground/15 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-1">No activity yet</h3>
          <p className="text-xs text-muted-foreground">Activity will appear once your files get engagement from the community.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-3 border-t border-border/40 pt-4">
          <div className="absolute left-2.5 top-5 bottom-1 w-px bg-border" />
          {activityFeed.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative"
            >
              <div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
              <div className="p-2.5 rounded-lg hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground truncate">{item.title}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Download className="w-3 h-3" /> {item.downloads} downloads</span>
                  <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {item.likes} likes</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Engagement chart */}
      {listings && listings.length > 0 && (
        <div className="border-t border-border/40 pt-4">
          <h3 className="text-sm font-bold text-foreground mb-1">Engagement by File</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Compare performance across your top files. Each bar represents total downloads and likes.</p>
          <div className="h-40 md:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(listings || []).slice(0, 8).map((l: any) => ({
                name: l.title?.slice(0, 12) || "File",
                downloads: l.download_count || 0,
                likes: l.like_count || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <ReTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="downloads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="likes" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );

  // ─── File Analytics Tab ────────────────────────────────
  const renderFileAnalytics = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Per-File Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Dive deep into individual file performance. Select any published file below to see its 30-day daily breakdown
          of downloads, likes, and saves. Use this data to understand which content resonates most with your audience.
        </p>
      </div>

      {/* File selector — text-based */}
      <div className="space-y-0.5 border-t border-border/40 pt-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Select a File</p>
        {(listings || []).map((listing: any) => (
          <button
            key={listing.id}
            onClick={() => setSelectedFileId(selectedFileId === listing.id ? null : listing.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
              selectedFileId === listing.id
                ? "bg-primary/5 text-primary"
                : "hover:bg-secondary/30 text-foreground"
            )}
          >
            <span className="text-base shrink-0">{listing.marketplace_categories?.icon || "📁"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{listing.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span className="flex items-center gap-0.5"><Download className="w-3 h-3" /> {listing.download_count}</span>
                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {listing.like_count}</span>
                <span className="flex items-center gap-0.5"><Star className="w-3 h-3" /> {listing.save_count}</span>
              </div>
            </div>
            {selectedFileId === listing.id && <ArrowUpRight className="w-4 h-4 text-primary shrink-0" />}
          </button>
        ))}
      </div>

      {/* Selected file analytics */}
      {selectedFile && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 border-t border-border/40 pt-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">{(selectedFile as any).title} — Daily Performance</h3>
            <p className="text-[10px] text-muted-foreground">Showing the last 30 days of activity. Each data point represents one day's engagement metrics.</p>
          </div>

          {/* Stats — text-based */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Download, label: "Downloads", value: (selectedFile as any).download_count, color: "text-primary" },
              { icon: Heart, label: "Likes", value: (selectedFile as any).like_count, color: "text-red-500" },
              { icon: Star, label: "Saves", value: (selectedFile as any).save_count, color: "text-amber-500" },
            ].map((m, i) => (
              <div key={i}>
                <div className="flex items-center gap-1">
                  <m.icon className={cn("w-3.5 h-3.5", m.color)} />
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Daily chart */}
          <div className="pt-2">
            {fileChartData.length > 0 ? (
              <div className="h-48 md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fileChartData}>
                    <defs>
                      <linearGradient id="fileDlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fileLikeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fileSaveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                    <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <ReTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="downloads" stroke="hsl(var(--primary))" fill="url(#fileDlGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="likes" stroke="#ef4444" fill="url(#fileLikeGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="saves" stroke="#f59e0b" fill="url(#fileSaveGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                No daily data recorded yet — interactions will appear here as users engage with this file.
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Downloads</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Likes</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Saves</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate(`/marketplace/${selectedFileId}`)}>
              <Eye className="w-3.5 h-3.5" /> View Listing
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate(`/marketplace/chat`)}>
              <MessageCircle className="w-3.5 h-3.5" /> View Chats
            </Button>
          </div>
        </motion.div>
      )}

      {!selectedFile && listings && listings.length > 0 && (
        <div className="text-center py-8">
          <PieChart className="w-12 h-12 text-muted-foreground/15 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Select a file above to see its detailed daily analytics</p>
        </div>
      )}

      {!listings?.length && (
        <div className="text-center py-16">
          <Package className="w-14 h-14 text-muted-foreground/15 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-1">No published files</h3>
          <p className="text-xs text-muted-foreground">Publish files to see their detailed analytics breakdown.</p>
        </div>
      )}
    </div>
  );

  const tabContent: Record<string, () => JSX.Element> = {
    overview: renderOverview,
    files: renderFiles,
    analytics: renderFileAnalytics,
    chats: renderChats,
    activity: renderActivity,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-3 h-14">
          <button onClick={() => navigate("/marketplace")} className="p-1.5 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <Store className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-foreground text-lg">Creator Studio</h1>
        </div>
      </div>

      <div className="flex-1 flex">
        {!isMobile && renderSidebar()}

        <div className="flex-1 min-w-0">
          {isMobile && (
            <div className="sticky top-14 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-2">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                      activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.badge ? (
                      <span className="w-4 h-4 rounded-full bg-background text-primary text-[9px] font-bold flex items-center justify-center">
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 md:p-6 max-w-4xl">
            {tabContent[activeTab]?.()}
          </div>
        </div>
      </div>

      {isMobile && <div className="h-20" />}
      {isMobile && <BottomNavbar activeItem="menu" onItemClick={() => {}} onUploadClick={() => {}} />}
    </div>
  );
}
