import { useState, useMemo } from "react";
import { Users, Search, Shield, Ban, UserCheck, UserX, ChevronDown, Save, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUpdateUserRole, useUpdateUserStorageLimit } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  users: any[];
  userStorageMap: Record<string, number>;
}

type FilterRole = "all" | "admin" | "moderator" | "user";
type FilterPlan = "all" | "free" | "premium";
type FilterStatus = "all" | "active" | "banned";

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function AdminUserManagement({ users, userStorageMap }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [filterPlan, setFilterPlan] = useState<FilterPlan>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [storageLimitEdit, setStorageLimitEdit] = useState<Record<string, string>>({});
  const [banningUser, setBanningUser] = useState<string | null>(null);

  const updateRole = useUpdateUserRole();
  const updateStorageLimit = useUpdateUserStorageLimit();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const filteredUsers = useMemo(() => {
    let result = users ?? [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u: any) =>
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    if (filterPlan !== "all") {
      result = result.filter((u: any) => u.storage_plan === filterPlan);
    }
    if (filterStatus === "banned") {
      result = result.filter((u: any) => u.is_banned);
    } else if (filterStatus === "active") {
      result = result.filter((u: any) => !u.is_banned);
    }
    return result;
  }, [users, searchQuery, filterRole, filterPlan, filterStatus]);

  const handleBanToggle = async (userId: string, currentlyBanned: boolean) => {
    setBanningUser(userId);
    try {
      const { error } = await supabase.from("profiles").update({
        is_banned: !currentlyBanned,
        banned_at: !currentlyBanned ? new Date().toISOString() : null,
        banned_by: !currentlyBanned ? currentUser?.id : null,
        ban_reason: !currentlyBanned ? "Banned by admin" : null,
      }).eq("id", userId);
      if (error) throw error;

      // Log action
      if (currentUser) {
        await supabase.from("admin_action_logs").insert({
          admin_id: currentUser.id,
          action: currentlyBanned ? "unban_user" : "ban_user",
          target_user_id: userId,
          details: {},
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success(currentlyBanned ? "User unbanned" : "User banned successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBanningUser(null);
    }
  };

  const totalUsers = users?.length ?? 0;
  const bannedCount = (users ?? []).filter((u: any) => u.is_banned).length;
  const premiumCount = (users ?? []).filter((u: any) => u.storage_plan === "premium").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Users className="w-4.5 h-4.5 text-primary" />
          User Management
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalUsers} registered users · {premiumCount} premium · {bannedCount} banned
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Search, filter, and manage user accounts. Ban or suspend users who violate policies. Adjust storage limits and roles for individual users.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <Button variant="outline" size="sm" className="h-10 px-3" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-2 p-3 bg-card border border-border rounded-xl"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Plan</label>
              <div className="flex gap-1">
                {(["all", "free", "premium"] as FilterPlan[]).map((p) => (
                  <button key={p} onClick={() => setFilterPlan(p)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                      filterPlan === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}>{p === "all" ? "All Plans" : p}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Status</label>
              <div className="flex gap-1">
                {(["all", "active", "banned"] as FilterStatus[]).map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                      filterStatus === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}>{s === "all" ? "All Status" : s}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Results count */}
      <p className="text-[11px] text-muted-foreground">
        Showing {filteredUsers.length} of {totalUsers} users
        {searchQuery && <span> matching "<strong className="text-foreground">{searchQuery}</strong>"</span>}
      </p>

      {/* User list */}
      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {filteredUsers.map((u: any, i: number) => {
          const isExpanded = expandedUser === u.id;
          const storageUsed = userStorageMap[u.id] || 0;
          const storagePct = Math.min((storageUsed / u.storage_limit) * 100, 100);
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.015 }}
              className={cn(
                "rounded-xl border transition-colors",
                u.is_banned ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-card hover:border-border"
              )}
            >
              <div className="p-3.5 cursor-pointer" onClick={() => setExpandedUser(isExpanded ? null : u.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{u.display_name || "Unnamed User"}</p>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                        u.storage_plan === "premium" ? "bg-chart-3/10 text-chart-3" : "bg-secondary text-muted-foreground"
                      )}>{u.storage_plan}</span>
                      {u.is_banned && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">
                          BANNED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{u.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                      <span>Storage: <strong className="text-foreground font-mono">{formatSize(storageUsed)}</strong> / {formatSize(u.storage_limit)}</span>
                      <span>·</span>
                      <span>Joined {formatDate(u.created_at)}</span>
                      {u.last_active_at && (
                        <>
                          <span>·</span>
                          <span>Active {timeAgo(u.last_active_at)}</span>
                        </>
                      )}
                    </div>
                    <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1.5 max-w-xs">
                      <div className={cn("h-full rounded-full transition-all", storagePct > 80 ? "bg-destructive" : "bg-primary")} style={{ width: `${storagePct}%` }} />
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
                </div>
              </div>

              {/* Expanded actions */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-3.5 pb-3.5 border-t border-border/30"
                >
                  <div className="pt-3 space-y-3">
                    {/* Role management */}
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Role Management</label>
                      <p className="text-[10px] text-muted-foreground/70 mb-2">Assign or remove the admin role for this user. Admins have full access to this panel and can manage all data.</p>
                      <div className="flex gap-1.5 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 gap-1"
                          onClick={() => updateRole.mutate({ userId: u.id, role: "admin", action: "add" })}>
                          <UserCheck className="w-3 h-3" /> Grant Admin
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 gap-1 text-destructive hover:text-destructive"
                          onClick={() => updateRole.mutate({ userId: u.id, role: "admin", action: "remove" })}>
                          <UserX className="w-3 h-3" /> Remove Admin
                        </Button>
                      </div>
                    </div>

                    {/* Storage limit */}
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Storage Limit</label>
                      <p className="text-[10px] text-muted-foreground/70 mb-2">Override the default storage quota. Enter value in GB.</p>
                      <div className="flex gap-2 max-w-xs">
                        <input
                          type="number"
                          placeholder="GB"
                          value={storageLimitEdit[u.id] ?? (u.storage_limit / 1e9).toFixed(0)}
                          onChange={(e) => setStorageLimitEdit(prev => ({ ...prev, [u.id]: e.target.value }))}
                          className="flex-1 h-8 px-3 bg-secondary/50 border border-border rounded-lg text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring/30"
                        />
                        <Button size="sm" className="h-8 text-[10px] px-3 gap-1"
                          onClick={() => {
                            const gb = parseFloat(storageLimitEdit[u.id] || "5");
                            updateStorageLimit.mutate({ userId: u.id, storageLimit: Math.round(gb * 1e9) });
                          }}>
                          <Save className="w-3 h-3" /> Save
                        </Button>
                      </div>
                    </div>

                    {/* Ban/Unban */}
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Account Status</label>
                      <p className="text-[10px] text-muted-foreground/70 mb-2">
                        {u.is_banned
                          ? "This user is currently banned and cannot log in or access any resources. Unban to restore access."
                          : "Ban this user to immediately block their login and prevent access to all files and workspaces."}
                      </p>
                      <Button
                        size="sm"
                        variant={u.is_banned ? "default" : "destructive"}
                        className="h-8 text-[10px] px-3 gap-1.5"
                        disabled={banningUser === u.id}
                        onClick={() => handleBanToggle(u.id, u.is_banned)}
                      >
                        <Ban className="w-3 h-3" />
                        {u.is_banned ? "Unban User" : "Ban User"}
                      </Button>
                      {u.is_banned && u.banned_at && (
                        <p className="text-[10px] text-destructive mt-1.5">
                          Banned on {formatDate(u.banned_at)} {u.ban_reason && `— ${u.ban_reason}`}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
        {filteredUsers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No users match your filters</p>
        )}
      </div>
    </div>
  );
}
