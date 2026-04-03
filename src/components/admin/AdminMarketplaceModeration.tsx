import { useState, useMemo } from "react";
import { Store, Search, Eye, EyeOff, Trash2, Star, StarOff, Flag, CheckCircle, XCircle, Edit3, Save, Ban, ShieldCheck, Square, CheckSquare, BarChart3, ChevronDown, ChevronUp, Plus, GripVertical, AlertTriangle, TrendingUp, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { aestheticTooltipStyle, aestheticAxisTick, ChartGradient } from "@/components/ui/aesthetic-chart";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";

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

// Suspicious content patterns
const SUSPICIOUS_PATTERNS = [
  /free\s*(money|cash|bitcoin|crypto)/i,
  /click\s*here/i,
  /earn\s*\$?\d+/i,
  /(hack|crack|keygen|warez|pirat)/i,
  /(porn|xxx|nude|nsfw)/i,
  /\b(scam|fraud)\b/i,
  /(whatsapp|telegram)\s*group/i,
];

function checkContentFlags(title: string, description: string | null): string[] {
  const flags: string[] = [];
  const text = `${title} ${description || ""}`;
  SUSPICIOUS_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      flags.push(pattern.source.replace(/\\s\*/g, " ").replace(/[\\()]/g, "").slice(0, 30));
    }
  });
  return flags;
}

type TabId = "listings" | "reports" | "categories" | "analytics" | "banned";

