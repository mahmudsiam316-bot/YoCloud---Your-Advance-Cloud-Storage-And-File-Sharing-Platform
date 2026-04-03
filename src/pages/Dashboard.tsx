import { useState, useMemo } from "react"; 
import { useAuth } from "@/hooks/useAuth";
import { useFiles, useActivityLog } from "@/hooks/useFiles";
import { useProfile, useIsAdmin } from "@/hooks/useRoles";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useNavigate } from "react-router-dom";
import {
  HardDrive, FileIcon, FolderIcon, Upload, Clock, Image, Video, FileText,
  Zap, TrendingUp, ArrowRight, BarChart3, Shield, Star,
  Trash2, Share2, Activity, Database, Globe, Lock, Eye,
  ArrowUpRight, Calendar, Layers, PieChart, Sparkles, Code, Palette,
  GraduationCap, Briefcase, Store, Users, Cpu, CloudUpload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { BottomNavbar } from "@/components/BottomNavbar";
import { FileTypeIcon } from "@/components/FileTypeIcon";

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
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
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface Recommendation {
  icon: any;
  title: string;
  desc: string;
  action?: string;
  badge?: string;
}

function getRecommendations(professions: string[], intents: string[], level: string): Recommendation[] {
  const recs: Recommendation[] = [];

  if (professions.includes("developer")) {
    recs.push({ icon: Code, title: "API Integration", desc: "Connect your apps with our REST API. Generate keys, test endpoints, and build powerful integrations.", action: "/api-docs", badge: "Developer" });
    recs.push({ icon: Cpu, title: "Developer Dashboard", desc: "Monitor API usage, inspect request logs, and debug your integrations in real-time.", action: "/developer", badge: "Pro Tool" });
  }
  if (professions.includes("designer")) {
    recs.push({ icon: Palette, title: "Visual Gallery", desc: "Browse your images in a beautiful grid layout. Perfect for organizing design assets and portfolios.", action: "/", badge: "Designer" });
  }
  if (professions.includes("student")) {
    recs.push({ icon: GraduationCap, title: "Organize by Subject", desc: "Create folders for each subject or course. Keep your study materials organized and easy to find.", action: "/", badge: "Study Tip" });
  }
  if (professions.includes("business")) {
    recs.push({ icon: Briefcase, title: "Team Workspace", desc: "Set up a team workspace to collaborate with colleagues. Share files, assign roles, and manage access.", action: "/workspace-settings", badge: "Business" });
  }
  if (professions.includes("creator")) {
    recs.push({ icon: Store, title: "Marketplace", desc: "Share your creations with the community. Publish templates, assets, and resources on the marketplace.", action: "/marketplace", badge: "Creator" });
  }

  if (intents.includes("collaboration") && !recs.find(r => r.title.includes("Workspace"))) {
    recs.push({ icon: Users, title: "Create Team Workspace", desc: "Invite your team members and start collaborating on shared files and folders.", action: "/workspace-settings", badge: "Collaboration" });
  }
  if (intents.includes("api") && !recs.find(r => r.title.includes("API"))) {
    recs.push({ icon: Cpu, title: "Explore the API", desc: "Access your files programmatically. Our API supports uploads, downloads, sharing, and AI analysis.", action: "/api-docs", badge: "API" });
  }
  if (intents.includes("marketplace") && !recs.find(r => r.title.includes("Marketplace"))) {
    recs.push({ icon: Store, title: "Browse Marketplace", desc: "Discover templates, assets, and resources shared by the community.", action: "/marketplace", badge: "Marketplace" });
  }
  if (intents.includes("backup")) {
    recs.push({ icon: CloudUpload, title: "Auto-Backup Setup", desc: "Upload important files regularly. Use folders and tags to keep your backups organized and searchable.", action: "/", badge: "Backup" });
  }

  if (level === "beginner" && recs.length < 3) {
    recs.push({ icon: Upload, title: "Upload Your First File", desc: "Drag and drop files into your workspace, or click upload. Supports images, videos, documents, and more.", action: "/" });
  }
  if (level === "advanced" && !recs.find(r => r.title.includes("API"))) {
    recs.push({ icon: Code, title: "Power User Tools", desc: "Explore API keys, webhooks, and advanced sharing options to supercharge your workflow.", action: "/developer", badge: "Advanced" });
  }

  if (recs.length < 3) {
    if (!recs.find(r => r.title.includes("Marketplace")))
      recs.push({ icon: Store, title: "Explore Marketplace", desc: "Discover and share digital assets, templates, and resources with the YoCloud community.", action: "/marketplace" });
    if (recs.length < 3)
      recs.push({ icon: Share2, title: "Share a File", desc: "Generate secure share links with passwords, expiry dates, and download limits.", action: "/" });
    if (recs.length < 3)
      recs.push({ icon: Zap, title: "Upgrade Storage", desc: "Get more storage, faster uploads, and premium features with an upgraded plan.", action: "/upgrade" });
  }

  return recs.slice(0, 6);
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: files } = useFiles();
  const { data: logs } = useActivityLog();
  const { data: profile } = useProfile();
  const { preferences } = useOnboarding();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allFiles = files ?? [];
  const activeFiles = allFiles.filter((f) => !f.is_trashed);
  const totalUsed = activeFiles.reduce((s, f) => s + (f.size || 0), 0);
  const fileCount = activeFiles.filter((f) => !f.is_folder).length;
  const folderCount = activeFiles.filter((f) => f.is_folder).length;
  const starredCount = activeFiles.filter((f) => f.is_starred).length;
  const trashedCount = allFiles.filter((f) => f.is_trashed).length;
  const storageLimit = profile?.storage_limit ?? 5368709120;
  const storagePercent = Math.min((totalUsed / storageLimit) * 100, 100);
  const plan = (profile?.storage_plan ?? "free").charAt(0).toUpperCase() + (profile?.storage_plan ?? "free").slice(1);

  const categories = useMemo(() => {
    const cats = { images: { bytes: 0, count: 0 }, videos: { bytes: 0, count: 0 }, documents: { bytes: 0, count: 0 }, other: { bytes: 0, count: 0 } };
    activeFiles.filter((f) => !f.is_folder).forEach((f) => {
      const m = f.mime_type || "";
      if (m.startsWith("image/")) { cats.images.bytes += f.size || 0; cats.images.count++; }
      else if (m.startsWith("video/")) { cats.videos.bytes += f.size || 0; cats.videos.count++; }
      else if (m.includes("pdf") || m.includes("document") || m.includes("word") || m.includes("text/")) { cats.documents.bytes += f.size || 0; cats.documents.count++; }
      else { cats.other.bytes += f.size || 0; cats.other.count++; }
    });
    return cats;
  }, [activeFiles]);

  const recentUploads = useMemo(() => {
    return [...activeFiles]
      .filter((f) => !f.is_folder)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [activeFiles]);

  const recentActivity = (logs ?? []).slice(0, 20);

  const totalNonZero = Math.max(totalUsed, 1);
  const categoryData = [
    { label: "Images", icon: Image, color: "bg-chart-1", textColor: "text-chart-1", bytes: categories.images.bytes, count: categories.images.count },
    { label: "Videos", icon: Video, color: "bg-chart-2", textColor: "text-chart-2", bytes: categories.videos.bytes, count: categories.videos.count },
    { label: "Documents", icon: FileText, color: "bg-chart-3", textColor: "text-chart-3", bytes: categories.documents.bytes, count: categories.documents.count },
    { label: "Other", icon: FileIcon, color: "bg-muted-foreground", textColor: "text-muted-foreground", bytes: categories.other.bytes, count: categories.other.count },
  ];

  const accountCreated = user?.created_at ? formatDate(user.created_at) : "—";

  return (
    <div className="flex min-h-screen bg-background w-full">
      <AppSidebar
        activeItem="dashboard"
        onItemClick={(item) => {
          if (item === "dashboard") return;
          navigate("/");
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        storageUsedBytes={totalUsed}
        storageLimitBytes={storageLimit}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto pb-24">
          {/* Hero / Welcome Section */}
          <div className="border-b border-border bg-card/50">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-start justify-between gap-6"
              >
                <div className="space-y-2 max-w-2xl">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground leading-tight">
                    Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Your personal cloud dashboard gives you a complete overview of your storage, files, and recent activity.
                    You currently have <span className="font-semibold text-foreground">{fileCount} files</span> organized across{" "}
                    <span className="font-semibold text-foreground">{folderCount} folders</span>, using{" "}
                    <span className="font-semibold text-foreground">{formatSize(totalUsed)}</span> out of your{" "}
                    <span className="font-semibold text-foreground">{formatSize(storageLimit)}</span> storage capacity.
                    {storagePercent > 80
                      ? " Your storage is getting full — consider upgrading for more space."
                      : storagePercent <= 20
                      ? " You have plenty of room for more uploads."
                      : ` That's ${storagePercent.toFixed(0)}% of your total allocation.`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-1.5">
                      <Shield className="w-4 h-4" /> Admin Panel
                    </Button>
                  )}
                  <Button onClick={() => navigate("/upgrade")} size="sm" className="gap-1.5">
                    <Zap className="w-4 h-4" /> Upgrade Plan
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
            {/* Storage Overview — Full Width */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-5 md:p-6 border-b border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-primary" /> Storage Overview
                  </h2>
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {plan} Plan
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  A detailed breakdown of how your storage is being used across different file types.
                  Monitor your usage to ensure you always have room for important files.
                </p>
              </div>

              <div className="p-5 md:p-6">
                {/* Main bar */}
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Used Storage</p>
                    <span className="text-3xl md:text-4xl font-display font-bold text-foreground">{formatSize(totalUsed)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Total Capacity</p>
                    <span className="text-lg font-display font-semibold text-muted-foreground">{formatSize(storageLimit)}</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-secondary rounded-full overflow-hidden mb-6">
                  <motion.div
                    className={`h-full rounded-full ${storagePercent > 80 ? "bg-destructive" : "bg-primary"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${storagePercent}%` }}
                    transition={{ type: "spring", stiffness: 150, damping: 20 }}
                  />
                </div>

                {/* Category breakdown — detailed list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categoryData.map((cat) => {
                    const pct = totalUsed > 0 ? ((cat.bytes / totalUsed) * 100).toFixed(1) : "0";
                    return (
                      <div key={cat.label} className="bg-secondary/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${cat.color}/15 flex items-center justify-center`}>
                            <cat.icon className={`w-4 h-4 ${cat.textColor}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{cat.label}</p>
                            <p className="text-[10px] text-muted-foreground">{cat.count} file{cat.count !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{formatSize(cat.bytes)}</span>
                          <span className="text-[10px] text-muted-foreground">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            {/* Quick Insights — Text-based, no cards */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-5 md:p-6"
            >
              <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-primary" /> Quick Insights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6">
                {[
                  {
                    icon: FileIcon, label: "Total Files",
                    value: `${fileCount}`,
                    detail: `Across ${folderCount} folders. Your most common file type is ${
                      categoryData.reduce((max, c) => c.count > max.count ? c : max, categoryData[0]).label.toLowerCase()
                    }.`,
                    action: () => navigate("/"),
                  },
                  {
                    icon: Star, label: "Starred Items",
                    value: `${starredCount}`,
                    detail: starredCount > 0
                      ? `You've marked ${starredCount} item${starredCount !== 1 ? "s" : ""} as important for quick access.`
                      : "Star important files to find them quickly from anywhere in your storage.",
                    action: () => navigate("/"),
                  },
                  {
                    icon: Share2, label: "Shared Content",
                    value: "—",
                    detail: "Files and folders you've shared with others via links, QR codes, or direct invitations.",
                    action: () => navigate("/"),
                  },
                  {
                    icon: Trash2, label: "Trash",
                    value: `${trashedCount}`,
                    detail: trashedCount > 0
                      ? `${trashedCount} item${trashedCount !== 1 ? "s" : ""} in trash. Auto-deleted after ${profile?.auto_trash_days ?? 30} days.`
                      : `Trash is empty. Deleted items are kept for ${profile?.auto_trash_days ?? 30} days before permanent removal.`,
                    action: () => navigate("/"),
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="text-left group p-3 rounded-xl hover:bg-secondary/50 transition-colors -m-3"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</span>
                    </div>
                    <p className="text-2xl font-display font-bold text-foreground mb-1">{item.value}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* Two Column — Recent Uploads + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Recent Uploads — Wider */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="lg:col-span-3 bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-border/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" /> Recent Uploads
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The latest files added to your storage, sorted by upload date.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/")}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="divide-y divide-border/30">
                  {recentUploads.length === 0 ? (
                    <div className="text-center py-12 px-5">
                      <Upload className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No files uploaded yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs mx-auto">
                        Upload your first file to see it here. You can drag and drop files, or use the upload button.
                      </p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/")}>
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Files
                      </Button>
                    </div>
                  ) : (
                    recentUploads.map((f) => (
                      <button
                        key={f.id}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors text-left"
                        onClick={() => navigate("/")}
                      >
                        <FileTypeIcon name={f.name} mime={f.mime_type || ""} isFolder={f.is_folder} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatSize(f.size || 0)} · Uploaded {formatDate(f.created_at)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-muted-foreground font-mono">{timeAgo(f.created_at)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.section>

              {/* Activity Timeline — Narrower */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-border/50">
                  <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Activity Timeline
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {recentActivity.length > 0
                      ? `${recentActivity.length} recent actions tracked across your storage.`
                      : "All your file operations will be logged here in real-time."}
                  </p>
                </div>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-12 px-5">
                    <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Upload, move, rename, or share files to see activity here.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <div className="divide-y divide-border/30">
                      {recentActivity.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground">
                              <span className="font-semibold capitalize">{log.action}</span>{" "}
                              <span className="text-muted-foreground truncate">{log.file_name}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{timeAgo(log.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.section>
            </div>

            {/* Personalized Recommendations */}
            {preferences && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 md:p-6 border-b border-border/50">
                  <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" /> Recommended for You
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Personalized suggestions based on your profile as {preferences.profession?.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ") || "a user"}
                    {preferences.country ? ` from ${preferences.country}` : ""}.
                  </p>
                </div>
                <div className="p-5 md:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getRecommendations(preferences.profession || [], preferences.usage_intent || [], preferences.experience_level || "beginner").map((rec, i) => (
                      <button
                        key={i}
                        onClick={() => rec.action && navigate(rec.action)}
                        className="text-left p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/30 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <rec.icon className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{rec.desc}</p>
                        {rec.badge && (
                          <span className="inline-block mt-2 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {rec.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}


            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-5 md:p-6 border-b border-border/50">
                <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Account Details
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your subscription, storage configuration, and account information at a glance.
                </p>
              </div>
              <div className="p-5 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { icon: Globe, label: "Email Address", value: user?.email || "—", desc: "Primary account email used for login and notifications" },
                    { icon: Layers, label: "Current Plan", value: plan, desc: `Your ${plan.toLowerCase()} plan includes ${formatSize(storageLimit)} of storage capacity` },
                    { icon: Database, label: "Storage Capacity", value: formatSize(storageLimit), desc: `${formatSize(storageLimit - totalUsed)} remaining · ${storagePercent.toFixed(1)}% used` },
                    { icon: Calendar, label: "Auto-Trash Period", value: `${profile?.auto_trash_days ?? 30} days`, desc: "Trashed files are permanently deleted after this period" },
                  ].map((row) => (
                    <div key={row.label} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <row.icon className="w-4 h-4 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{row.label}</p>
                      </div>
                      <p className="text-lg font-display font-semibold text-foreground truncate">{row.value}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{row.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          </div>
        </main>
      </div>
      <BottomNavbar activeItem="menu" onItemClick={(item) => {
        if (item === "menu") navigate("/menu");
        else navigate("/");
      }} onUploadClick={() => navigate("/")} />
    </div>
  );
}
