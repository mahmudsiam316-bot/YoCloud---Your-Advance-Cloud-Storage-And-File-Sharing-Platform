import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAllUsers, useAllFiles, useAllActivity, useAdminDeleteFile, useUpdateUserRole, useAdminActionLogs, useSystemConfig, useUpdateSystemConfig, useUpdateUserStorageLimit, useAllTransactions } from "@/hooks/useAdmin";
import { Users, HardDrive, FileIcon, Activity, Trash2, Search, AlertTriangle, Settings, ScrollText, Save, CreditCard, Image, Video, FileText, BarChart3, TrendingUp, Clock, Database, Zap, Menu, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { cn } from "@/lib/utils";
import { BottomNavbar } from "@/components/BottomNavbar";
import { AdminSidebar, type AdminTabId } from "@/components/admin/AdminSidebar";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminBulkNotification } from "@/components/admin/AdminBulkNotification";
import { AdminFileCleanup } from "@/components/admin/AdminFileCleanup";
import { AdminStorageAnalytics } from "@/components/admin/AdminStorageAnalytics";
import { AdminPlanUpgrade } from "@/components/admin/AdminPlanUpgrade";
import { AdminMarketplaceModeration } from "@/components/admin/AdminMarketplaceModeration";
import { AdminWorkspaceManagement } from "@/components/admin/AdminWorkspaceManagement";
import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { AdminApiManagement } from "@/components/admin/AdminApiManagement";

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: users } = useAllUsers();
  const { data: allFiles } = useAllFiles();
  const { data: activity } = useAllActivity();
  const { data: adminLogs } = useAdminActionLogs();
  const { data: transactions } = useAllTransactions();
  const { data: systemConfig } = useSystemConfig();
  const deleteFile = useAdminDeleteFile();
  const updateConfig = useUpdateSystemConfig();

  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; storagePath: string } | null>(null);
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({});
  const [filePage, setFilePage] = useState(0);
  const [activityPage, setActivityPage] = useState(0);
  const PAGE_SIZE = 30;

  const totalStorage = useMemo(() => (allFiles ?? []).reduce((s, f) => s + ((f as any).size || 0), 0), [allFiles]);
  const totalUsers = users?.length ?? 0;
  const totalFiles = allFiles?.length ?? 0;

  const fileBreakdown = useMemo(() => {
    const cats = { images: { count: 0, bytes: 0 }, videos: { count: 0, bytes: 0 }, docs: { count: 0, bytes: 0 }, other: { count: 0, bytes: 0 } };
    (allFiles ?? []).forEach((f: any) => {
      const m = f.mime_type || "";
      const size = f.size || 0;
      if (m.startsWith("image/")) { cats.images.count++; cats.images.bytes += size; }
      else if (m.startsWith("video/")) { cats.videos.count++; cats.videos.bytes += size; }
      else if (m.includes("pdf") || m.includes("document") || m.includes("text/")) { cats.docs.count++; cats.docs.bytes += size; }
      else { cats.other.count++; cats.other.bytes += size; }
    });
    return cats;
  }, [allFiles]);

  const userStorageMap = useMemo(() => {
    const map: Record<string, number> = {};
    (allFiles ?? []).forEach((f: any) => {
      map[f.user_id] = (map[f.user_id] || 0) + (f.size || 0);
    });
    return map;
  }, [allFiles]);

  const filteredFiles = useMemo(() => {
    if (!allFiles) return [];
    if (!searchQuery || activeTab !== "files") return allFiles;
    const q = searchQuery.toLowerCase();
    return allFiles.filter((f: any) => f.name?.toLowerCase().includes(q));
  }, [allFiles, searchQuery, activeTab]);

  const filteredActivity = useMemo(() => {
    if (!activity) return [];
    if (!searchQuery || activeTab !== "activity") return activity;
    const q = searchQuery.toLowerCase();
    return activity.filter((a: any) => a.file_name?.toLowerCase().includes(q) || a.action?.toLowerCase().includes(q));
  }, [activity, searchQuery, activeTab]);

  const recentUsers = useMemo(() => {
    return (users ?? []).slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  }, [users]);

  const configKeys = [
    { key: "default_storage_limit_gb", label: "Default Storage Limit (GB)", description: "Storage limit assigned to every new user upon registration. Affects all future signups." },
    { key: "otp_expiry_minutes", label: "OTP Expiry (minutes)", description: "Duration in minutes before a one-time password expires and must be re-requested." },
    { key: "trash_auto_delete_days", label: "Trash Auto-Delete (days)", description: "Number of days files remain in trash before automatic permanent deletion by the system." },
    { key: "max_upload_size_mb", label: "Max Upload Size (MB)", description: "Maximum allowed file size per individual upload in megabytes. Larger files will be rejected." },
  ];

  const completedTxns = (transactions ?? []).filter((t: any) => t.status === "completed");
  const totalRevenue = completedTxns.reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const avgStoragePerUser = totalUsers > 0 ? totalStorage / totalUsers : 0;
  const trashedFiles = (allFiles ?? []).filter((f: any) => f.is_trashed).length;
  const folders = (allFiles ?? []).filter((f: any) => f.is_folder).length;

  return (
    <div className="flex min-h-screen bg-background w-full">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setSearchQuery(""); }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border px-4 md:px-6 h-14 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-secondary">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-destructive" />
            <h1 className="text-sm font-display font-bold text-foreground">YoCloud Admin</h1>
          </div>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">System Control Panel</span>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-5 pb-24 overflow-y-auto">

          {/* ─── OVERVIEW ─── */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-display font-bold text-foreground">System Overview</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time snapshot of your YoCloud platform. Monitor user growth, storage consumption, revenue, and system health at a glance.
                </p>
              </div>

              {/* Headline Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Registered Users", value: String(totalUsers), sub: `${recentUsers.length} joined recently`, icon: Users, accent: "text-primary" },
                  { label: "Total Files", value: String(totalFiles), sub: `${folders} folders · ${trashedFiles} trashed`, icon: Database, accent: "text-chart-1" },
                  { label: "Storage Used", value: formatSize(totalStorage), sub: `Avg ${formatSize(avgStoragePerUser)} per user`, icon: HardDrive, accent: "text-chart-2" },
                  { label: "Revenue", value: `৳${totalRevenue.toLocaleString()}`, sub: `${completedTxns.length} completed txns`, icon: TrendingUp, accent: "text-chart-3" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-2xl border border-border bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <stat.icon className={cn("w-5 h-5", stat.accent)} />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</span>
                    </div>
                    <p className="text-xl md:text-2xl font-display font-bold text-foreground leading-none">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5">{stat.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Storage Distribution + System Health */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Storage Distribution</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Breakdown of storage usage by file type across the entire platform. Helps identify which content types consume the most space.</p>
                  <div className="space-y-2">
                    {[
                      { label: "Images", icon: Image, count: fileBreakdown.images.count, bytes: fileBreakdown.images.bytes, color: "bg-chart-1" },
                      { label: "Videos", icon: Video, count: fileBreakdown.videos.count, bytes: fileBreakdown.videos.bytes, color: "bg-chart-2" },
                      { label: "Documents", icon: FileText, count: fileBreakdown.docs.count, bytes: fileBreakdown.docs.bytes, color: "bg-chart-3" },
                      { label: "Other Files", icon: FileIcon, count: fileBreakdown.other.count, bytes: fileBreakdown.other.bytes, color: "bg-muted-foreground" },
                    ].map((cat) => {
                      const pct = totalStorage > 0 ? (cat.bytes / totalStorage) * 100 : 0;
                      return (
                        <div key={cat.label} className="p-3 rounded-xl border border-border/50 bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <cat.icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground">{cat.label}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono text-foreground">{formatSize(cat.bytes)}</span>
                              <span className="text-[10px] text-muted-foreground ml-1.5">({cat.count} files)</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-700", cat.color)} style={{ width: `${Math.max(pct, 0.5)}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(1)}% of total storage</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">System Health</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Key operational metrics showing platform capacity and usage patterns.</p>
                  <div className="space-y-1.5">
                    {[
                      { label: "Total Storage Capacity", value: formatSize(totalStorage), detail: `Distributed across ${totalUsers} accounts` },
                      { label: "Average Per User", value: formatSize(avgStoragePerUser), detail: totalUsers > 0 ? `${totalUsers} active accounts monitored` : "No users registered" },
                      { label: "Files in Trash", value: String(trashedFiles), detail: "Awaiting auto-deletion or recovery" },
                      { label: "Total Folders", value: String(folders), detail: "Directory structures across all workspaces" },
                      { label: "Admin Actions", value: String(adminLogs?.length ?? 0), detail: "Recorded in audit trail" },
                      { label: "Pending Payments", value: String((transactions ?? []).filter((t: any) => t.status === "pending").length), detail: "Transactions awaiting gateway confirmation" },
                    ].map((item) => (
                      <div key={item.label} className="p-2.5 rounded-lg border border-border/40 hover:border-border transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">{item.label}</span>
                          <span className="text-xs font-medium text-foreground font-mono">{item.value}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{item.detail}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Users */}
                  <div className="pt-2">
                    <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Recent Signups
                    </h3>
                    <div className="space-y-1.5">
                      {recentUsers.map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/40 transition-colors">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-foreground truncate">{u.display_name || u.email?.split("@")[0]}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">{u.email}</p>
                          </div>
                          <span className="text-[9px] text-muted-foreground shrink-0 ml-2">{timeAgo(u.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── USERS ─── */}
          {activeTab === "users" && (
            <AdminUserManagement users={users ?? []} userStorageMap={userStorageMap} />
          )}

          {/* ─── CHARTS ─── */}
          {activeTab === "charts" && (
            <AdminDashboardCharts users={users ?? []} allFiles={allFiles ?? []} activity={activity ?? []} />
          )}

          {/* ─── NOTIFICATIONS ─── */}
          {activeTab === "notifications" && (
            <AdminBulkNotification users={users ?? []} />
          )}

          {/* ─── PLAN UPGRADE ─── */}
          {activeTab === "plans" && (
            <AdminPlanUpgrade users={users ?? []} userStorageMap={userStorageMap} />
          )}

          {/* ─── MARKETPLACE ─── */}
          {activeTab === "marketplace" && (
            <AdminMarketplaceModeration />
          )}

          {/* ─── WORKSPACES ─── */}
          {activeTab === "workspaces" && (
            <AdminWorkspaceManagement />
          )}

          {/* ─── FILES ─── */}
          {activeTab === "files" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                  <FileIcon className="w-4.5 h-4.5 text-primary" /> File Management
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{totalFiles} total files · {formatSize(totalStorage)} storage used</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Browse and manage all files across every user account and workspace. Search by filename to locate specific items.
                  Admin deletions are permanent and logged in the audit trail. Hover over a file to reveal the delete action.
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by filename..."
                  className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <p className="text-[10px] text-muted-foreground">Showing {Math.min(filePage * PAGE_SIZE + 1, filteredFiles.length)}–{Math.min((filePage + 1) * PAGE_SIZE, filteredFiles.length)} of {filteredFiles.length} files {searchQuery && `matching "${searchQuery}"`}</p>
              <div className="space-y-1.5 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
                {filteredFiles.slice(filePage * PAGE_SIZE, (filePage + 1) * PAGE_SIZE).map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-border bg-card transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span className="font-mono">{formatSize(f.size || 0)}</span>
                        <span>·</span>
                        <span>{f.mime_type?.split("/")[0] || "file"}</span>
                        <span>·</span>
                        <span className="font-mono">{f.user_id?.slice(0, 8)}…</span>
                        {f.is_trashed && <span className="text-destructive font-medium ml-1">trashed</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost"
                      onClick={() => setDeleteTarget({ id: f.id, name: f.name, storagePath: f.storage_path })}
                      className="text-destructive hover:text-destructive h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {filteredFiles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-12">No files found</p>
                )}
              </div>
              {filteredFiles.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[10px] text-muted-foreground">Page {filePage + 1} of {Math.ceil(filteredFiles.length / PAGE_SIZE)}</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={filePage === 0} onClick={() => setFilePage(p => p - 1)}>
                      <ChevronLeft className="w-3 h-3 mr-0.5" /> Prev
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={(filePage + 1) * PAGE_SIZE >= filteredFiles.length} onClick={() => setFilePage(p => p + 1)}>
                      Next <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── CLEANUP ─── */}
          {activeTab === "cleanup" && (
            <AdminFileCleanup allFiles={allFiles ?? []} />
          )}

          {/* ─── STORAGE ANALYTICS ─── */}
          {activeTab === "storage" && (
            <AdminStorageAnalytics users={users ?? []} allFiles={allFiles ?? []} userStorageMap={userStorageMap} />
          )}

          {/* ─── ACTIVITY ─── */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-primary" /> Activity Timeline
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">All user file operations across the entire platform</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Chronological feed of every upload, download, rename, delete, share, and move action performed by any user.
                  Search by filename or action type to investigate specific events.
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activity..."
                  className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <p className="text-[10px] text-muted-foreground">Showing {Math.min(activityPage * PAGE_SIZE + 1, filteredActivity.length)}–{Math.min((activityPage + 1) * PAGE_SIZE, filteredActivity.length)} of {filteredActivity.length} events</p>
              <div className="space-y-1 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
                {filteredActivity.slice(activityPage * PAGE_SIZE, (activityPage + 1) * PAGE_SIZE).map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground">
                        <span className="font-medium capitalize">{a.action.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground"> — </span>
                        <span className="text-muted-foreground truncate">{a.file_name}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        User {a.user_id?.slice(0, 8)}… · {timeAgo(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredActivity.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-12">No activity recorded</p>
                )}
              </div>
              {filteredActivity.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[10px] text-muted-foreground">Page {activityPage + 1} of {Math.ceil(filteredActivity.length / PAGE_SIZE)}</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={activityPage === 0} onClick={() => setActivityPage(p => p - 1)}>
                      <ChevronLeft className="w-3 h-3 mr-0.5" /> Prev
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={(activityPage + 1) * PAGE_SIZE >= filteredActivity.length} onClick={() => setActivityPage(p => p + 1)}>
                      Next <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── ADMIN LOGS ─── */}
          {activeTab === "logs" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                  <ScrollText className="w-4.5 h-4.5 text-primary" /> Admin Audit Logs
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Complete audit trail of all administrator operations</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Every admin action is recorded here with full context — who performed the action, what was affected, and when it happened.
                  This log cannot be modified or deleted for security and compliance purposes.
                </p>
              </div>
              <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {(!adminLogs || adminLogs.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No admin actions logged yet. Actions like banning users, deleting files, or changing config will appear here.</p>
                ) : (
                  adminLogs.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-xl border border-border/40 hover:border-border bg-card transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-foreground font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                            <span className="font-mono">Admin: {log.admin_id?.slice(0, 8)}…</span>
                            {log.target_user_id && <><span>·</span><span className="font-mono">Target User: {log.target_user_id.slice(0, 8)}…</span></>}
                            {log.target_file_id && <><span>·</span><span className="font-mono">File: {log.target_file_id.slice(0, 8)}…</span></>}
                          </div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <p className="text-[10px] text-muted-foreground/70 font-mono mt-1 truncate max-w-md">{JSON.stringify(log.details)}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">{timeAgo(log.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── SYSTEM CONFIG ─── */}
          {activeTab === "config" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                  <Settings className="w-4.5 h-4.5 text-primary" /> System Configuration
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Global settings that affect all users and system behavior</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Changes here take effect immediately for all users. Modify storage defaults, security timeouts, and cleanup policies.
                  Every configuration change is recorded in the audit trail with the admin who made it.
                </p>
              </div>
              <div className="space-y-3">
                {configKeys.map((cfg) => {
                  const currentValue = configEdits[cfg.key] ?? systemConfig?.[cfg.key] ?? "";
                  const isModified = configEdits[cfg.key] && configEdits[cfg.key] !== systemConfig?.[cfg.key];
                  return (
                    <div key={cfg.key} className={cn(
                      "p-4 rounded-xl border transition-colors",
                      isModified ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card"
                    )}>
                      <label className="text-xs font-semibold text-foreground">{cfg.label}</label>
                      <p className="text-[10px] text-muted-foreground mt-0.5 mb-2.5">{cfg.description}</p>
                      <div className="flex gap-2">
                        <input type="text" value={currentValue}
                          onChange={(e) => setConfigEdits((prev) => ({ ...prev, [cfg.key]: e.target.value }))}
                          className="flex-1 h-9 px-3 bg-secondary/50 border border-border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring/30" />
                        <Button size="sm" variant={isModified ? "default" : "outline"} className="h-9"
                          disabled={!isModified}
                          onClick={() => {
                            if (configEdits[cfg.key]) {
                              updateConfig.mutate({ key: cfg.key, value: configEdits[cfg.key] });
                              setConfigEdits((prev) => { const n = { ...prev }; delete n[cfg.key]; return n; });
                            }
                          }}>
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── TRANSACTIONS ─── */}
          {activeTab === "transactions" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="w-4.5 h-4.5 text-primary" /> Payment History
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{transactions?.length ?? 0} total transactions · ৳{totalRevenue.toLocaleString()} total revenue</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Complete record of all payment transactions processed through UddoktaPay. Track completed, pending, and failed payments.
                  Each entry shows the plan purchased, amount, user, status, and gateway transaction ID.
                </p>
              </div>
              {!transactions || transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No transactions recorded yet. Payments will appear here when users upgrade their plans.</p>
              ) : (
                <div className="space-y-1.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                  {transactions.map((txn: any) => (
                    <div key={txn.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-border bg-card transition-colors">
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        txn.status === "completed" ? "bg-green-500" : txn.status === "pending" ? "bg-yellow-500" : "bg-destructive"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground capitalize">{txn.plan} Plan</p>
                          <span className="text-xs font-mono text-foreground">৳{txn.amount}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                          <span className="font-mono">{txn.user_id?.slice(0, 8)}…</span>
                          <span>·</span>
                          <span className={cn(
                            "capitalize font-medium",
                            txn.status === "completed" ? "text-green-500" : txn.status === "pending" ? "text-yellow-500" : "text-destructive"
                          )}>{txn.status}</span>
                          {txn.transaction_id && <><span>·</span><span className="font-mono">{txn.transaction_id}</span></>}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">{timeAgo(txn.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── API MANAGEMENT ─── */}
          {activeTab === "api" && (
            <AdminApiManagement />
          )}
        </main>
      </div>

      <ResponsiveDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete file (Admin)?"
        description={`Permanently delete "${deleteTarget?.name}"? This action cannot be undone and will be recorded in the audit trail.`}
        icon={<div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-destructive" /></div>}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteTarget) { deleteFile.mutate({ fileId: deleteTarget.id, storagePath: deleteTarget.storagePath }); setDeleteTarget(null); } }} className="flex-1">Delete</Button>
          </>
        }
      >
        {null}
      </ResponsiveDialog>
      <BottomNavbar activeItem="menu" onItemClick={(item) => {
        if (item === "menu") navigate("/menu");
        else navigate("/");
      }} onUploadClick={() => navigate("/")} />
    </div>
  );
}
