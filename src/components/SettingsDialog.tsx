import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Key, Share2, FileIcon, Shield, Loader2, Check, X, Camera,
  ChevronRight, Monitor, Smartphone, MapPin, Clock, Globe, Eye, EyeOff,
  Lock, Upload, FolderOpen, FileText, Copy, Calendar, ToggleLeft,
  Sun, Moon, Laptop, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

function getInitials(email: string): string {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

interface SettingsSection {
  id: string;
  label: string;
  icon: any;
  desc: string;
}

const SECTIONS: SettingsSection[] = [
  { id: "account", label: "Account", icon: User, desc: "Profile, name, email & avatar" },
  { id: "appearance", label: "Appearance", icon: Sun, desc: "Theme, dark/light mode" },
  { id: "login-history", label: "Login History", icon: Key, desc: "Recent sign-in activity" },
  { id: "share", label: "Share Defaults", icon: Share2, desc: "Default sharing preferences" },
  { id: "files", label: "File Settings", icon: FileIcon, desc: "Upload & preview preferences" },
  { id: "privacy", label: "Privacy", icon: Shield, desc: "Security & data settings" },
  { id: "community", label: "Community", icon: Globe, desc: "Discord, Facebook, Instagram" },
];

// ─── Account Section ───
function AccountSection() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [editName, setEditName] = useState(profile?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const email = user?.email ?? "";

  useEffect(() => {
    if (profile?.display_name) setEditName(profile.display_name);
  }, [profile?.display_name]);

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
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}/profile.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("user-files")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("user-files").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);
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
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Account Settings</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Manage your personal information, display name, and profile picture. Changes here affect how others see you when sharing files.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="w-16 h-16">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {getInitials(email)}
            </AvatarFallback>
          </Avatar>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors cursor-pointer">
            {avatarUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={avatarUploading}
            />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Profile Picture</p>
          <p className="text-[11px] text-muted-foreground">Click the camera icon to upload. Max 2MB, recommended 256×256px.</p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Display Name</Label>
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your display name" className="h-10" />
        <p className="text-[10px] text-muted-foreground/70">
          This name is shown when you share files, leave comments, or collaborate in workspaces. Leave blank to use your email prefix.
        </p>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Email Address</Label>
        <div className="flex items-center gap-2">
          <Input value={email} disabled className="h-10 bg-muted/50" />
          <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full whitespace-nowrap">Verified</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70">
          Your primary email used for login, notifications, and share invitations. Contact support to change your email address.
        </p>
      </div>

      {/* Account Details */}
      <div className="bg-secondary/40 rounded-xl p-4 space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Details</p>
        {[
          { label: "Account ID", value: user?.id?.slice(0, 8) + "..." || "—", desc: "Unique identifier for your account" },
          { label: "Created", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—", desc: "Date your account was created" },
          { label: "Last Sign In", value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "—", desc: "Most recent login timestamp" },
          { label: "Auth Provider", value: user?.app_metadata?.provider || "email", desc: "Authentication method used to sign in" },
        ].map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <p className="text-[10px] text-muted-foreground/60">{item.desc}</p>
            </div>
            <span className="text-xs font-mono font-medium text-foreground shrink-0">{item.value}</span>
          </div>
        ))}
      </div>

      <Button onClick={saveProfile} disabled={saving} size="sm" className="w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}