export function AdminMarketplaceModeration() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("listings");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "featured" | "flagged">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingListing, setEditingListing] = useState<{ id: string; title: string; description: string } | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📁");
  const [editingCat, setEditingCat] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [banTarget, setBanTarget] = useState<{ userId: string; email: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [deleteCatTarget, setDeleteCatTarget] = useState<{ id: string; name: string } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [listingPage, setListingPage] = useState(0);
  const LISTING_PAGE_SIZE = 20;

  // ─── QUERIES ───
  const { data: listings } = useQuery({
    queryKey: ["admin_marketplace_listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin_profiles_map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, display_name, marketplace_banned, marketplace_banned_reason, marketplace_banned_at");
      if (error) throw error;
      const map: Record<string, any> = {};
      data.forEach((p: any) => { map[p.id] = p; });
      return map;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin_marketplace_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketplace_categories").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["admin_marketplace_reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketplace_reports").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: dailyAnalytics } = useQuery({
    queryKey: ["admin_marketplace_daily_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketplace_daily_analytics").select("*").order("date", { ascending: true }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  // ─── DERIVED DATA ───
  const flaggedListings = useMemo(() => {
    return (listings ?? []).filter((l: any) => {
      const flags = checkContentFlags(l.title, l.description);
      return flags.length > 0;
    });
  }, [listings]);

  const filtered = useMemo(() => {
    let result = listings ?? [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l: any) => l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q));
    }
    if (statusFilter === "active") result = result.filter((l: any) => l.status === "active");
    else if (statusFilter === "suspended") result = result.filter((l: any) => l.status === "suspended");
    else if (statusFilter === "featured") result = result.filter((l: any) => (l as any).is_featured);
    else if (statusFilter === "flagged") result = flaggedListings;
    return result;
  }, [listings, searchQuery, statusFilter, flaggedListings]);

  const pendingReports = useMemo(() => (reports ?? []).filter((r: any) => r.status === "pending"), [reports]);

  const analyticsChartData = useMemo(() => {
    if (!dailyAnalytics) return [];
    const dateMap: Record<string, { date: string; downloads: number; likes: number; saves: number }> = {};
    dailyAnalytics.forEach((a: any) => {
      if (!dateMap[a.date]) dateMap[a.date] = { date: a.date, downloads: 0, likes: 0, saves: 0 };
      dateMap[a.date].downloads += a.downloads || 0;
      dateMap[a.date].likes += a.likes || 0;
      dateMap[a.date].saves += a.saves || 0;
    });
    return Object.values(dateMap).slice(-30).map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  }, [dailyAnalytics]);

  const topListings = useMemo(() => {
    return [...(listings ?? [])].sort((a: any, b: any) => (b.download_count || 0) - (a.download_count || 0)).slice(0, 10);
  }, [listings]);

  const bannedUsers = useMemo(() => {
    if (!profiles) return [];
    return Object.values(profiles).filter((p: any) => p.marketplace_banned);
  }, [profiles]);

  const totalListings = listings?.length ?? 0;
  const activeCount = (listings ?? []).filter((l: any) => l.status === "active").length;
  const suspendedCount = (listings ?? []).filter((l: any) => l.status === "suspended").length;
  const featuredCount = (listings ?? []).filter((l: any) => (l as any).is_featured).length;
  const totalDownloads = (listings ?? []).reduce((s: number, l: any) => s + (l.download_count || 0), 0);
  const totalLikes = (listings ?? []).reduce((s: number, l: any) => s + (l.like_count || 0), 0);

  // ─── ACTIONS ───
  const logAction = async (action: string, details: any) => {
    if (!currentUser) return;
    await supabase.from("admin_action_logs").insert({ admin_id: currentUser.id, action, details });
  };

  const handleAction = async (listingId: string, action: "suspend" | "activate" | "delete") => {
    try {
      if (action === "delete") {
        const { error } = await supabase.from("marketplace_listings").delete().eq("id", listingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketplace_listings").update({ status: action === "suspend" ? "suspended" : "active" }).eq("id", listingId);
        if (error) throw error;
      }
      await logAction(`marketplace_${action}`, { listing_id: listingId });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_listings"] });
      toast.success(`Listing ${action === "delete" ? "deleted" : action === "suspend" ? "suspended" : "activated"}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleFeatured = async (listingId: string, currentlyFeatured: boolean) => {
    try {
      const { error } = await supabase.from("marketplace_listings").update({ is_featured: !currentlyFeatured } as any).eq("id", listingId);
      if (error) throw error;
      await logAction(currentlyFeatured ? "marketplace_unfeature" : "marketplace_feature", { listing_id: listingId });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_listings"] });
      toast.success(currentlyFeatured ? "Removed from featured" : "Marked as featured");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingListing) return;
    try {
      const { error } = await supabase.from("marketplace_listings").update({
        title: editingListing.title.trim(),
        description: editingListing.description.trim(),
      }).eq("id", editingListing.id);
      if (error) throw error;
      await logAction("marketplace_edit_override", { listing_id: editingListing.id });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_listings"] });
      toast.success("Listing updated");
      setEditingListing(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: "suspend" | "activate" | "delete") => {
    if (selectedIds.size === 0) return;
    if (action === "delete") { setBulkDeleteConfirm(true); return; }
    try {
      for (const id of selectedIds) {
        await supabase.from("marketplace_listings").update({ status: action === "suspend" ? "suspended" : "active" }).eq("id", id);
      }
      await logAction(`marketplace_bulk_${action}`, { count: selectedIds.size, ids: Array.from(selectedIds) });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_listings"] });
      toast.success(`${selectedIds.size} listings ${action === "suspend" ? "suspended" : "activated"}`);
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBulkDeleteListings = async () => {
    try {
      for (const id of selectedIds) {
        await supabase.from("marketplace_listings").delete().eq("id", id);
      }
      await logAction("marketplace_bulk_delete", { count: selectedIds.size, ids: Array.from(selectedIds) });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_listings"] });
      toast.success(`${selectedIds.size} listings deleted`);
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Report actions
  const handleResolveReport = async (reportId: string, action: "resolved" | "dismissed") => {
    try {
      const { error } = await supabase.from("marketplace_reports").update({
        status: action,
        resolved_by: currentUser?.id,
        resolved_at: new Date().toISOString(),
      } as any).eq("id", reportId);
      if (error) throw error;
      await logAction(`marketplace_report_${action}`, { report_id: reportId });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_reports"] });
      toast.success(`Report ${action}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Category actions
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const maxOrder = (categories ?? []).reduce((max: number, c: any) => Math.max(max, c.sort_order || 0), 0);
      const { error } = await supabase.from("marketplace_categories").insert({
        name: newCatName.trim(),
        icon: newCatIcon || "📁",
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
      await logAction("marketplace_add_category", { name: newCatName.trim() });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_categories"] });
      toast.success("Category added");
      setNewCatName("");
      setNewCatIcon("📁");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCat) return;
    try {
      const { error } = await supabase.from("marketplace_categories").update({
        name: editingCat.name.trim(),
        icon: editingCat.icon,
      }).eq("id", editingCat.id);
      if (error) throw error;
      await logAction("marketplace_update_category", { id: editingCat.id, name: editingCat.name });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_categories"] });
      toast.success("Category updated");
      setEditingCat(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    try {
      const { error } = await supabase.from("marketplace_categories").delete().eq("id", catId);
      if (error) throw error;
      await logAction("marketplace_delete_category", { id: catId, name: catName });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_categories"] });
      toast.success("Category deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReorderCategory = async (catId: string, direction: "up" | "down") => {
    if (!categories) return;
    const idx = categories.findIndex((c: any) => c.id === catId);
    if ((direction === "up" && idx <= 0) || (direction === "down" && idx >= categories.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const a = categories[idx];
    const b = categories[swapIdx];
    try {
      await supabase.from("marketplace_categories").update({ sort_order: b.sort_order }).eq("id", a.id);
      await supabase.from("marketplace_categories").update({ sort_order: a.sort_order }).eq("id", b.id);
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_categories"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Ban user from marketplace
  const handleBanUser = async () => {
    if (!banTarget) return;
    try {
      const { error } = await supabase.from("profiles").update({
        marketplace_banned: true,
        marketplace_banned_at: new Date().toISOString(),
        marketplace_banned_reason: banReason || "Policy violation",
      } as any).eq("id", banTarget.userId);
      if (error) throw error;
      // Suspend all their listings
      await supabase.from("marketplace_listings").update({ status: "suspended" }).eq("user_id", banTarget.userId);
      await logAction("marketplace_ban_user", { user_id: banTarget.userId, reason: banReason });
      queryClient.invalidateQueries({ queryKey: ["admin_profiles_map"] });
      queryClient.invalidateQueries({ queryKey: ["admin_marketplace_listings"] });
      toast.success("User banned from marketplace");
      setBanTarget(null);
      setBanReason("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const { error } = await supabase.from("profiles").update({
        marketplace_banned: false,
        marketplace_banned_at: null,
        marketplace_banned_reason: null,
      } as any).eq("id", userId);
      if (error) throw error;
      await logAction("marketplace_unban_user", { user_id: userId });
      queryClient.invalidateQueries({ queryKey: ["admin_profiles_map"] });
      toast.success("User unbanned");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "listings", label: "Listings" },
    { id: "reports", label: "Reports", badge: pendingReports.length },
    { id: "categories", label: "Categories" },
    { id: "analytics", label: "Analytics" },
    { id: "banned", label: "Banned", badge: bannedUsers.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Store className="w-4.5 h-4.5 text-primary" />
          Marketplace Moderation
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalListings} listings · {activeCount} active · {suspendedCount} suspended · {featuredCount} featured · ↓{totalDownloads} · ♥{totalLikes}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Complete marketplace governance. Review and moderate listings, manage report queue, control categories, 
          feature top content, ban policy violators, and monitor engagement analytics. All actions are audit-logged.
          Content policy flags automatically scan titles and descriptions for suspicious keywords.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("px-3 py-2 rounded-xl text-[11px] font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}>
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                activeTab === tab.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive/10 text-destructive"
              )}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── LISTINGS TAB ─── */}
      {activeTab === "listings" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search listings by title or description..."
                className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(["all", "active", "suspended", "featured", "flagged"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn("px-2.5 py-2 rounded-xl text-[10px] font-medium transition-colors capitalize flex items-center gap-1",
                    statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}>
                  {s === "flagged" && <AlertTriangle className="w-3 h-3" />}
                  {s}{s === "flagged" && ` (${flaggedListings.length})`}
                </button>
              ))}
              <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                className={cn("px-2.5 py-2 rounded-xl text-[10px] font-medium transition-colors flex items-center gap-1",
                  bulkMode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}>
                <CheckSquare className="w-3 h-3" /> Bulk
              </button>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {bulkMode && selectedIds.size > 0 && (
            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-foreground">{selectedIds.size} selected</span>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleBulkAction("suspend")}>
                <EyeOff className="w-3 h-3" /> Suspend
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleBulkAction("activate")}>
                <Eye className="w-3 h-3" /> Activate
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-destructive" onClick={() => handleBulkAction("delete")}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { setSelectedIds(new Set()); setBulkMode(false); }}>
                <XCircle className="w-3 h-3" /> Cancel
              </Button>
            </div>
          )}

          {/* Edit Listing Override */}
          {editingListing && (
            <div className="p-4 rounded-xl border border-chart-1/30 bg-chart-1/5 space-y-3">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-chart-1" /> Edit Listing Override
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Modify the listing title and description directly. The original creator will see the changes.
              </p>
              <input type="text" value={editingListing.title} onChange={(e) => setEditingListing({ ...editingListing, title: e.target.value })}
                placeholder="Title..."
                className="w-full h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
              <textarea value={editingListing.description} onChange={(e) => setEditingListing({ ...editingListing, description: e.target.value })}
                placeholder="Description..."
                rows={3}
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none" />
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSaveEdit}><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingListing(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Ban User Inline */}
          {banTarget && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Ban className="w-4 h-4 text-destructive" /> Ban User from Marketplace
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Banning <strong className="text-foreground">{banTarget.email}</strong> will suspend all their listings and prevent future publishing.
              </p>
              <input type="text" value={banReason} onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for ban..."
                className="w-full h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={handleBanUser}><Ban className="w-3 h-3" /> Ban</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setBanTarget(null); setBanReason(""); }}>Cancel</Button>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">Showing {filtered.length} of {totalListings} listings</p>

          {/* Listings */}
          <div className="space-y-2 max-h-[calc(100vh-480px)] overflow-y-auto pr-1">
            {filtered.map((l: any) => {
              const owner = profiles?.[l.user_id];
              const isExpanded = expandedId === l.id;
              const isFeatured = (l as any).is_featured;
              const contentFlags = checkContentFlags(l.title, l.description);
              const isSelected = selectedIds.has(l.id);
              const ownerBanned = owner?.marketplace_banned;

              return (
                <div key={l.id} className={cn(
                  "rounded-xl border transition-all",
                  l.status === "suspended" ? "border-destructive/30 bg-destructive/5" :
                  isFeatured ? "border-chart-3/30 bg-chart-3/5" :
                  contentFlags.length > 0 ? "border-yellow-400/30 bg-yellow-500/5" :
                  "border-border/50 bg-card hover:border-border",
                  isSelected && "ring-2 ring-primary/40"
                )}>
                  <div className="p-3.5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : l.id)}>
                    <div className="flex items-start gap-3">
                      {bulkMode && (
                        <button className="mt-0.5 shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(l.id); }}>
                          {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{l.title}</p>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                            l.status === "active" ? "bg-chart-2/10 text-chart-2" :
                            l.status === "suspended" ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
                          )}>{l.status}</span>
                          {isFeatured && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-chart-3/10 text-chart-3 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5" /> Featured
                            </span>
                          )}
                          {contentFlags.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-yellow-500/10 text-yellow-600 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Flagged
                            </span>
                          )}
                          {ownerBanned && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive flex items-center gap-0.5">
                              <Ban className="w-2.5 h-2.5" /> Owner Banned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                          <span>By: <strong className="text-foreground">{owner?.display_name || owner?.email?.split("@")[0] || l.user_id.slice(0, 8)}</strong></span>
                          <span>·</span>
                          <span>↓{l.download_count} · ♥{l.like_count} · ★{l.save_count}</span>
                          <span>·</span>
                          <span>{timeAgo(l.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Feature toggle */}
                        <Button size="sm" variant="ghost" className={cn("h-7 w-7 p-0", isFeatured ? "text-chart-3" : "text-muted-foreground")}
                          onClick={() => handleToggleFeatured(l.id, isFeatured)}>
                          {isFeatured ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                        </Button>
                        {l.status === "active" ? (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1"
                            onClick={() => handleAction(l.id, "suspend")}>
                            <EyeOff className="w-3 h-3" /> <span className="hidden sm:inline">Suspend</span>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1 text-chart-2"
                            onClick={() => handleAction(l.id, "activate")}>
                            <Eye className="w-3 h-3" /> <span className="hidden sm:inline">Activate</span>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleAction(l.id, "delete")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-0 border-t border-border/30 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {l.thumbnail_url && (
                        <img src={l.thumbnail_url} alt={l.title} className="w-full max-h-40 object-cover rounded-lg mt-2.5" />
                      )}
                      {l.description && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Description</p>
                          <p className="text-xs text-foreground/80 leading-relaxed">{l.description}</p>
                        </div>
                      )}

                      {/* Content Flags */}
                      {contentFlags.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-400/20">
                          <p className="text-[10px] font-semibold text-yellow-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Content Policy Flags
                          </p>
                          <p className="text-[10px] text-muted-foreground mb-1">
                            Automatic scan detected suspicious patterns in this listing's content.
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {contentFlags.map((flag, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-700 font-mono">{flag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: "Downloads", value: l.download_count || 0 },
                          { label: "Likes", value: l.like_count || 0 },
                          { label: "Saves", value: l.save_count || 0 },
                          { label: "Visibility", value: l.visibility },
                        ].map((s) => (
                          <div key={s.label} className="p-2 rounded-lg bg-secondary/50">
                            <p className="text-[9px] text-muted-foreground uppercase">{s.label}</p>
                            <p className="text-sm font-bold text-foreground capitalize">{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                          onClick={() => setEditingListing({ id: l.id, title: l.title, description: l.description || "" })}>
                          <Edit3 className="w-3 h-3" /> Edit Override
                        </Button>
                        {!ownerBanned && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-destructive"
                            onClick={() => setBanTarget({ userId: l.user_id, email: owner?.email || l.user_id })}>
                            <Ban className="w-3 h-3" /> Ban Owner
                          </Button>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="space-y-1 text-[10px] text-muted-foreground pt-2 border-t border-border/20">
                        <p>Owner: <span className="text-foreground font-medium">{owner?.display_name || "Unknown"}</span> ({owner?.email || "N/A"})</p>
                        <p>File ID: <span className="text-foreground font-mono">{l.file_id?.slice(0, 16)}...</span></p>
                        <p>Listing ID: <span className="text-foreground font-mono">{l.id?.slice(0, 16)}...</span></p>
                        <p>Created: <span className="text-foreground">{new Date(l.created_at).toLocaleString()}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">No listings found</p>
            )}
          </div>
        </div>
      )}

      {/* ─── REPORTS TAB ─── */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Flag className="w-4 h-4 text-destructive" /> Report Queue
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {pendingReports.length} pending · {(reports ?? []).length} total reports.
              Review user-submitted reports about policy violations, inappropriate content, or copyright issues.
              Resolve reports to dismiss them or take action on the associated listing.
            </p>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
            {(reports ?? []).map((r: any) => {
              const listing = listings?.find((l: any) => l.id === r.listing_id);
              const reporter = profiles?.[r.reporter_id];
              const isPending = r.status === "pending";
              return (
                <div key={r.id} className={cn(
                  "rounded-xl border p-3.5 transition-all",
                  isPending ? "border-destructive/30 bg-destructive/5" : "border-border/30 bg-card opacity-70"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{listing?.title || "Deleted listing"}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                        <span>By: <strong className="text-foreground">{reporter?.display_name || reporter?.email?.split("@")[0] || "Unknown"}</strong></span>
                        <span>·</span>
                        <span className={cn("px-1.5 py-0.5 rounded-full font-medium capitalize",
                          isPending ? "bg-destructive/10 text-destructive" : "bg-chart-2/10 text-chart-2"
                        )}>{r.status}</span>
                        <span>·</span>
                        <span>{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-foreground/80 mt-2"><strong className="text-muted-foreground">Reason:</strong> {r.reason || "No reason provided"}</p>
                      {r.details && <p className="text-[10px] text-muted-foreground mt-1">{r.details}</p>}
                    </div>
                    {isPending && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-chart-2"
                          onClick={() => handleResolveReport(r.id, "resolved")}>
                          <CheckCircle className="w-3 h-3" /> Resolve
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1"
                          onClick={() => handleResolveReport(r.id, "dismissed")}>
                          <XCircle className="w-3 h-3" /> Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(reports ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">No reports yet — clean marketplace! 🎉</p>
            )}
          </div>
        </div>
      )}

      {/* ─── CATEGORIES TAB ─── */}
      {activeTab === "categories" && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" /> Category Management
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {(categories ?? []).length} categories. Create, edit, reorder, or delete marketplace categories.
              Categories help users discover content by organizing listings into browsable groups.
              Use the arrows to reorder categories — they appear in this order on the marketplace.
            </p>
          </div>

          {/* Add new */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Add New Category</p>
            <div className="flex gap-2">
              <input type="text" value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)}
                className="w-12 h-9 px-2 bg-secondary border border-border rounded-lg text-center text-sm focus:outline-none" placeholder="📁" />
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name..."
                className="flex-1 h-9 px-3 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
              <Button size="sm" className="h-9 text-xs gap-1" onClick={handleAddCategory} disabled={!newCatName.trim()}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          </div>

          {/* Edit inline */}
          {editingCat && (
            <div className="p-3.5 rounded-xl border border-chart-1/30 bg-chart-1/5 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Edit Category</p>
              <div className="flex gap-2">
                <input type="text" value={editingCat.icon} onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })}
                  className="w-12 h-9 px-2 bg-card border border-border rounded-lg text-center text-sm focus:outline-none" />
                <input type="text" value={editingCat.name} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                  className="flex-1 h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
                <Button size="sm" className="h-9 text-xs gap-1" onClick={handleUpdateCategory}><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setEditingCat(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Category list */}
          <div className="space-y-1.5">
            {(categories ?? []).map((cat: any, idx: number) => {
              const listingCount = (listings ?? []).filter((l: any) => l.category_id === cat.id).length;
              return (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:border-border transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleReorderCategory(cat.id, "up")} disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleReorderCategory(cat.id, "down")} disabled={idx === (categories?.length ?? 0) - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-lg">{cat.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{cat.name}</p>
                      <p className="text-[10px] text-muted-foreground">{listingCount} listings · Order: {cat.sort_order}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => setEditingCat({ id: cat.id, name: cat.name, icon: cat.icon })}>
                      <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteCatTarget({ id: cat.id, name: cat.name })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {(categories ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No categories yet. Add one above.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── ANALYTICS TAB ─── */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Marketplace Analytics
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Platform-wide engagement metrics. Track downloads, likes, and saves over time to understand content performance
              and user engagement trends. Use this data to identify popular content and inform moderation decisions.
            </p>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Downloads", value: totalDownloads, icon: TrendingUp },
              { label: "Total Likes", value: totalLikes, icon: Star },
              { label: "Featured", value: featuredCount, icon: Star },
              { label: "Flagged Content", value: flaggedListings.length, icon: AlertTriangle },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl border border-border bg-card">
                <s.icon className="w-4 h-4 text-primary mb-2" />
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Engagement chart */}
          {analyticsChartData.length > 0 && (
            <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
              <h4 className="text-xs font-semibold text-foreground">Daily Engagement Trends</h4>
              <p className="text-[10px] text-muted-foreground">
                Aggregated daily downloads, likes, and saves across all marketplace listings over the past 30 days.
              </p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsChartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs>
                      <ChartGradient id="dlGrad" color="hsl(var(--primary))" opacity={0.4} />
                      <ChartGradient id="likesGrad" color="hsl(var(--chart-2))" opacity={0.25} />
                      <ChartGradient id="savesGrad" color="hsl(var(--chart-3))" opacity={0.2} />
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                    <XAxis dataKey="date" tick={aestheticAxisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={aestheticAxisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={aestheticTooltipStyle} />
                    <Area type="monotone" dataKey="downloads" stroke="hsl(var(--primary))" fill="url(#dlGrad)" strokeWidth={2.5} dot={false} name="Downloads" />
                    <Area type="monotone" dataKey="likes" stroke="hsl(var(--chart-2))" fill="url(#likesGrad)" strokeWidth={2} dot={false} name="Likes" />
                    <Area type="monotone" dataKey="saves" stroke="hsl(var(--chart-3))" fill="url(#savesGrad)" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Saves" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Listings */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Top 10 Listings by Downloads
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Most downloaded content on the marketplace. High-performing listings may be candidates for featured status.
            </p>
            <div className="space-y-1">
              {topListings.map((l: any, i: number) => {
                const owner = profiles?.[l.user_id];
                return (
                  <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground w-5 text-right">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-foreground truncate">{l.title}</p>
                        <p className="text-[9px] text-muted-foreground">{owner?.display_name || owner?.email?.split("@")[0] || "Unknown"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                      <span>↓{l.download_count}</span>
                      <span>♥{l.like_count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── BANNED USERS TAB ─── */}
      {activeTab === "banned" && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Ban className="w-4 h-4 text-destructive" /> Marketplace Banned Users
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {bannedUsers.length} banned users. These users cannot publish new listings and all their existing listings are suspended.
              Unban a user to restore their marketplace privileges. The ban reason and timestamp are preserved for reference.
            </p>
          </div>

          <div className="space-y-2">
            {bannedUsers.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-3.5 rounded-xl border border-destructive/20 bg-destructive/5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{u.display_name || u.email?.split("@")[0]}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>Reason: <strong className="text-foreground">{u.marketplace_banned_reason || "Not specified"}</strong></span>
                    {u.marketplace_banned_at && <span>· {timeAgo(u.marketplace_banned_at)}</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-chart-2 shrink-0"
                  onClick={() => handleUnbanUser(u.id)}>
                  <ShieldCheck className="w-3 h-3" /> Unban
                </Button>
              </div>
            ))}
            {bannedUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">No banned users — marketplace is clean! ✅</p>
            )}
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      <ResponsiveDialog
        open={bulkDeleteConfirm}
        onOpenChange={(open) => !open && setBulkDeleteConfirm(false)}
        title="Bulk Delete Listings?"
        description={`Delete ${selectedIds.size} selected listing(s)? This action cannot be undone.`}
        icon={<div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center"><Trash2 className="w-6 h-6 text-destructive" /></div>}
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => { handleBulkDeleteListings(); setBulkDeleteConfirm(false); }} className="flex-1">Delete All</Button>
          </>
        }
      >{null}</ResponsiveDialog>

      {/* Delete Category Confirmation */}
      <ResponsiveDialog
        open={!!deleteCatTarget}
        onOpenChange={(open) => !open && setDeleteCatTarget(null)}
        title="Delete Category?"
        description={`Delete category "${deleteCatTarget?.name}"? Listings using this category will become uncategorized.`}
        icon={<div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center"><Trash2 className="w-6 h-6 text-destructive" /></div>}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteCatTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteCatTarget) { handleDeleteCategory(deleteCatTarget.id, deleteCatTarget.name); setDeleteCatTarget(null); } }} className="flex-1">Delete</Button>
          </>
        }
      >{null}</ResponsiveDialog>
    </div>
  );
}
