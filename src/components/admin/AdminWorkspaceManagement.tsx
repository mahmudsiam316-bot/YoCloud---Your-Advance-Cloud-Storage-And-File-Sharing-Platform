import { useState, useMemo, useCallback } from "react";
import { Globe, Search, Trash2, Users, ArrowRightLeft, Save, Snowflake, Sun, Activity, ChevronDown, ChevronUp, UserMinus, BarChart3, CheckSquare, Square, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${bytes} B`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdminWorkspaceManagement() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [transferTarget, setTransferTarget] = useState<{ wsId: string; currentOwner: string } | null>(null);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingStorage, setEditingStorage] = useState<{ wsId: string; value: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ wsId: string; userId: string; wsName: string; memberName: string } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: workspaces } = useQuery({
    queryKey: ["admin_workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspaces").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["admin_workspace_members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_members").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin_profiles_map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, display_name, last_active_at, avatar_url");
      if (error) throw error;
      const map: Record<string, any> = {};
      data.forEach((p: any) => { map[p.id] = p; });
      return map;
    },
  });

  const { data: files } = useQuery({
    queryKey: ["admin_files_ws_count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("files").select("workspace_id, size");
      if (error) throw error;
      const map: Record<string, { count: number; size: number }> = {};
      data.forEach((f: any) => {
        if (!f.workspace_id) return;
        if (!map[f.workspace_id]) map[f.workspace_id] = { count: 0, size: 0 };
        map[f.workspace_id].count++;
        map[f.workspace_id].size += (f.size || 0);
      });
      return map;
    },
  });

  const { data: activityLogs } = useQuery({
    queryKey: ["admin_ws_activity"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const membersByWs = useMemo(() => {
    const map: Record<string, any[]> = {};
    (members ?? []).forEach((m: any) => {
      if (!map[m.workspace_id]) map[m.workspace_id] = [];
      map[m.workspace_id].push(m);
    });
    return map;
  }, [members]);

  const activityByWs = useMemo(() => {
    const map: Record<string, any[]> = {};
    (activityLogs ?? []).forEach((a: any) => {
      if (!a.workspace_id) return;
      if (!map[a.workspace_id]) map[a.workspace_id] = [];
      if (map[a.workspace_id].length < 10) map[a.workspace_id].push(a);
    });
    return map;
  }, [activityLogs]);

  const growthChartData = useMemo(() => {
    if (!workspaces) return [];
    const dateMap: Record<string, number> = {};
    workspaces.forEach((w: any) => {
      const date = new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dateMap[date] = (dateMap[date] || 0) + 1;
    });
    // cumulative
    const entries = Object.entries(dateMap).slice(-30);
    let cumulative = 0;
    return entries.map(([date, count]) => {
      cumulative += count;
      return { date, count, total: cumulative };
    });
  }, [workspaces]);

  const filtered = useMemo(() => {
    if (!workspaces) return [];
    if (!searchQuery) return workspaces;
    const q = searchQuery.toLowerCase();
    return workspaces.filter((w: any) =>
      w.name?.toLowerCase().includes(q) || profiles?.[w.owner_id]?.email?.toLowerCase().includes(q)
    );
  }, [workspaces, searchQuery, profiles]);

  const logAdminAction = useCallback(async (action: string, details: any) => {
    if (!currentUser) return;
    await supabase.from("admin_action_logs").insert({
      admin_id: currentUser.id,
      action,
      details,
    });
  }, [currentUser]);

  const handleForceDelete = async (wsId: string, wsName: string) => {
    try {
      await supabase.from("files").delete().eq("workspace_id", wsId);
      await supabase.from("workspace_members").delete().eq("workspace_id", wsId);
      const { error } = await supabase.from("workspaces").delete().eq("id", wsId);
      if (error) throw error;
      await logAdminAction("force_delete_workspace", { workspace_id: wsId, workspace_name: wsName });
      queryClient.invalidateQueries({ queryKey: ["admin_workspaces"] });
      toast.success("Workspace deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTarget || !newOwnerId.trim()) return;
    try {
      const { error } = await supabase.from("workspaces").update({ owner_id: newOwnerId.trim() }).eq("id", transferTarget.wsId);
      if (error) throw error;
      await supabase.from("workspace_members").update({ role: "owner" as any }).eq("workspace_id", transferTarget.wsId).eq("user_id", newOwnerId.trim());
      await supabase.from("workspace_members").update({ role: "admin" as any }).eq("workspace_id", transferTarget.wsId).eq("user_id", transferTarget.currentOwner);
      await logAdminAction("transfer_workspace_ownership", { workspace_id: transferTarget.wsId, from: transferTarget.currentOwner, to: newOwnerId.trim() });
      queryClient.invalidateQueries({ queryKey: ["admin_workspaces"] });
      toast.success("Ownership transferred");
      setTransferTarget(null);
      setNewOwnerId("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFreeze = async (wsId: string, wsName: string, freeze: boolean) => {
    try {
      const { error } = await supabase.from("workspaces").update({
        is_frozen: freeze,
        frozen_at: freeze ? new Date().toISOString() : null,
        frozen_by: freeze ? currentUser?.id : null,
      } as any).eq("id", wsId);
      if (error) throw error;
      await logAdminAction(freeze ? "freeze_workspace" : "unfreeze_workspace", { workspace_id: wsId, workspace_name: wsName });
      queryClient.invalidateQueries({ queryKey: ["admin_workspaces"] });
      toast.success(freeze ? "Workspace frozen" : "Workspace unfrozen");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveMember = async (wsId: string, userId: string, wsName: string) => {
    try {
      const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", wsId).eq("user_id", userId);
      if (error) throw error;
      await supabase.from("workspace_member_permissions").delete().eq("workspace_id", wsId).eq("user_id", userId);
      await supabase.from("workspace_folder_permissions").delete().eq("workspace_id", wsId).eq("user_id", userId);
      await logAdminAction("force_remove_member", { workspace_id: wsId, user_id: userId, workspace_name: wsName });
      queryClient.invalidateQueries({ queryKey: ["admin_workspace_members"] });
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveStorageLimit = async (wsId: string) => {
    if (!editingStorage) return;
    const limitGB = parseFloat(editingStorage.value);
    if (isNaN(limitGB) || limitGB <= 0) { toast.error("Invalid value"); return; }
    const limitBytes = Math.round(limitGB * 1e9);
    try {
      const { error } = await supabase.from("workspaces").update({ storage_limit: limitBytes }).eq("id", wsId);
      if (error) throw error;
      await logAdminAction("update_workspace_storage_limit", { workspace_id: wsId, storage_limit_gb: limitGB });
      queryClient.invalidateQueries({ queryKey: ["admin_workspaces"] });
      toast.success("Storage limit updated");
      setEditingStorage(null);
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

  const handleBulkFreeze = async (freeze: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      for (const wsId of selectedIds) {
        await supabase.from("workspaces").update({
          is_frozen: freeze,
          frozen_at: freeze ? new Date().toISOString() : null,
          frozen_by: freeze ? currentUser?.id : null,
        } as any).eq("id", wsId);
      }
      await logAdminAction(freeze ? "bulk_freeze_workspaces" : "bulk_unfreeze_workspaces", { count: selectedIds.size, ids: Array.from(selectedIds) });
      queryClient.invalidateQueries({ queryKey: ["admin_workspaces"] });
      toast.success(`${selectedIds.size} workspaces ${freeze ? "frozen" : "unfrozen"}`);
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async () => {
    const teamIds = Array.from(selectedIds).filter(id => {
      const ws = workspaces?.find((w: any) => w.id === id);
      return ws && (ws as any).type !== "personal";
    });
    if (teamIds.length === 0) { toast.error("Cannot delete personal workspaces"); return; }
    try {
      for (const wsId of teamIds) {
        await supabase.from("files").delete().eq("workspace_id", wsId);
        await supabase.from("workspace_members").delete().eq("workspace_id", wsId);
        await supabase.from("workspaces").delete().eq("id", wsId);
      }
      await logAdminAction("bulk_delete_workspaces", { count: teamIds.length, ids: teamIds });
      queryClient.invalidateQueries({ queryKey: ["admin_workspaces"] });
      toast.success(`${teamIds.length} workspaces deleted`);
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const totalWs = workspaces?.length ?? 0;
  const teamWs = (workspaces ?? []).filter((w: any) => w.type === "team").length;
  const personalWs = (workspaces ?? []).filter((w: any) => w.type === "personal").length;
  const frozenWs = (workspaces ?? []).filter((w: any) => (w as any).is_frozen).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Globe className="w-4.5 h-4.5 text-primary" />
          Workspace Management
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalWs} workspaces · {personalWs} personal · {teamWs} team · {frozenWs} frozen
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Full workspace lifecycle management. View members, edit storage limits, freeze/unfreeze workspaces, transfer ownership, 
          and force-delete abandoned team workspaces. Use bulk mode to perform actions on multiple workspaces simultaneously. 
          All administrative actions are logged in the audit trail for accountability.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by workspace name or owner email..."
            className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setShowChart(!showChart)}
            className={cn("px-3 py-2 rounded-xl text-[11px] font-medium transition-colors flex items-center gap-1.5",
              showChart ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}>
            <BarChart3 className="w-3.5 h-3.5" /> Chart
          </button>
          <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
            className={cn("px-3 py-2 rounded-xl text-[11px] font-medium transition-colors flex items-center gap-1.5",
              bulkMode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}>
            <CheckSquare className="w-3.5 h-3.5" /> Bulk
          </button>
        </div>
      </div>

      {/* Growth Chart */}
      {showChart && growthChartData.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Workspace Growth</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Cumulative workspace creation over time. Shows how rapidly teams and individuals are adopting the platform.
            Each data point represents the total number of workspaces created up to that date.
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthChartData}>
                <defs>
                  <linearGradient id="wsGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#wsGrowth)" strokeWidth={2} name="Total Workspaces" />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--chart-2))" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="Created" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleBulkFreeze(true)}>
            <Snowflake className="w-3 h-3" /> Freeze All
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleBulkFreeze(false)}>
            <Sun className="w-3 h-3" /> Unfreeze All
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive" onClick={() => setBulkDeleteConfirm(true)}>
            <Trash2 className="w-3 h-3" /> Delete Team
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" onClick={() => { setSelectedIds(new Set()); setBulkMode(false); }}>
            <XCircle className="w-3 h-3" /> Cancel
          </Button>
        </div>
      )}

      {/* Transfer dialog inline — with member dropdown */}
      {transferTarget && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" /> Transfer Ownership
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Select a workspace member to become the new owner. The current owner will be demoted to admin role automatically.
          </p>
          <div className="flex gap-2">
            <select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}
              className="flex-1 h-9 px-3 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30">
              <option value="">Select new owner...</option>
              {(membersByWs[transferTarget.wsId] ?? [])
                .filter((m: any) => m.user_id !== transferTarget.currentOwner)
                .map((m: any) => {
                  const p = profiles?.[m.user_id];
                  return (
                    <option key={m.user_id} value={m.user_id}>
                      {p?.display_name || p?.email?.split("@")[0] || "Unknown"} — {p?.email || m.user_id.slice(0, 12)}
                    </option>
                  );
                })}
            </select>
            <Button size="sm" className="h-9 text-xs" onClick={handleTransferOwnership} disabled={!newOwnerId}>Transfer</Button>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setTransferTarget(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">Showing {Math.min(page * PAGE_SIZE + 1, filtered.length)}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} workspaces</p>

      {/* Workspace List */}
      <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
        {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((w: any) => {
          const owner = profiles?.[w.owner_id];
          const fileData = files?.[w.id] || { count: 0, size: 0 };
          const wMembers = membersByWs[w.id] || [];
          const wsActivity = activityByWs[w.id] || [];
          const isExpanded = expandedId === w.id;
          const isFrozen = (w as any).is_frozen;
          const isSelected = selectedIds.has(w.id);

          return (
            <div key={w.id} className={cn(
              "rounded-xl border transition-all",
              isFrozen ? "border-blue-400/30 bg-blue-500/5" : "border-border/50 bg-card hover:border-border",
              isSelected && "ring-2 ring-primary/40"
            )}>
              <div className="p-3.5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : w.id)}>
                <div className="flex items-start gap-3">
                  {/* Bulk checkbox */}
                  {bulkMode && (
                    <button className="mt-0.5 shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(w.id); }}>
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {w.color_theme && w.color_theme !== "default" && (
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: w.color_theme }} />
                      )}
                      <p className="text-sm font-medium text-foreground">{w.name}</p>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                        w.type === "team" ? "bg-chart-1/10 text-chart-1" : "bg-secondary text-muted-foreground"
                      )}>{w.type}</span>
                      {isFrozen && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-500 flex items-center gap-0.5">
                          <Snowflake className="w-2.5 h-2.5" /> Frozen
                        </span>
                      )}
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                        w.storage_plan === "premium" ? "bg-chart-3/10 text-chart-3" : "bg-secondary text-muted-foreground"
                      )}>{w.storage_plan}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                      <span>Owner: <strong className="text-foreground">{owner?.display_name || owner?.email?.split("@")[0] || "Unknown"}</strong></span>
                      <span>·</span>
                      <span>{wMembers.length} members · {fileData.count} files · {formatSize(fileData.size)}</span>
                      <span>·</span>
                      <span>{timeAgo(w.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Freeze/Unfreeze */}
                    <Button size="sm" variant="outline" className={cn("h-7 text-[10px] px-2 gap-1",
                      isFrozen ? "text-chart-2 hover:text-chart-2" : "text-blue-500 hover:text-blue-500"
                    )} onClick={() => handleFreeze(w.id, w.name, !isFrozen)}>
                      {isFrozen ? <Sun className="w-3 h-3" /> : <Snowflake className="w-3 h-3" />}
                      <span className="hidden sm:inline">{isFrozen ? "Unfreeze" : "Freeze"}</span>
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1"
                      onClick={() => setTransferTarget({ wsId: w.id, currentOwner: w.owner_id })}>
                      <ArrowRightLeft className="w-3 h-3" />
                      <span className="hidden sm:inline">Transfer</span>
                    </Button>
                     {w.type !== "personal" && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: w.id, name: w.name })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <div className="ml-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-0 border-t border-border/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {w.description && (
                    <div className="mt-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Description</p>
                      <p className="text-xs text-foreground/80">{w.description}</p>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-secondary/50">
                      <p className="text-[9px] text-muted-foreground uppercase">Members</p>
                      <p className="text-sm font-bold text-foreground">{wMembers.length}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/50">
                      <p className="text-[9px] text-muted-foreground uppercase">Files</p>
                      <p className="text-sm font-bold text-foreground">{fileData.count}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/50">
                      <p className="text-[9px] text-muted-foreground uppercase">Storage Used</p>
                      <p className="text-sm font-bold text-foreground">{formatSize(fileData.size)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/50">
                      <p className="text-[9px] text-muted-foreground uppercase">Storage Limit</p>
                      {editingStorage?.wsId === w.id ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <input type="number" step="0.5" min="0.5" value={editingStorage.value}
                            onChange={(e) => setEditingStorage({ wsId: w.id, value: e.target.value })}
                            className="w-16 h-6 px-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none" />
                          <span className="text-[9px] text-muted-foreground">GB</span>
                          <button onClick={() => handleSaveStorageLimit(w.id)} className="text-primary hover:text-primary/80">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingStorage(null)} className="text-muted-foreground hover:text-foreground">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setEditingStorage({ wsId: w.id, value: ((w.storage_limit || 0) / 1e9).toFixed(1) })}>
                          {formatSize(w.storage_limit || 0)}
                          <span className="text-[8px] text-muted-foreground ml-1">✎</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Members List */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Members ({wMembers.length})
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mb-2">
                      All workspace members with their roles and activity status. Admins can force-remove any member except the workspace owner.
                    </p>
                    <div className="space-y-1">
                      {wMembers.map((m: any) => {
                        const profile = profiles?.[m.user_id];
                        const isOwner = m.role === "owner";
                        return (
                          <div key={m.id} className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-secondary/40 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {profile?.avatar_url ? (
                                  <img src={profile.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-primary">{(profile?.display_name || profile?.email || "?")[0]?.toUpperCase()}</span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-[11px] font-medium text-foreground truncate">
                                    {profile?.display_name || profile?.email?.split("@")[0] || "Unknown"}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground font-mono truncate">{profile?.email || m.user_id.slice(0, 12)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                                m.role === "owner" ? "bg-chart-3/10 text-chart-3" :
                                m.role === "admin" ? "bg-chart-1/10 text-chart-1" : "bg-secondary text-muted-foreground"
                              )}>{m.role}</span>
                              <span className="text-[9px] text-muted-foreground">
                                {profile?.last_active_at ? timeAgo(profile.last_active_at) : "—"}
                              </span>
                              {!isOwner && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                                  onClick={() => setRemoveMemberTarget({ wsId: w.id, userId: m.user_id, wsName: w.name, memberName: profile?.display_name || profile?.email || "this member" })}>
                                  <UserMinus className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {wMembers.length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center py-3">No members found</p>
                      )}
                    </div>
                  </div>

                  {/* Activity Log */}
                  {wsActivity.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Activity className="w-3 h-3" /> Recent Activity
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mb-2">
                        Last 10 actions performed within this workspace. Includes uploads, deletions, moves, and sharing events.
                      </p>
                      <div className="space-y-1">
                        {wsActivity.map((a: any) => {
                          const actorProfile = profiles?.[a.user_id];
                          return (
                            <div key={a.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-secondary/30 transition-colors">
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-foreground truncate">
                                  <span className="font-medium">{actorProfile?.display_name || actorProfile?.email?.split("@")[0] || "User"}</span>
                                  {" "}<span className="text-muted-foreground">{a.action}</span>{" "}
                                  <span className="font-medium">{a.file_name}</span>
                                </p>
                              </div>
                              <span className="text-[9px] text-muted-foreground shrink-0 ml-2">{timeAgo(a.created_at)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="space-y-1 text-[10px] text-muted-foreground pt-2 border-t border-border/20">
                    <p>Owner: <span className="text-foreground font-medium">{owner?.display_name || "Unknown"}</span> ({owner?.email || "N/A"})</p>
                    <p>Owner ID: <span className="text-foreground font-mono">{w.owner_id?.slice(0, 16)}...</span></p>
                    <p>Workspace ID: <span className="text-foreground font-mono">{w.id?.slice(0, 16)}...</span></p>
                    <p>Type: <span className="text-foreground capitalize">{w.type}</span> · Plan: <span className="text-foreground capitalize">{w.storage_plan}</span></p>
                    {isFrozen && (w as any).frozen_at && (
                      <p>Frozen: <span className="text-blue-500 font-medium">{formatDate((w as any).frozen_at)}</span></p>
                    )}
                    <p>Created: <span className="text-foreground">{new Date(w.created_at).toLocaleString()}</span></p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No workspaces found</p>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-muted-foreground">Page {page + 1} of {Math.ceil(filtered.length / PAGE_SIZE)}</p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3 h-3 mr-0.5" /> Prev
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Dialog */}
      <ResponsiveDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Workspace?"
        description={`Permanently delete workspace "${deleteTarget?.name}" and all its files, members, and data? This action cannot be undone and will be recorded in the audit trail.`}
        icon={<div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-destructive" /></div>}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteTarget) { handleForceDelete(deleteTarget.id, deleteTarget.name); setDeleteTarget(null); } }} className="flex-1">Delete</Button>
          </>
        }
      >{null}</ResponsiveDialog>

      {/* Remove Member Confirmation Dialog */}
      <ResponsiveDialog
        open={!!removeMemberTarget}
        onOpenChange={(open) => !open && setRemoveMemberTarget(null)}
        title="Remove Member?"
        description={`Remove ${removeMemberTarget?.memberName} from this workspace? They will lose access to all workspace files and folders.`}
        icon={<div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center"><UserMinus className="w-6 h-6 text-destructive" /></div>}
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoveMemberTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => { if (removeMemberTarget) { handleRemoveMember(removeMemberTarget.wsId, removeMemberTarget.userId, removeMemberTarget.wsName); setRemoveMemberTarget(null); } }} className="flex-1">Remove</Button>
          </>
        }
      >{null}</ResponsiveDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <ResponsiveDialog
        open={bulkDeleteConfirm}
        onOpenChange={(open) => !open && setBulkDeleteConfirm(false)}
        title="Bulk Delete Workspaces?"
        description={`Delete ${selectedIds.size} selected team workspace(s)? Personal workspaces will be skipped. This cannot be undone.`}
        icon={<div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center"><Trash2 className="w-6 h-6 text-destructive" /></div>}
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => { handleBulkDelete(); setBulkDeleteConfirm(false); }} className="flex-1">Delete All</Button>
          </>
        }
      >{null}</ResponsiveDialog>
    </div>
  );
}