// ─── Appearance Section ───
function AppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themeOptions = [
    { id: "light" as const, label: "Light", icon: Sun, desc: "Clean, bright interface for daytime use" },
    { id: "dark" as const, label: "Dark", icon: Moon, desc: "Easy on the eyes, perfect for night usage" },
    { id: "system" as const, label: "System", icon: Laptop, desc: "Follows your device's appearance setting" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Appearance</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Choose your preferred theme. The interface will update instantly. System mode automatically switches based on your device settings.
        </p>
      </div>

      <div className="space-y-2">
        {themeOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left",
              theme === opt.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border hover:border-primary/30 hover:bg-secondary/30"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              theme === opt.id ? "bg-primary/10" : "bg-secondary"
            )}>
              <opt.icon className={cn("w-5 h-5", theme === opt.id ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", theme === opt.id ? "text-primary" : "text-foreground")}>{opt.label}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
            </div>
            {theme === opt.id && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-secondary/40 rounded-xl p-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current State</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Active theme</span>
          <span className="font-medium text-foreground capitalize flex items-center gap-1.5">
            {resolvedTheme === "dark" ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
            {resolvedTheme}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Login History Section ───
function LoginHistorySection() {
  const { user } = useAuth();

  const mockHistory = [
    { device: "Chrome on Windows", location: "Dhaka, Bangladesh", time: "Just now", icon: Monitor, current: true },
    { device: "Safari on iPhone", location: "Dhaka, Bangladesh", time: "2 hours ago", icon: Smartphone, current: false },
    { device: "Firefox on macOS", location: "Chittagong, BD", time: "Yesterday", icon: Monitor, current: false },
    { device: "Chrome on Android", location: "Sylhet, BD", time: "3 days ago", icon: Smartphone, current: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Login History</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Review recent sign-in activity on your account. If you see any suspicious activity, change your password immediately and sign out of all other sessions.
        </p>
      </div>

      <div className="bg-secondary/40 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-foreground">Current Session</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          You are currently signed in from this device. Last authentication: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Unknown"}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Activity</p>
        {mockHistory.map((entry, i) => (
          <div key={i} className={cn(
            "flex items-start gap-3 px-3 py-3 rounded-xl transition-colors",
            entry.current ? "bg-primary/5 border border-primary/20" : "bg-secondary/30 hover:bg-secondary/50"
          )}>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              entry.current ? "bg-primary/10" : "bg-secondary"
            )}>
              <entry.icon className={cn("w-4 h-4", entry.current ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{entry.device}</p>
                {entry.current && (
                  <span className="text-[9px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">CURRENT</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <MapPin className="w-3 h-3 text-muted-foreground/60" />
                <span className="text-[11px] text-muted-foreground">{entry.location}</span>
                <span className="text-muted-foreground/30">·</span>
                <Clock className="w-3 h-3 text-muted-foreground/60" />
                <span className="text-[11px] text-muted-foreground">{entry.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Security Tip</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          If you notice unfamiliar devices or locations, change your password immediately. You can sign out of all other sessions from the security settings below.
        </p>
      </div>

      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
        <Lock className="w-4 h-4 mr-2" /> Sign Out All Other Sessions
      </Button>
    </div>
  );
}

// ─── Share Settings Section ───
function ShareSettingsSection() {
  const [accessType, setAccessType] = useState("public");
  const [defaultExpiry, setDefaultExpiry] = useState("never");
  const [requirePassword, setRequirePassword] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [showViewCount, setShowViewCount] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Share Defaults</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Configure default settings for new share links. These preferences are applied automatically when you create a new share, but can be overridden per-file.
        </p>
      </div>

      {/* Default Access Type */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Default Access Type</Label>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Choose whether new share links are public (accessible by anyone with the link) or private (restricted to invited users only).
          </p>
        </div>
        <Select value={accessType} onValueChange={setAccessType}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                <span>Public — Anyone with link</span>
              </div>
            </SelectItem>
            <SelectItem value="private">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                <span>Private — Invited only</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Default Expiry */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Default Expiry Duration</Label>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Automatically expire share links after a set period. Expired links become inaccessible to recipients.
          </p>
        </div>
        <Select value={defaultExpiry} onValueChange={setDefaultExpiry}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never expire</SelectItem>
            <SelectItem value="1d">1 day</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Password Protection</Label>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              Require a password to access shared files. When enabled, you'll be prompted to set a password each time you create a share link.
            </p>
          </div>
          <Switch checked={requirePassword} onCheckedChange={setRequirePassword} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Allow Downloads</Label>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              Allow recipients to download shared files. When disabled, recipients can only preview files in the browser.
            </p>
          </div>
          <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Show View Count</Label>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              Display how many times a shared file has been viewed. Visible only to you as the file owner.
            </p>
          </div>
          <Switch checked={showViewCount} onCheckedChange={setShowViewCount} />
        </div>
      </div>
    </div>
  );
}

// ─── File Settings Section ───
function FileSettingsSection() {
  const { data: profile } = useProfile();
  const [autoRename, setAutoRename] = useState(true);
  const [filePreview, setFilePreview] = useState(true);
  const [autoTrashDays, setAutoTrashDays] = useState(String(profile?.auto_trash_days ?? 30));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">File Settings</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Customize how files are uploaded, previewed, and managed. These settings control default behavior across all your workspaces.
        </p>
      </div>

      {/* Auto Trash */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Auto-Delete Trash Period</Label>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Files moved to trash are automatically and permanently deleted after this period. Once deleted, files cannot be recovered.
          </p>
        </div>
        <Select value={autoTrashDays} onValueChange={setAutoTrashDays}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
            <SelectItem value="30">30 days (default)</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Auto-Rename Duplicates</Label>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              Automatically add a number suffix (e.g., "photo (2).jpg") when uploading a file with a name that already exists in the same folder.
            </p>
          </div>
          <Switch checked={autoRename} onCheckedChange={setAutoRename} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">File Preview</Label>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              Show inline previews for images, videos, PDFs, and documents. Disabling this will show file icons instead, which may improve performance on slower connections.
            </p>
          </div>
          <Switch checked={filePreview} onCheckedChange={setFilePreview} />
        </div>
      </div>

      {/* Upload Info */}
      <div className="bg-secondary/40 rounded-xl p-4 space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Upload Defaults</p>
        {[
          { icon: Upload, label: "Max File Size", value: "100 MB", desc: "Maximum allowed size per individual file upload" },
          { icon: FolderOpen, label: "Default Folder", value: "Root", desc: "New uploads go to the root folder by default" },
          { icon: FileText, label: "Supported Types", value: "All", desc: "All file types accepted — images, docs, videos, archives" },
          { icon: Copy, label: "Version History", value: "Enabled", desc: "Previous versions are kept when uploading replacements" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <item.icon className="w-4 h-4 text-muted-foreground/60 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-medium text-foreground">{item.value}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Privacy Section ───
function PrivacySection() {
  const { settings, updateSettings } = useUserSettings();

  const save = (updates: Record<string, any>) => {
    updateSettings(updates).catch(() => toast.error("Failed to save"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Privacy & Security</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Control your privacy preferences and data sharing settings. Your files are always encrypted at rest and in transit.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Usage Analytics</Label>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              Help improve YoCloud by sharing anonymous usage data. No personal files or content is ever collected — only interaction patterns.
            </p>
          </div>
          <Switch checked={settings.analytics_enabled} onCheckedChange={(v) => save({ analytics_enabled: v })} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium text-foreground">Activity Visibility</Label>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              Allow workspace members to see your recent activity (uploads, edits, shares). When disabled, your activity is hidden from other members.
            </p>
          </div>
          <Switch checked={settings.activity_visible} onCheckedChange={(v) => save({ activity_visible: v })} />
        </div>
      </div>

      <div className="bg-secondary/40 rounded-xl p-4 space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Security Features</p>
        {[
          { label: "Encryption", value: "AES-256", desc: "All files encrypted at rest using industry-standard encryption" },
          { label: "Transfer Security", value: "TLS 1.3", desc: "Secure HTTPS connections for all data transfers" },
          { label: "Password Hash", value: "PBKDF2-SHA256", desc: "Share passwords securely hashed with salt" },
          { label: "Session Management", value: "JWT", desc: "Secure token-based authentication with auto-refresh" },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-[10px] font-mono font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{item.value}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-4">
        <p className="text-sm font-medium text-destructive mb-1">Danger Zone</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
          Permanently delete your account and all associated data. This action cannot be undone. All files, shares, workspaces, and settings will be lost forever.
        </p>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
          Delete Account
        </Button>
      </div>
    </div>
  );
}

// ─── Community Section ───
function CommunitySection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Community & Social</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Connect with the YoCloud community across platforms. Get help, share feedback, and stay updated.
        </p>
      </div>

      <div className="space-y-3">
        {[
          {
            name: "Discord",
            desc: "Join our Discord server for real-time help, feature requests, bug reports, and community discussions.",
            url: "https://discord.gg/8jz3pUaebk",
            color: "#5865F2",
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#5865F2]">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
              </svg>
            ),
          },
          {
            name: "Facebook",
            desc: "Follow our Facebook page for announcements, tips, community highlights, and product updates.",
            url: "https://facebook.com/yocloud",
            color: "#1877F2",
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#1877F2]">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            ),
          },
          {
            name: "Instagram",
            desc: "Follow us on Instagram for visual updates, behind-the-scenes content, stories, and product showcases.",
            url: "https://instagram.com/yocloud",
            color: "#E4405F",
            icon: (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#E4405F]">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            ),
          },
        ].map((social) => (
          <button
            key={social.name}
            onClick={() => window.open(social.url, "_blank")}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/30 transition-all text-left"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${social.color}15` }}>
              {social.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{social.name}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{social.desc}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground/40 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Desktop Settings Dialog ───
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeSection, setActiveSection] = useState("account");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-56 shrink-0 border-r border-border/60 bg-muted/30 p-4 flex flex-col">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-display font-bold">Settings</DialogTitle>
              <p className="text-[11px] text-muted-foreground">Manage your preferences</p>
            </DialogHeader>

            <nav className="space-y-1 flex-1">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <section.icon className={cn("w-4 h-4 mt-0.5 shrink-0", activeSection === section.id ? "text-primary" : "")} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-[10px] opacity-70 leading-snug">{section.desc}</p>
                  </div>
                </button>
              ))}
            </nav>

            <p className="text-[10px] text-muted-foreground/40 mt-4">YoCloud v1.0.0</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeSection === "account" && <AccountSection />}
                {activeSection === "appearance" && <AppearanceSection />}
                {activeSection === "login-history" && <LoginHistorySection />}
                {activeSection === "share" && <ShareSettingsSection />}
                {activeSection === "files" && <FileSettingsSection />}
                {activeSection === "privacy" && <PrivacySection />}
                {activeSection === "community" && <CommunitySection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mobile Settings Page Content (used in /settings route) ───
export function MobileSettingsContent() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (activeSection) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection(null)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
            <span className="font-display font-bold text-lg text-foreground">
              {SECTIONS.find((s) => s.id === activeSection)?.label}
            </span>
          </div>
        </div>
        <div className="p-4">
          {activeSection === "account" && <AccountSection />}
          {activeSection === "appearance" && <AppearanceSection />}
          {activeSection === "login-history" && <LoginHistorySection />}
          {activeSection === "share" && <ShareSettingsSection />}
          {activeSection === "files" && <FileSettingsSection />}
          {activeSection === "privacy" && <PrivacySection />}
          {activeSection === "community" && <CommunitySection />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground mb-1">Settings</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Configure your account, sharing preferences, file behavior, and privacy settings.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border/50">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
              <section.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{section.label}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{section.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-2.5 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
