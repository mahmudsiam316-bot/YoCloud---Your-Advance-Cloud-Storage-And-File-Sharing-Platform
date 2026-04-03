import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useIsAdmin } from "@/hooks/useRoles";
import { useFiles } from "@/hooks/useFiles";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, LayoutDashboard, Shield, Trash2, Zap, Settings, HelpCircle,
  LogOut, ChevronRight, ExternalLink, FileIcon, HardDrive, Info, X,
  Users, MessageCircle, Hash, Globe, Camera, Check, Loader2, Pencil,
  Star, Share2, Image, Video, FileText, Clock, Database, Calendar,
  FolderOpen, Activity, Lock, ArrowUpRight, Store, Terminal
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNavbar } from "@/components/BottomNavbar";
import { UploadDrawer } from "@/components/UploadDrawer";
import { cn } from "@/lib/utils";
import { MobileSettingsContent } from "@/components/SettingsDialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DiscordIcon, FacebookIcon, InstagramIcon } from "@/components/SocialIcons";

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function getInitials(email: string): string {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

const DISCORD_INVITE = "https://discord.gg/8jz3pUaebk";

export default function MenuPage() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: files } = useFiles();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [discordOpen, setDiscordOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      if (window.innerWidth >= 768) {
        navigate("/dashboard", { replace: true });
      }
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, [navigate]);

  const email = user?.email ?? "";
  const displayName = profile?.display_name || email.split("@")[0];
  const plan = (profile?.storage_plan ?? "free").charAt(0).toUpperCase() + (profile?.storage_plan ?? "free").slice(1);
  const storageLimit = profile?.storage_limit ?? 5368709120;
  const allFiles = files ?? [];
  const activeFiles = allFiles.filter((f) => !f.is_trashed);
  const totalUsed = activeFiles.reduce((s, f) => s + (f.size || 0), 0);
  const storagePercent = Math.min((totalUsed / storageLimit) * 100, 100);
  const fileCount = activeFiles.filter((f) => !f.is_folder).length;
  const folderCount = activeFiles.filter((f) => f.is_folder).length;
  const starredCount = activeFiles.filter((f) => f.is_starred).length;
  const trashedCount = allFiles.filter((f) => f.is_trashed).length;

  const openProfileEdit = () => {
    setEditName(profile?.display_name || "");
    setProfileEditOpen(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: editName.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated!");
      setProfileEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}/profile.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("user-files").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("user-files").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
      const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
      if (updateErr) throw updateErr;
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile picture updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <FileIcon className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">Menu</span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Avatar className="w-14 h-14">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  {getInitials(email)}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors cursor-pointer">
                {avatarUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">{displayName}</h2>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" /> {plan} Plan
              </span>
            </div>
            <button
              onClick={openProfileEdit}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 hover:bg-secondary/80 transition-colors"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Storage details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Storage Usage</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {storagePercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", storagePercent > 80 ? "bg-destructive" : "bg-primary")}
                initial={{ width: 0 }}
                animate={{ width: `${storagePercent}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{formatSize(totalUsed)}</span>
              <span className="text-xs text-muted-foreground">of {formatSize(storageLimit)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {storagePercent > 80
                ? "Your storage is nearly full. Upgrade your plan or free up space by removing unused files."
                : `You have ${formatSize(storageLimit - totalUsed)} of free space remaining. Upload more files or organize your existing content.`}
            </p>
          </div>
        </motion.div>

        {/* File Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Your Files
          </p>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border/50">
            {[
              { icon: FileIcon, label: "Total Files", value: `${fileCount}`, desc: `${fileCount} files stored across ${folderCount} folders in your cloud storage` },
              { icon: FolderOpen, label: "Folders", value: `${folderCount}`, desc: `${folderCount} folder${folderCount !== 1 ? "s" : ""} to keep your files organized and structured` },
              { icon: Star, label: "Starred", value: `${starredCount}`, desc: starredCount > 0 ? `${starredCount} important file${starredCount !== 1 ? "s" : ""} marked for quick access` : "Mark files as starred to find them easily" },
              { icon: Trash2, label: "Trash", value: `${trashedCount}`, desc: trashedCount > 0 ? `${trashedCount} deleted item${trashedCount !== 1 ? "s" : ""} · auto-removed after ${profile?.auto_trash_days ?? 30} days` : "Your trash is empty — deleted files appear here" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <span className="text-sm font-display font-bold text-foreground">{item.value}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Navigation Sections */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Account & Settings
          </p>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border/50">
            {[
              {
                icon: LayoutDashboard, label: "Dashboard",
                desc: "Complete overview of your storage usage, recent activity, file statistics, and account information",
                onClick: () => navigate("/dashboard"),
              },
              ...(isAdmin ? [{
                icon: Shield, label: "Admin Panel",
                desc: "System management tools — manage users, monitor storage, view logs, and configure settings",
                onClick: () => navigate("/admin"),
              }] : []),
              {
                icon: Users, label: "Workspace Settings",
                desc: "Manage your workspaces, invite team members, and configure workspace storage & permissions",
                onClick: () => navigate("/workspace"),
              },
              {
                icon: Store, label: "Marketplace",
                desc: "Browse, discover, and share files with the community. Publish your files for others to download",
                onClick: () => navigate("/marketplace"),
              },
              {
                icon: Terminal, label: "Developer API",
                desc: "Access REST API for file management. Generate API keys, view docs, monitor usage, and configure webhooks",
                onClick: () => navigate("/developer"),
              },
              {
                icon: HardDrive, label: "My Storage",
                desc: `Browse and manage all ${fileCount} files and ${folderCount} folders in your cloud storage`,
                onClick: () => navigate("/"),
              },
              {
                icon: Trash2, label: "Trash",
                desc: `${trashedCount} item${trashedCount !== 1 ? "s" : ""} in trash. Files are permanently removed after ${profile?.auto_trash_days ?? 30} days`,
                onClick: () => navigate("/trash"),
              },
              {
                icon: Zap, label: "Upgrade Plan",
                desc: `Currently on ${plan} plan with ${formatSize(storageLimit)} storage. Upgrade for more space and features`,
                onClick: () => navigate("/upgrade"),
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-2.5 shrink-0" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Community */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Community
          </p>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border/50">
            <button
              onClick={() => setDiscordOpen(true)}
              className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-[#5865F2]/15 flex items-center justify-center shrink-0 mt-0.5">
                <DiscordIcon className="w-4 h-4 text-[#5865F2]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Discord Community</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Join our Discord for help, feature requests, bug reports, and community chat.
                </p>
              </div>
              <span className="text-[10px] font-semibold bg-[#5865F2] text-white px-2 py-0.5 rounded-full mt-2 shrink-0">
                Join
              </span>
            </button>
            <button
              onClick={() => window.open("https://facebook.com/yocloud", "_blank")}
              className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-[#1877F2]/15 flex items-center justify-center shrink-0 mt-0.5">
                <FacebookIcon className="w-4 h-4 text-[#1877F2]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Facebook Page</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Follow us on Facebook for news, updates, tips, and community highlights.
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 mt-2.5 shrink-0" />
            </button>
            <button
              onClick={() => window.open("https://instagram.com/yocloud", "_blank")}
              className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-[#E4405F]/15 flex items-center justify-center shrink-0 mt-0.5">
                <InstagramIcon className="w-4 h-4 text-[#E4405F]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Instagram</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Follow us on Instagram for visual updates, behind-the-scenes content, and stories.
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 mt-2.5 shrink-0" />
            </button>
          </div>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            About
          </p>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border/50">
            {[
              { icon: Info, label: "About YoCloud", desc: "Version 1.0.0 · A modern, secure cloud storage platform built for speed and simplicity" },
              { icon: HelpCircle, label: "Help & Support", desc: "Get help with uploads, sharing, storage limits, billing, and account management" },
              { icon: Settings, label: "Settings", desc: "Configure auto-trash duration, notification preferences, and display options", onClick: () => setSettingsOpen(true) },
              { icon: Lock, label: "Privacy & Security", desc: "Your files are encrypted and protected. Learn about our security practices" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={'onClick' in item ? (item as any).onClick : undefined}
                className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-2.5 shrink-0" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Account Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Account Information
          </p>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            {[
              { label: "Email", value: email, desc: "Primary email address for login and notifications" },
              { label: "Display Name", value: displayName, desc: "How your name appears to others when sharing files" },
              { label: "Plan", value: `${plan} Plan`, desc: `${formatSize(storageLimit)} storage capacity included` },
              { label: "Auto-Trash", value: `${profile?.auto_trash_days ?? 30} days`, desc: "Trashed files are permanently deleted after this period" },
            ].map((item) => (
              <div key={item.label} className="py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</span>
                  <span className="text-sm font-medium text-foreground truncate ml-4 max-w-[200px] text-right">{item.value}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/70">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <button
            onClick={signOut}
            className="w-full flex items-start gap-3 px-4 py-3.5 bg-card border border-border rounded-2xl hover:bg-destructive/5 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Sign Out</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                Sign out of your account. Your files will remain safe and accessible when you log back in.
              </p>
            </div>
          </button>
        </motion.div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-muted-foreground/50">YoCloud v1.0.0 · Made with ❤️</p>
        </div>
      </div>

      {/* Profile Edit Drawer */}
      <AnimatePresence>
        {profileEditOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setProfileEditOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setProfileEditOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl border-t border-border pb-safe max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center py-2.5">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              <div className="px-5 pb-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-bold text-foreground">Edit Profile</h3>
                  <button onClick={() => setProfileEditOpen(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <Avatar className="w-20 h-20">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                      {getInitials(email)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-11"
                  />
                  <p className="text-[10px] text-muted-foreground/70">
                    This name will be visible when you share files with others.
                  </p>
                </div>

                <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Info</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Plan</span>
                    <span className="text-xs font-medium text-foreground">{plan}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Storage</span>
                    <span className="text-xs font-medium text-foreground">{formatSize(totalUsed)} / {formatSize(storageLimit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Files</span>
                    <span className="text-xs font-medium text-foreground">{fileCount}</span>
                  </div>
                </div>

                <Button onClick={saveProfile} disabled={saving} className="w-full h-11">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Drawer */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setSettingsOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setSettingsOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl border-t border-border pb-safe max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-center py-2.5">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="px-4 pb-6">
                <MobileSettingsContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Discord Drawer */}
      <AnimatePresence>
        {discordOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setDiscordOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setDiscordOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl border-t border-border pb-safe max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center py-2.5">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              <div className="px-5 pb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-bold text-foreground">Discord Community</h3>
                  <button onClick={() => setDiscordOpen(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 bg-[#5865F2] rounded-2xl flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-foreground">YoCloud Community</h4>
                      <p className="text-xs text-muted-foreground">Official Discord Server</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#5865F2]/15 text-[#5865F2] px-2 py-0.5 rounded-full">
                      <Globe className="w-3 h-3" /> Public Server
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      <Hash className="w-3 h-3" /> Cloud Storage
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      <Users className="w-3 h-3" /> Community
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    Join our Discord community to get help, share feedback, report bugs, suggest features, and connect with other YoCloud users.
                  </p>

                  <Button
                    className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold"
                    onClick={() => window.open(DISCORD_INVITE, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Join Discord Server
                  </Button>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Popular Channels</p>
                  <div className="space-y-1">
                    {[
                      { name: "general", desc: "General chat & discussion" },
                      { name: "announcements", desc: "Latest updates & news" },
                      { name: "bug-reports", desc: "Report issues & bugs" },
                      { name: "feature-requests", desc: "Suggest new features" },
                      { name: "help", desc: "Get support & help" },
                    ].map((ch) => (
                      <div key={ch.name} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-secondary/40">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">{ch.name}</p>
                          <p className="text-[10px] text-muted-foreground">{ch.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <UploadDrawer
        open={uploadDrawerOpen}
        onOpenChange={setUploadDrawerOpen}
        onFilesSelected={() => {}}
        isUploading={false}
        uploadTasks={[]}
        storageUsedBytes={totalUsed}
        storageLimitBytes={storageLimit}
      />

      <BottomNavbar activeItem="menu" onItemClick={(item) => {
        if (item === "menu") return;
        if (item === "my-storage" || item === "recents" || item === "photos") navigate("/");
      }} onUploadClick={() => setUploadDrawerOpen(true)} />
    </div>
  );
}
