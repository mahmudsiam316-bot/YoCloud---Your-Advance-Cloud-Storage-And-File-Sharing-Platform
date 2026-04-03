import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Users, Settings, Mail, Crown, Shield, User, Trash2, UserPlus,
  Activity, HardDrive, Globe, Calendar, Layers, Database, BarChart3,
  Clock, FileIcon, FolderIcon, Image, Video, FileText, Zap, Copy, Check,
  UserMinus, ChevronRight, AlertTriangle, TrendingUp, PieChart,
  CreditCard, Receipt, DollarSign, Lock, FolderLock, Eye, Upload, Pencil,
  Link2, X, Palette, ChevronDown, LogOut, ArrowRightLeft, Camera,
  Search, Download, Bell, BellOff, Archive, Ban, RefreshCw, BarChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavbar } from "@/components/BottomNavbar";
import { useAuth } from "@/hooks/useAuth";
import {
  useWorkspaceContext, useWorkspaceMembers, useWorkspaceInvites,
  useInviteToWorkspace, useRemoveWorkspaceMember, useUpdateMemberRole, useDeleteWorkspace,
} from "@/hooks/useWorkspaces";
import { useFiles } from "@/hooks/useFiles";
import { useActivityLog } from "@/hooks/useFiles";
import { useMemberProfiles } from "@/hooks/useMemberProfiles";
import { useFolderPermissions, useSetFolderPermission } from "@/hooks/useFolderPermissions";
import { useWorkspaceInviteLinks, useCreateInviteLink, useDeactivateInviteLink } from "@/hooks/useWorkspaceLinks";
import { useWorkspaceMemberPermissions, useSetMemberPermission } from "@/hooks/useWorkspacePermissions";
import { useInitPayment } from "@/hooks/usePayment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { aestheticTooltipStyle, aestheticAxisTick, ChartGradient } from "@/components/ui/aesthetic-chart";

const WORKSPACE_COLORS = [
  { name: "Default", value: "default", class: "bg-primary" },
  { name: "Blue", value: "blue", class: "bg-blue-500" },
  { name: "Green", value: "green", class: "bg-emerald-500" },
  { name: "Purple", value: "purple", class: "bg-purple-500" },
  { name: "Orange", value: "orange", class: "bg-orange-500" },
  { name: "Rose", value: "rose", class: "bg-rose-500" },
  { name: "Cyan", value: "cyan", class: "bg-cyan-500" },
  { name: "Amber", value: "amber", class: "bg-amber-500" },
];

const roleIcon = { owner: Crown, admin: Shield, member: User };
const roleColor = { owner: "text-amber-500", admin: "text-blue-500", member: "text-muted-foreground" };

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

const WorkspaceSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { data: members = [] } = useWorkspaceMembers(currentWorkspace?.id ?? null);
  const { data: invites = [] } = useWorkspaceInvites(currentWorkspace?.id ?? null);
  const { data: allFiles = [] } = useFiles();
  const { data: activityLogs = [] } = useActivityLog();
  const memberUserIds = useMemo(() => members.map((m) => m.user_id), [members]);
  const { data: memberProfiles = [] } = useMemberProfiles(memberUserIds);
  const { data: folderPerms = [] } = useFolderPermissions(currentWorkspace?.id ?? null);
  const { data: inviteLinks = [] } = useWorkspaceInviteLinks(currentWorkspace?.id ?? null);
  const { data: memberPerms = [] } = useWorkspaceMemberPermissions(currentWorkspace?.id ?? null);
  const setFolderPerm = useSetFolderPermission();
  const setMemberPerm = useSetMemberPermission();
  const createInviteLink = useCreateInviteLink();
  const deactivateLink = useDeactivateInviteLink();
  const inviteMember = useInviteToWorkspace();
  const removeMember = useRemoveWorkspaceMember();
  const updateRole = useUpdateMemberRole();
  const deleteWorkspace = useDeleteWorkspace();

  const queryClient = useQueryClient();
  const initPayment = useInitPayment();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [permFolderId, setPermFolderId] = useState<string | null>(null);
  const [linkRole, setLinkRole] = useState<string>("member");
  const [linkExpiry, setLinkExpiry] = useState<string>("7");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [activeSection, setActiveSection] = useState("members");
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PER_PAGE = 20;

  // Confirmation dialog states
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [showDeleteWorkspace, setShowDeleteWorkspace] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // New feature states
  const [memberSearch, setMemberSearch] = useState("");
  const [wsNotifMuted, setWsNotifMuted] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Role change confirmation
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ memberId: string; userId: string; newRole: string } | null>(null);

  // Delete workspace double confirmation - type name
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  // Workspace editing states
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");

  // Billing history query
  const { data: billingHistory = [] } = useQuery({
    queryKey: ["workspace_billing", currentWorkspace?.owner_id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", currentWorkspace.owner_id)
        .eq("is_api_plan", false)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!currentWorkspace && currentWorkspace.type === "team",
  });

  const isOwner = currentWorkspace?.owner_id === user?.id;
  const myMembership = members.find((m) => m.user_id === user?.id);
  const isAdminOrOwner = myMembership?.role === "owner" || myMembership?.role === "admin";

  const profileMap = useMemo(() => {
    const map: Record<string, typeof memberProfiles[0]> = {};
    memberProfiles.forEach((p) => { map[p.id] = p; });
    return map;
  }, [memberProfiles]);

  const getProfileName = (userId: string, isMe: boolean) => {
    if (isMe) return "You";
    const p = profileMap[userId];
    return p?.display_name || p?.email || userId.slice(0, 8) + "...";
  };

  const getProfileInitials = (userId: string) => {
    const p = profileMap[userId];
    const name = p?.display_name || p?.email || "?";
    return name.slice(0, 2).toUpperCase();
  };

  const getLastActive = (userId: string) => {
    const p = profileMap[userId];
    if (!p?.last_active_at) return "Unknown";
    return timeAgo(p.last_active_at);
  };

  const wsFiles = useMemo(() => allFiles.filter((f: any) => f.workspace_id === currentWorkspace?.id), [allFiles, currentWorkspace?.id]);
  const wsStorage = useMemo(() => wsFiles.reduce((s, f: any) => s + (f.size || 0), 0), [wsFiles]);
  const storagePercent = currentWorkspace ? Math.min((wsStorage / currentWorkspace.storage_limit) * 100, 100) : 0;
  const fileCount = wsFiles.filter((f: any) => !f.is_folder).length;
  const folderCount = wsFiles.filter((f: any) => f.is_folder).length;

  // Per-member storage breakdown
  const memberStorage = useMemo(() => {
    const breakdown: Record<string, { bytes: number; fileCount: number }> = {};
    wsFiles.filter((f: any) => !f.is_folder).forEach((f: any) => {
      const uid = f.user_id;
      if (!breakdown[uid]) breakdown[uid] = { bytes: 0, fileCount: 0 };
      breakdown[uid].bytes += f.size || 0;
      breakdown[uid].fileCount++;
    });
    return breakdown;
  }, [wsFiles]);

  const categories = useMemo(() => {
    const cats = { images: { bytes: 0, count: 0 }, videos: { bytes: 0, count: 0 }, documents: { bytes: 0, count: 0 }, other: { bytes: 0, count: 0 } };
    wsFiles.filter((f: any) => !f.is_folder).forEach((f: any) => {
      const m = f.mime_type || "";
      if (m.startsWith("image/")) { cats.images.bytes += f.size || 0; cats.images.count++; }
      else if (m.startsWith("video/")) { cats.videos.bytes += f.size || 0; cats.videos.count++; }
      else if (m.includes("pdf") || m.includes("document") || m.includes("text/")) { cats.documents.bytes += f.size || 0; cats.documents.count++; }
      else { cats.other.bytes += f.size || 0; cats.other.count++; }
    });
    return cats;
  }, [wsFiles]);

  const pendingInvites = invites.filter((i) => i.status === "pending");

  // Activity chart data - aggregate by day
  const activityChartData = useMemo(() => {
    const dayMap: Record<string, number> = {};
    const now = Date.now();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = 0;
    }
    activityLogs.forEach((l: any) => {
      const key = new Date(l.created_at).toISOString().slice(0, 10);
      if (key in dayMap) dayMap[key]++;
    });
    return Object.entries(dayMap).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      actions: count,
    }));
  }, [activityLogs]);

  // Relative time for creation
  const createdRelative = useMemo(() => {
    if (!currentWorkspace?.created_at) return "";
    const diff = Date.now() - new Date(currentWorkspace.created_at).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "Today";
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
    if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
    return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? "s" : ""} ago`;
  }, [currentWorkspace?.created_at]);

  const handleInvite = () => {
    if (!inviteEmail.trim() || !currentWorkspace) return;
    inviteMember.mutate({
      workspaceId: currentWorkspace.id,
      email: inviteEmail,
      role: inviteRole,
      workspaceName: currentWorkspace.name,
    }, {
      onSuccess: () => setInviteEmail(""),
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Avatar must be under 2MB"); return; }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `workspace-avatars/${currentWorkspace.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("user-files").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("user-files").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
      const { error } = await supabase.from("workspaces").update({ avatar_url: avatarUrl } as any).eq("id", currentWorkspace.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace avatar updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTargetId || !currentWorkspace) return;
    try {
      // Update workspace owner
      const { error: wsErr } = await supabase.from("workspaces").update({ owner_id: transferTargetId } as any).eq("id", currentWorkspace.id);
      if (wsErr) throw wsErr;
      // Update roles
      const { error: r1 } = await supabase.from("workspace_members").update({ role: "member" } as any).eq("workspace_id", currentWorkspace.id).eq("user_id", user!.id);
      if (r1) throw r1;
      const { error: r2 } = await supabase.from("workspace_members").update({ role: "owner" } as any).eq("workspace_id", currentWorkspace.id).eq("user_id", transferTargetId);
      if (r2) throw r2;
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace_members"] });
      toast.success("Ownership transferred successfully");
      setShowTransferDialog(false);
      setTransferTargetId(null);
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspace || !myMembership) return;
    try {
      const { error } = await supabase.from("workspace_members").delete().eq("id", myMembership.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("You left the workspace");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to leave workspace");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase.from("workspace_invites").update({ status: "cancelled" } as any).eq("id", inviteId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["workspace_invites"] });
      toast.success("Invitation cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel invite");
    }
  };

  const handleResendInvite = async (invite: any) => {
    if (!currentWorkspace) return;
    try {
      // Cancel old invite and create new one
      await supabase.from("workspace_invites").update({ status: "cancelled" } as any).eq("id", invite.id);
      inviteMember.mutate({
        workspaceId: currentWorkspace.id,
        email: invite.email,
        role: invite.role,
        workspaceName: currentWorkspace.name,
      }, {
        onSuccess: () => toast.success(`Invite resent to ${invite.email}`),
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invite");
    }
  };

  const handleExportActivity = (format: "csv" | "json") => {
    const filtered = activityFilter === "all" ? activityLogs : activityLogs.filter((l: any) => l.user_id === activityFilter);
    if (filtered.length === 0) { toast.error("No activity to export"); return; }
    
    if (format === "json") {
      const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `activity-${currentWorkspace.name}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["Date", "User", "Action", "File"];
      const rows = filtered.map((l: any) => [
        new Date(l.created_at).toISOString(),
        profileMap[l.user_id]?.display_name || profileMap[l.user_id]?.email || l.user_id,
        l.action,
        l.file_name,
      ]);
      const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `activity-${currentWorkspace.name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Activity exported as ${format.toUpperCase()}`);
  };

  const handleArchiveWorkspace = async () => {
    if (!currentWorkspace) return;
    try {
      const { error } = await supabase.from("workspaces").update({ is_frozen: true, frozen_at: new Date().toISOString(), frozen_by: user!.id } as any).eq("id", currentWorkspace.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace archived successfully");
      setShowArchiveDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to archive");
    }
  };

  const MEMBER_LIMIT_FREE = 5;
  const canInviteMore = currentWorkspace.storage_plan !== "free" || members.length < MEMBER_LIMIT_FREE;

  // Filtered members by search
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m) => {
      const p = profileMap[m.user_id];
      return (p?.display_name?.toLowerCase().includes(q)) || (p?.email?.toLowerCase().includes(q)) || m.role.includes(q);
    });
  }, [members, memberSearch, profileMap]);

  if (!currentWorkspace) return null;

  const roleDescriptions = {
    owner: "Full control over workspace settings, billing, members, and all files. Can delete the workspace.",
    admin: "Can manage members, invite new people, upload and organize all files within the workspace.",
    member: "Can upload files, view content, and collaborate within the workspace's shared folders.",
  };


  const sidebarItems = [
    { id: "members", label: "Members", icon: Users, show: true },
    { id: "permissions", label: "Permissions", icon: Lock, show: currentWorkspace.type === "team" },
    { id: "folders", label: "Folder Access", icon: FolderLock, show: currentWorkspace.type === "team" },
    { id: "storage", label: "Storage", icon: HardDrive, show: true },
    { id: "activity", label: "Activity", icon: Activity, show: true },
    { id: "billing", label: "Billing", icon: CreditCard, show: currentWorkspace.type === "team" },
    { id: "settings", label: "Settings", icon: Settings, show: isOwner },
  ].filter(i => i.show);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-sm border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {/* Workspace Avatar */}
          <div className="relative shrink-0 group">
            <Avatar className="w-10 h-10">
              {currentWorkspace.avatar_url && <AvatarImage src={currentWorkspace.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {currentWorkspace.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwner && currentWorkspace.type === "team" && (
              <label className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-4 h-4 text-foreground" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{currentWorkspace.name}</h1>
            <p className="text-xs text-muted-foreground">
              {currentWorkspace.type === "personal" ? "Personal workspace" : "Team workspace"} · {members.length} member{members.length !== 1 ? "s" : ""} · {formatBytes(wsStorage)} used
            </p>
          </div>
          {/* Leave workspace button for non-owners */}
          {!isOwner && currentWorkspace.type === "team" && (
            <Button variant="outline" size="sm" className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowLeaveDialog(true)}>
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Leave
            </Button>
          )}
          <Badge variant="secondary" className="shrink-0 gap-1">
            {currentWorkspace.type === "team" ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {currentWorkspace.type === "team" ? "Team" : "Personal"}
          </Badge>
        </div>
      </header>

      {/* Mobile section picker - horizontal scroll */}
      <div className="md:hidden sticky top-[53px] z-20 bg-background border-b border-border/40 px-3 py-2 overflow-x-auto flex gap-1.5 scrollbar-none">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
              activeSection === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground"
            )}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row min-h-[calc(100vh-60px)]">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border/40 py-4 px-2 sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto">
          <nav className="space-y-0.5">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  activeSection === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 px-4 md:px-8 py-6">
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="sr-only">
            {sidebarItems.map(i => <TabsTrigger key={i.id} value={i.id}>{i.label}</TabsTrigger>)}
          </TabsList>

          {/* ===================== MEMBERS ===================== */}
          <TabsContent value="members" className="space-y-6">
            {/* Invite Section */}
            {isAdminOrOwner && currentWorkspace.type === "team" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-border/50">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" /> Invite New Members
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Send email invitations to add collaborators to this workspace. Invited users will receive a notification
                    and can accept to join with the assigned role. You can change their role or remove them at any time.
                  </p>
                </div>
                <div className="p-5 flex flex-col sm:flex-row gap-3">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1"
                    type="email"
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  />
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                    <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleInvite} disabled={inviteMember.isPending || !inviteEmail.trim() || !canInviteMore} className="shrink-0">
                    <Mail className="w-4 h-4 mr-1.5" />
                    {inviteMember.isPending ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
                {!canInviteMore && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <Ban className="w-3.5 h-3.5" />
                      Free plan allows maximum {MEMBER_LIMIT_FREE} members. Upgrade your workspace plan to invite more.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Role Legend */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="border border-border rounded-2xl p-5"
            >
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Role Permissions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["owner", "admin", "member"] as const).map((role) => {
                  const Icon = roleIcon[role];
                  return (
                    <div key={role} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", roleColor[role])} />
                        <span className="text-sm font-medium text-foreground capitalize">{role}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{roleDescriptions[role]}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Members List */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between px-1 mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> Active Members — {members.length}
                </h3>
              </div>

              {/* Member Search */}
              {members.length > 4 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search members by name, email, or role..."
                    className="pl-10"
                  />
                </div>
              )}

              <div className="border border-border rounded-2xl divide-y divide-border/40 overflow-hidden">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-8 px-5">
                    <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No members found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term.</p>
                  </div>
                ) : filteredMembers.map((member) => {
                  const RoleIcon = roleIcon[member.role];
                  const isMe = member.user_id === user?.id;
                  const profile = profileMap[member.user_id];
                  return (
                    <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 hover:bg-secondary/20 transition-colors">
                      {/* Top row: avatar + name + role badge */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="w-9 h-9 sm:w-10 sm:h-10 shrink-0">
                          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getProfileInitials(member.user_id)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {getProfileName(member.user_id, isMe)}
                            </p>
                            <Badge variant="outline" className={cn("gap-0.5 shrink-0 text-[10px] px-1.5 py-0", roleColor[member.role])}>
                              <RoleIcon className="w-2.5 h-2.5" />
                              {member.role}
                            </Badge>
                          </div>
                          {profile?.email && !isMe && (
                            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5 hidden sm:block">
                            Joined {format(new Date(member.joined_at), "MMM d, yyyy")} · Active {getLastActive(member.user_id)}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 sm:hidden">
                            Active {getLastActive(member.user_id)}
                          </p>
                        </div>
                      </div>
                      {/* Action row - stacks below on mobile */}
                      {isAdminOrOwner && member.role !== "owner" && !isMe && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-12 sm:ml-0">
                          <Select
                            value={member.role}
                            onValueChange={(v) => setRoleChangeTarget({ memberId: member.id, userId: member.user_id, newRole: v })}
                          >
                            <SelectTrigger className="h-7 sm:h-8 text-[11px] sm:text-xs w-20 sm:w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                            onClick={() => setRemoveMemberId(member.id)}
                          >
                            <UserMinus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-between px-1 mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Pending Invitations — {pendingInvites.length}
                  </h3>
                </div>
                <div className="border border-border rounded-2xl divide-y divide-border/40 overflow-hidden">
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 px-5 py-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited {timeAgo(inv.created_at)} · Will join as {inv.role}
                          {inv.expires_at && ` · Expires ${format(new Date(inv.expires_at), "MMM d")}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 shrink-0">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </Badge>
                      {isAdminOrOwner && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => handleResendInvite(inv)}
                            title="Resend invitation"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleCancelInvite(inv.id)}
                            title="Cancel invitation"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* ===================== PERMISSIONS ===================== */}
          {currentWorkspace.type === "team" && (
            <TabsContent value="permissions" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-border/50">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" /> Granular Member Permissions
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Fine-tune what each team member can do in this workspace beyond their base role.
                    Owners and admins always have full access. These permissions apply to members with the "Member" role
                    and let you customize their capabilities — such as who can upload files, delete content,
                    share links, invite others, edit files, or manage folder structures.
                  </p>
                </div>

                {/* Permission Legend */}
                <div className="p-5 border-b border-border/30 bg-muted/10">
                  <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary" /> Permission Types
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { icon: Upload, label: "Upload", desc: "Can upload new files and folders to the workspace" },
                      { icon: Pencil, label: "Edit", desc: "Can rename, move, and modify existing files" },
                      { icon: Trash2, label: "Delete", desc: "Can permanently remove files and folders" },
                      { icon: Globe, label: "Share", desc: "Can create and manage share links for files" },
                      { icon: UserPlus, label: "Invite", desc: "Can invite new members to join the workspace" },
                      { icon: FolderLock, label: "Manage Folders", desc: "Can create, rename, and organize folder structures" },
                    ].map((p) => (
                      <div key={p.label} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <p.icon className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[11px] font-semibold text-foreground">{p.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-member permission toggles */}
                <div className="divide-y divide-border/30">
                  {members.filter(m => m.role !== "owner").length === 0 ? (
                    <div className="text-center py-12 px-5">
                      <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No team members yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Invite members to your workspace to configure their individual permissions.
                      </p>
                    </div>
                  ) : (
                    members.filter(m => m.role !== "owner").map((member) => {
                      const isMe = member.user_id === user?.id;
                      const profile = profileMap[member.user_id];
                      const existingPerm = memberPerms.find(p => p.user_id === member.user_id);
                      const perms = existingPerm || {
                        can_upload: true,
                        can_delete: false,
                        can_share: false,
                        can_invite: false,
                        can_edit: true,
                        can_manage_folders: false,
                      };

                      const isAdmin = member.role === "admin";

                      const togglePerm = (key: keyof typeof perms) => {
                        if (!isAdminOrOwner) return;
                        setMemberPerm.mutate({
                          workspace_id: currentWorkspace.id,
                          user_id: member.user_id,
                          can_upload: key === "can_upload" ? !perms.can_upload : perms.can_upload,
                          can_delete: key === "can_delete" ? !perms.can_delete : perms.can_delete,
                          can_share: key === "can_share" ? !perms.can_share : perms.can_share,
                          can_invite: key === "can_invite" ? !perms.can_invite : perms.can_invite,
                          can_edit: key === "can_edit" ? !perms.can_edit : perms.can_edit,
                          can_manage_folders: key === "can_manage_folders" ? !perms.can_manage_folders : perms.can_manage_folders,
                        });
                      };

                      const PERM_ITEMS = [
                        { key: "can_upload" as const, icon: Upload, label: "Upload" },
                        { key: "can_edit" as const, icon: Pencil, label: "Edit" },
                        { key: "can_delete" as const, icon: Trash2, label: "Delete" },
                        { key: "can_share" as const, icon: Globe, label: "Share" },
                        { key: "can_invite" as const, icon: UserPlus, label: "Invite" },
                        { key: "can_manage_folders" as const, icon: FolderLock, label: "Folders" },
                      ];

                      return (
                        <div key={member.id} className="px-5 py-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="w-9 h-9 shrink-0">
                              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                                {getProfileInitials(member.user_id)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {getProfileName(member.user_id, isMe)}
                                {profile?.email && !isMe && (
                                  <span className="text-xs text-muted-foreground ml-1.5">({profile.email})</span>
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {isAdmin
                                  ? "Admin — has full access by default. Custom permissions serve as overrides if demoted."
                                  : "Member — permissions below control what this user can do."}
                              </p>
                            </div>
                            <Badge variant="outline" className={cn("shrink-0 gap-1 text-[10px]", roleColor[member.role])}>
                              {React.createElement(roleIcon[member.role], { className: "w-3 h-3" })}
                              {member.role}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                            {PERM_ITEMS.map((p) => {
                              const enabled = isAdmin ? true : (perms as any)[p.key];
                              return (
                                <div
                                  key={p.key}
                                  className={cn(
                                    "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-colors",
                                    enabled ? "bg-primary/5 border border-primary/20" : "bg-secondary/30 border border-transparent"
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p.icon className={cn("w-3.5 h-3.5 shrink-0", enabled ? "text-primary" : "text-muted-foreground")} />
                                    <span className="text-[11px] font-medium text-foreground truncate">{p.label}</span>
                                  </div>
                                  <Switch
                                    checked={enabled}
                                    onCheckedChange={() => togglePerm(p.key)}
                                    disabled={!isAdminOrOwner || isAdmin || setMemberPerm.isPending}
                                    className="scale-[0.65]"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>

              {/* Quick Presets */}
              {isAdminOrOwner && members.filter(m => m.role === "member").length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="border border-border rounded-2xl p-5"
                >
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> Quick Permission Presets
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Apply a preset to all members at once. You can still customize individual permissions afterward.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        name: "View Only",
                        desc: "Members can only browse and preview files. No uploads, edits, or sharing.",
                        perms: { can_upload: false, can_delete: false, can_share: false, can_invite: false, can_edit: false, can_manage_folders: false },
                      },
                      {
                        name: "Contributor",
                        desc: "Members can upload and edit files but cannot delete, share, or invite.",
                        perms: { can_upload: true, can_delete: false, can_share: false, can_invite: false, can_edit: true, can_manage_folders: false },
                      },
                      {
                        name: "Full Access",
                        desc: "Members have all permissions except role management (admin-only).",
                        perms: { can_upload: true, can_delete: true, can_share: true, can_invite: true, can_edit: true, can_manage_folders: true },
                      },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          const membersList = members.filter(m => m.role === "member");
                          membersList.forEach(m => {
                            setMemberPerm.mutate({
                              workspace_id: currentWorkspace.id,
                              user_id: m.user_id,
                              ...preset.perms,
                            });
                          });
                          toast.success(`Applied "${preset.name}" preset to all members`);
                        }}
                        className="border border-border rounded-xl p-4 text-left hover:bg-secondary/30 transition-colors space-y-1.5"
                      >
                        <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </TabsContent>
          )}

          {/* ===================== SHARED FOLDERS ===================== */}
          {currentWorkspace.type === "team" && (
            <TabsContent value="folders" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-border/50">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <FolderLock className="w-5 h-5 text-primary" /> Shared Folder Permissions
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Set granular access controls for each folder in this workspace. Assign custom permissions per member —
                    control who can view, upload, edit, or delete files within specific folders. Owners and admins always
                    retain full access regardless of folder-level settings.
                  </p>
                </div>

                <div className="p-5">
                  {/* Permission Legend */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { icon: Eye, label: "View Only", desc: "Can browse and preview files but cannot make changes" },
                      { icon: Upload, label: "Upload Only", desc: "Can add new files but cannot modify or remove existing ones" },
                      { icon: Pencil, label: "Can Edit", desc: "Can rename, move, and modify files within the folder" },
                      { icon: Trash2, label: "Can Delete", desc: "Can permanently remove files and subfolders" },
                    ].map((perm) => (
                      <div key={perm.label} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <perm.icon className="w-4 h-4 text-primary" />
                          <span className="text-xs font-semibold text-foreground">{perm.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{perm.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Folder selection */}
                  {(() => {
                    const wsFolders = wsFiles.filter((f: any) => f.is_folder);
                    if (wsFolders.length === 0) return (
                      <div className="text-center py-12">
                        <FolderIcon className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No folders yet</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Create folders in your workspace to configure permissions.</p>
                      </div>
                    );

                    return (
                      <div className="space-y-4">
                        <Select value={permFolderId ?? ""} onValueChange={(v) => setPermFolderId(v || null)}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select a folder to manage permissions" /></SelectTrigger>
                          <SelectContent>
                            {wsFolders.map((f: any) => (
                              <SelectItem key={f.id} value={f.id}>
                                <span className="flex items-center gap-2">
                                  <FolderIcon className="w-3.5 h-3.5 text-primary" />
                                  {f.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!permFolderId && (
                          <div className="text-center py-8 border border-dashed border-border rounded-xl">
                            <FolderLock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm font-medium text-muted-foreground">Select a folder above</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Choose a folder from the dropdown to view and configure member-level access permissions.</p>
                          </div>
                        )}

                        {permFolderId && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border border-border rounded-xl divide-y divide-border/40 overflow-hidden"
                          >
                            {members.filter((m) => m.role !== "owner").map((member) => {
                              const isMe = member.user_id === user?.id;
                              const existing = folderPerms.find(
                                (p) => p.folder_id === permFolderId && p.user_id === member.user_id
                              );
                              const perms = existing || { can_view: true, can_upload: false, can_edit: false, can_delete: false };

                              const togglePerm = (key: "can_view" | "can_upload" | "can_edit" | "can_delete") => {
                                if (!isAdminOrOwner) return;
                                setFolderPerm.mutate({
                                  workspace_id: currentWorkspace.id,
                                  folder_id: permFolderId,
                                  user_id: member.user_id,
                                  can_view: key === "can_view" ? !perms.can_view : perms.can_view,
                                  can_upload: key === "can_upload" ? !perms.can_upload : perms.can_upload,
                                  can_edit: key === "can_edit" ? !perms.can_edit : perms.can_edit,
                                  can_delete: key === "can_delete" ? !perms.can_delete : perms.can_delete,
                                });
                              };

                              const profile = profileMap[member.user_id];

                              return (
                                <div key={member.id} className="px-4 py-3.5">
                                  <div className="flex items-center gap-3 mb-3">
                                    <Avatar className="w-8 h-8 shrink-0">
                                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                                        {getProfileInitials(member.user_id)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {getProfileName(member.user_id, isMe)}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
                                    </div>
                                    {member.role === "admin" && (
                                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Full access</Badge>
                                    )}
                                  </div>
                                  {member.role === "member" && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {([
                                        { key: "can_view" as const, icon: Eye, label: "View" },
                                        { key: "can_upload" as const, icon: Upload, label: "Upload" },
                                        { key: "can_edit" as const, icon: Pencil, label: "Edit" },
                                        { key: "can_delete" as const, icon: Trash2, label: "Delete" },
                                      ]).map((p) => (
                                        <div key={p.key} className="flex items-center justify-between gap-2 bg-secondary/30 rounded-lg px-3 py-2">
                                          <div className="flex items-center gap-1.5">
                                            <p.icon className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs text-foreground">{p.label}</span>
                                          </div>
                                          <Switch
                                            checked={perms[p.key]}
                                            onCheckedChange={() => togglePerm(p.key)}
                                            disabled={!isAdminOrOwner || setFolderPerm.isPending}
                                            className="scale-75"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </TabsContent>
          )}

          <TabsContent value="storage" className="space-y-6">
            {/* Storage Warning Banner */}
            {storagePercent >= 80 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl p-4 flex items-start gap-3 border",
                  storagePercent >= 95
                    ? "bg-destructive/10 border-destructive/30"
                    : "bg-amber-500/10 border-amber-500/30"
                )}
              >
                <AlertTriangle className={cn("w-5 h-5 mt-0.5 shrink-0", storagePercent >= 95 ? "text-destructive" : "text-amber-500")} />
                <div>
                  <p className={cn("text-sm font-semibold", storagePercent >= 95 ? "text-destructive" : "text-amber-600 dark:text-amber-400")}>
                    {storagePercent >= 95 ? "⚠️ Critical: Storage almost full!" : "⚠️ Storage running low"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {storagePercent >= 95
                      ? `You've used ${storagePercent.toFixed(1)}% of your storage. Uploads may fail soon. Upgrade your plan or delete unused files immediately.`
                      : `You've used ${storagePercent.toFixed(1)}% of your ${formatBytes(currentWorkspace.storage_limit)} allocation. Consider upgrading before you run out.`}
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveSection("billing")}>
                    <Zap className="w-3.5 h-3.5 mr-1.5" /> Upgrade Storage
                  </Button>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border/50">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" /> Storage Usage
                </h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This workspace is using <span className="font-semibold text-foreground">{formatBytes(wsStorage)}</span> out
                  of <span className="font-semibold text-foreground">{formatBytes(currentWorkspace.storage_limit)}</span> total capacity.
                  {storagePercent > 80
                    ? " Storage is running low — consider upgrading the workspace plan for additional capacity."
                    : ` That's ${storagePercent.toFixed(1)}% of the total allocation, leaving ${formatBytes(currentWorkspace.storage_limit - wsStorage)} available.`}
                </p>
              </div>
              <div className="p-5">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Used</p>
                    <span className="text-3xl font-bold text-foreground">{formatBytes(wsStorage)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Total</p>
                    <span className="text-lg font-semibold text-muted-foreground">{formatBytes(currentWorkspace.storage_limit)}</span>
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

                {/* Category breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Images", icon: Image, color: "text-chart-1", bg: "bg-chart-1", bytes: categories.images.bytes, count: categories.images.count },
                    { label: "Videos", icon: Video, color: "text-chart-2", bg: "bg-chart-2", bytes: categories.videos.bytes, count: categories.videos.count },
                    { label: "Documents", icon: FileText, color: "text-chart-3", bg: "bg-chart-3", bytes: categories.documents.bytes, count: categories.documents.count },
                    { label: "Other", icon: FileIcon, color: "text-muted-foreground", bg: "bg-muted-foreground", bytes: categories.other.bytes, count: categories.other.count },
                  ].map((cat) => {
                    const pct = wsStorage > 0 ? ((cat.bytes / wsStorage) * 100).toFixed(1) : "0";
                    return (
                      <div key={cat.label} className="bg-secondary/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <cat.icon className={cn("w-4 h-4", cat.color)} />
                          <span className="text-sm font-medium text-foreground">{cat.label}</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", cat.bg)} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{formatBytes(cat.bytes)}</span>
                          <span className="text-[10px] text-muted-foreground">{cat.count} file{cat.count !== 1 ? "s" : ""} · {pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="border border-border rounded-2xl p-5"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" /> Workspace Stats
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: FileIcon, label: "Total Files", value: `${fileCount}`, desc: `${fileCount} file${fileCount !== 1 ? "s" : ""} stored in this workspace` },
                  { icon: FolderIcon, label: "Folders", value: `${folderCount}`, desc: `${folderCount} folder${folderCount !== 1 ? "s" : ""} organizing your content` },
                  { icon: Users, label: "Members", value: `${members.length}`, desc: `${members.length} team member${members.length !== 1 ? "s" : ""} with access` },
                  { icon: Layers, label: "Plan", value: currentWorkspace.storage_plan.charAt(0).toUpperCase() + currentWorkspace.storage_plan.slice(1), desc: `${formatBytes(currentWorkspace.storage_limit)} total capacity` },
                ].map((stat) => (
                  <div key={stat.label} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{stat.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            {/* Storage Trend Chart (simulated from member data) */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border/50">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Storage by Member
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Compare how much storage each workspace member is consuming. This visualization helps identify the heaviest contributors and plan capacity upgrades.
                </p>
              </div>
              <div className="p-5">
                {(() => {
                  const chartData = members.map((m) => ({
                    name: profileMap[m.user_id]?.display_name || profileMap[m.user_id]?.email?.split("@")[0] || m.user_id.slice(0, 6),
                    storage: (memberStorage[m.user_id]?.bytes || 0) / (1024 * 1024),
                  })).filter(d => d.storage > 0);
                  if (chartData.length === 0) return (
                    <div className="text-center py-8">
                      <Database className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No storage data yet</p>
                    </div>
                  );
                  return (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                        <defs>
                          <ChartGradient id="storageGrad" color="hsl(var(--primary))" opacity={0.4} />
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                        <XAxis dataKey="name" tick={aestheticAxisTick} axisLine={false} tickLine={false} />
                        <YAxis tick={aestheticAxisTick} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `${v.toFixed(0)}MB`} />
                        <Tooltip contentStyle={aestheticTooltipStyle} formatter={(v: number) => [`${v.toFixed(1)} MB`, "Storage"]} />
                        <Area type="monotone" dataKey="storage" stroke="hsl(var(--primary))" fill="url(#storageGrad)" strokeWidth={2.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </motion.div>

            {/* Per-member Storage Breakdown */}
            {currentWorkspace.type === "team" && members.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-border/50">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Per-Member Contributions
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Breakdown of storage usage and file contributions by each member of this workspace.
                    This helps identify active contributors and manage resource allocation.
                  </p>
                </div>
                <div className="divide-y divide-border/30">
                  {members.map((member) => {
                    const ms = memberStorage[member.user_id] || { bytes: 0, fileCount: 0 };
                    const memberPct = wsStorage > 0 ? ((ms.bytes / wsStorage) * 100) : 0;
                    const isMe = member.user_id === user?.id;
                    const profile = profileMap[member.user_id];
                    return (
                      <div key={member.id} className="px-5 py-4 flex items-center gap-3">
                        <Avatar className="w-9 h-9 shrink-0">
                          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                            {getProfileInitials(member.user_id)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {getProfileName(member.user_id, isMe)}
                            <span className="text-xs text-muted-foreground ml-1.5">({member.role})</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${memberPct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">{memberPct.toFixed(1)}%</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatBytes(ms.bytes)} · {ms.fileCount} file{ms.fileCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* ===================== ACTIVITY TAB ===================== */}
          <TabsContent value="activity" className="space-y-4">
            {/* Activity Trend Chart */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-border rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border/50">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-primary" /> Activity Trend — Last 14 Days
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Visualize how active this workspace has been over the past two weeks. Each bar represents the total number of actions (uploads, edits, deletes, shares) performed on that day.
                </p>
              </div>
              <div className="p-5">
                {activityChartData.some(d => d.actions > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={activityChartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <defs>
                        <ChartGradient id="actGrad" color="hsl(var(--primary))" opacity={0.35} />
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                      <XAxis dataKey="date" tick={aestheticAxisTick} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={aestheticAxisTick} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={aestheticTooltipStyle} />
                      <Area type="monotone" dataKey="actions" stroke="hsl(var(--primary))" fill="url(#actGrad)" strokeWidth={2.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <BarChart className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No activity in the last 14 days</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Per-member activity filter */}
            {currentWorkspace.type === "team" && members.length > 1 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Filter by Member
                </h3>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Track individual contributions — see who uploaded, renamed, moved, or deleted files in this workspace.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActivityFilter("all")}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors", activityFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80")}
                  >All Members</button>
                  {members.map((m) => {
                    const isMe = m.user_id === user?.id;
                    return (
                      <button
                        key={m.user_id}
                        onClick={() => setActivityFilter(m.user_id)}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5", activityFilter === m.user_id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80")}
                      >
                        <Avatar className="w-4 h-4">
                          <AvatarFallback className="text-[7px] bg-primary/10 text-primary">{getProfileInitials(m.user_id)}</AvatarFallback>
                        </Avatar>
                        {getProfileName(m.user_id, isMe)}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="border border-border rounded-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" /> Workspace Activity
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {activityLogs.length > 0
                        ? `${activityLogs.length} tracked actions. Every upload, rename, move, share, and deletion is logged.`
                        : "No activity recorded yet. Actions will appear here automatically."}
                    </p>
                  </div>
                  {activityLogs.length > 0 && (
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleExportActivity("csv")} className="gap-1.5">
                        <Download className="w-3.5 h-3.5" /> CSV
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportActivity("json")} className="gap-1.5">
                        <Download className="w-3.5 h-3.5" /> JSON
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {(() => {
                const filtered = activityFilter === "all"
                  ? activityLogs
                  : activityLogs.filter((l: any) => l.user_id === activityFilter);
                
                if (filtered.length === 0) return (
                  <div className="text-center py-16 px-5">
                    <Clock className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No activity {activityFilter !== "all" ? "for this member" : "recorded"}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs mx-auto">
                      {activityFilter !== "all" ? "This member hasn't performed any tracked actions yet." : "Start uploading, sharing, or organizing files to see activity here."}
                    </p>
                  </div>
                );

                return (
                  <div className="divide-y divide-border/30">
                    <div className="max-h-[600px] overflow-y-auto divide-y divide-border/30">
                      {filtered.slice(0, activityPage * ACTIVITY_PER_PAGE).map((log: any) => {
                        const logProfile = profileMap[log.user_id];
                        return (
                          <div key={log.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                            <Avatar className="w-6 h-6 mt-0.5 shrink-0">
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {logProfile ? (logProfile.display_name || logProfile.email || "?").slice(0, 2).toUpperCase() : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">
                                <span className="font-medium text-foreground">
                                  {log.user_id === user?.id ? "You" : logProfile?.display_name || logProfile?.email || log.user_id.slice(0, 8)}
                                </span>
                                {" "}
                                <span className="text-muted-foreground">{log.action}</span>
                                {" "}
                                <span className="font-medium truncate">{log.file_name}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{timeAgo(log.created_at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filtered.length > activityPage * ACTIVITY_PER_PAGE && (
                      <div className="p-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActivityPage(p => p + 1)}
                          className="gap-1.5"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          Load More ({filtered.length - activityPage * ACTIVITY_PER_PAGE} remaining)
                        </Button>
                      </div>
                    )}
                    {filtered.length > 0 && (
                      <div className="px-5 py-2 text-[10px] text-muted-foreground text-center">
                        Showing {Math.min(filtered.length, activityPage * ACTIVITY_PER_PAGE)} of {filtered.length} activities
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          </TabsContent>

          {/* ===================== BILLING TAB ===================== */}
          {currentWorkspace.type === "team" && (
            <TabsContent value="billing" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-border/50">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" /> Team Billing
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Manage your workspace subscription and billing. The workspace owner is responsible for payments.
                    Billing is based on the number of active team members and the selected storage plan.
                  </p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                    {[
                      { icon: DollarSign, label: "Current Plan", value: currentWorkspace.storage_plan.charAt(0).toUpperCase() + currentWorkspace.storage_plan.slice(1), desc: "Your current workspace subscription tier" },
                      { icon: Users, label: "Active Seats", value: `${members.length}`, desc: `${members.length} member${members.length !== 1 ? "s" : ""} × pricing per seat` },
                      { icon: Database, label: "Storage Allocation", value: formatBytes(currentWorkspace.storage_limit), desc: `${formatBytes(currentWorkspace.storage_limit - wsStorage)} remaining capacity` },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{item.value}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Team Plans */}
                  <div className="border-t border-border/50 pt-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" /> Available Team Plans
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      Upgrade your workspace to unlock more storage, advanced collaboration features, and priority support.
                      Per-seat pricing means you only pay for active team members.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { name: "Team Starter", planId: "team-starter", price: "৳199", per: "/seat/month", storage: "10 GB", storagePlan: "starter", features: ["Up to 5 members", "10 GB shared storage", "Basic activity logs", "Email support"] },
                        { name: "Team Pro", planId: "team-pro", price: "৳499", per: "/seat/month", storage: "50 GB", storagePlan: "pro", features: ["Up to 25 members", "50 GB shared storage", "Advanced analytics", "Priority support", "Shared folders"], highlight: true },
                        { name: "Team Enterprise", planId: "team-enterprise", price: "৳999", per: "/seat/month", storage: "200 GB", storagePlan: "enterprise", features: ["Unlimited members", "200 GB shared storage", "Custom branding", "Dedicated support", "API access", "Audit logs"] },
                      ].map((plan) => {
                        const isCurrent = currentWorkspace.storage_plan === plan.storagePlan;
                        return (
                          <div key={plan.name} className={cn(
                            "border rounded-xl p-5 space-y-3 transition-colors",
                            isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary/20" : plan.highlight ? "border-primary/50 bg-primary/[0.02]" : "border-border"
                          )}>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                                {isCurrent && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{plan.storage} total storage</p>
                            </div>
                            <div>
                              <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                              <span className="text-xs text-muted-foreground">{plan.per}</span>
                            </div>
                            <ul className="space-y-1.5">
                              {plan.features.map((f) => (
                                <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                            {isOwner && (
                              <Button
                                variant={isCurrent ? "outline" : plan.highlight ? "default" : "outline"}
                                size="sm"
                                className="w-full"
                                disabled={isCurrent || initPayment.isPending}
                                onClick={async () => {
                                  try {
                                    const result = await initPayment.mutateAsync(plan.planId);
                                    if (result.payment_url) {
                                      window.location.href = result.payment_url;
                                    }
                                  } catch (err: any) {
                                    toast.error(err.message || "Payment initialization failed");
                                  }
                                }}
                              >
                                {isCurrent ? "Current Plan" : initPayment.isPending ? "Processing..." : plan.highlight ? "Upgrade Now" : "Select Plan"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Billing History */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-border/50">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" /> Billing History
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    View past transactions and payment records for this workspace.
                  </p>
                </div>
                {billingHistory.length === 0 ? (
                  <div className="text-center py-10 px-5">
                    <Receipt className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No billing history yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      When you upgrade to a paid plan, all invoices and payment records will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {billingHistory.map((tx: any) => (
                      <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", tx.status === "completed" ? "bg-emerald-500/10" : "bg-amber-500/10")}>
                          {tx.status === "completed" ? <Check className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{tx.plan} — ৳{tx.amount}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(tx.created_at), "MMM d, yyyy h:mm a")} · {tx.status}
                            {tx.transaction_id && ` · TXN: ${tx.transaction_id.slice(0, 12)}...`}
                          </p>
                        </div>
                        <Badge variant={tx.status === "completed" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                          {tx.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>
          )}

          {/* ===================== SETTINGS TAB ===================== */}
          {isOwner && (
            <TabsContent value="settings" className="space-y-6">
              {/* Invite Links */}
              {currentWorkspace.type === "team" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-border rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-primary" /> Shareable Invite Links
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Create reusable invite links that anyone with the link can use to join this workspace.
                      Set an expiry period and optional usage limits. Share via messaging apps, email, or social media.
                    </p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Select value={linkRole} onValueChange={setLinkRole}>
                        <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={linkExpiry} onValueChange={setLinkExpiry}>
                        <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Expires in 1 day</SelectItem>
                          <SelectItem value="7">Expires in 7 days</SelectItem>
                          <SelectItem value="30">Expires in 30 days</SelectItem>
                          <SelectItem value="0">Never expires</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => createInviteLink.mutate({
                          workspaceId: currentWorkspace.id,
                          role: linkRole,
                          expiresInDays: linkExpiry === "0" ? undefined : parseInt(linkExpiry),
                        })}
                        disabled={createInviteLink.isPending}
                        className="shrink-0"
                      >
                        <Link2 className="w-4 h-4 mr-1.5" />
                        {createInviteLink.isPending ? "Creating..." : "Create Link"}
                      </Button>
                    </div>

                    {inviteLinks.filter(l => l.is_active && !(l.expires_at && new Date(l.expires_at) < new Date())).length > 0 && (
                      <div className="border border-border/50 rounded-xl divide-y divide-border/30 overflow-hidden">
                        {inviteLinks.filter(l => l.is_active && !(l.expires_at && new Date(l.expires_at) < new Date())).map((link) => {
                          const url = `${window.location.origin}/join/${link.token}`;
                          const isExpired = false;
                          return (
                            <div key={link.id} className="px-4 py-3 flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono text-foreground truncate">{url}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Role: {link.role} · Used {link.use_count}×
                                  {link.expires_at && ` · ${isExpired ? "Expired" : `Expires ${format(new Date(link.expires_at), "MMM d")}`}`}
                                </p>
                              </div>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(url);
                                  setCopiedLinkId(link.id);
                                  toast.success("Link copied!");
                                  setTimeout(() => setCopiedLinkId(null), 2000);
                                }}
                              >
                                {copiedLinkId === link.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                onClick={() => deactivateLink.mutate(link.id)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Invite Link Usage Analytics */}
              {inviteLinks.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="border border-border rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" /> Invite Link Analytics
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Track how your invite links are performing — see how many people joined through each link, their assigned roles, and whether links are still active or have expired.
                    </p>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-4 mb-5">
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Links</p>
                        <p className="text-2xl font-bold text-foreground">{inviteLinks.length}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Joins</p>
                        <p className="text-2xl font-bold text-foreground">{inviteLinks.reduce((s, l) => s + l.use_count, 0)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Active Links</p>
                        <p className="text-2xl font-bold text-foreground">{inviteLinks.filter(l => l.is_active && !(l.expires_at && new Date(l.expires_at) < new Date())).length}</p>
                      </div>
                    </div>
                    <div className="border border-border/50 rounded-xl divide-y divide-border/30 overflow-hidden">
                      {inviteLinks.map((link) => {
                        const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                        const isActive = link.is_active && !isExpired;
                        return (
                          <div key={link.id} className="px-4 py-3 flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", isActive ? "bg-emerald-500/10" : "bg-muted")}>
                              <Link2 className={cn("w-4 h-4", isActive ? "text-emerald-500" : "text-muted-foreground")} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground font-mono truncate">...{link.token.slice(-8)}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Role: {link.role} · {link.use_count} join{link.use_count !== 1 ? "s" : ""}
                                {link.max_uses && ` / ${link.max_uses} max`}
                                {link.expires_at && ` · ${isExpired ? "Expired" : `Expires ${format(new Date(link.expires_at), "MMM d")}`}`}
                              </p>
                            </div>
                            <Badge variant={isActive ? "secondary" : "outline"} className={cn("text-[10px] shrink-0", isActive ? "text-emerald-600" : "text-muted-foreground")}>
                              {isActive ? "Active" : isExpired ? "Expired" : "Deactivated"}
                            </Badge>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-foreground">{link.use_count}</p>
                              <p className="text-[9px] text-muted-foreground">joins</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {currentWorkspace.type === "team" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="border border-border rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Palette className="w-5 h-5 text-primary" /> Workspace Branding
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Customize your workspace's appearance with a color theme. This helps team members quickly identify this workspace.
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium text-foreground mb-3">Color Theme</p>
                    <div className="flex flex-wrap gap-3">
                      {WORKSPACE_COLORS.map((c) => (
                        <button
                          key={c.value}
                          onClick={async () => {
                            const { error } = await supabase
                              .from("workspaces")
                              .update({ color_theme: c.value } as any)
                              .eq("id", currentWorkspace.id);
                            if (!error) {
                              queryClient.invalidateQueries({ queryKey: ["workspaces"] });
                              toast.success(`Theme set to ${c.name}`);
                            }
                          }}
                          className={cn(
                            "w-10 h-10 rounded-xl transition-all flex items-center justify-center",
                            c.class,
                            (currentWorkspace as any).color_theme === c.value && "ring-2 ring-offset-2 ring-foreground"
                          )}
                        >
                          {(currentWorkspace as any).color_theme === c.value && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Workspace Name & Description Edit */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="border border-border rounded-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-border/50">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" /> Workspace Configuration
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    View and manage the core settings for this workspace.
                  </p>
                </div>
                <div className="p-5 space-y-6">
                  {/* Editable Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Workspace Name</span>
                    </div>
                    {editingName ? (
                      <div className="flex gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditingName(false);
                            if (e.key === "Enter" && editName.trim()) {
                              supabase.from("workspaces").update({ name: editName.trim() } as any).eq("id", currentWorkspace.id).then(({ error }) => {
                                if (!error) {
                                  queryClient.invalidateQueries({ queryKey: ["workspaces"] });
                                  toast.success("Workspace renamed");
                                  setEditingName(false);
                                } else toast.error("Failed to rename");
                              });
                            }
                          }}
                        />
                        <Button size="sm" onClick={() => {
                          if (!editName.trim()) return;
                          supabase.from("workspaces").update({ name: editName.trim() } as any).eq("id", currentWorkspace.id).then(({ error }) => {
                            if (!error) {
                              queryClient.invalidateQueries({ queryKey: ["workspaces"] });
                              toast.success("Workspace renamed");
                              setEditingName(false);
                            } else toast.error("Failed to rename");
                          });
                        }}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-foreground">{currentWorkspace.name}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditName(currentWorkspace.name); setEditingName(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed">The display name visible to all members</p>
                  </div>

                  {/* Editable Description */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Description</span>
                    </div>
                    {editingDesc ? (
                      <div className="flex gap-2">
                        <Input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="What's this workspace for?"
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditingDesc(false);
                            if (e.key === "Enter") {
                              supabase.from("workspaces").update({ description: editDesc.trim() || null } as any).eq("id", currentWorkspace.id).then(({ error }) => {
                                if (!error) {
                                  queryClient.invalidateQueries({ queryKey: ["workspaces"] });
                                  toast.success("Description updated");
                                  setEditingDesc(false);
                                } else toast.error("Failed to update");
                              });
                            }
                          }}
                        />
                        <Button size="sm" onClick={() => {
                          supabase.from("workspaces").update({ description: editDesc.trim() || null } as any).eq("id", currentWorkspace.id).then(({ error }) => {
                            if (!error) {
                              queryClient.invalidateQueries({ queryKey: ["workspaces"] });
                              toast.success("Description updated");
                              setEditingDesc(false);
                            } else toast.error("Failed to update");
                          });
                        }}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-foreground">
                          {currentWorkspace.description || <span className="text-muted-foreground italic">No description</span>}
                        </p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditDesc(currentWorkspace.description || ""); setEditingDesc(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed">A brief description of this workspace's purpose</p>
                  </div>

                  {/* Read-only config items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { icon: Layers, label: "Type", value: currentWorkspace.type === "personal" ? "Personal" : "Team", desc: currentWorkspace.type === "personal" ? "Your private workspace for personal files" : "Shared workspace for team collaboration" },
                      { icon: Database, label: "Storage Plan", value: currentWorkspace.storage_plan.charAt(0).toUpperCase() + currentWorkspace.storage_plan.slice(1), desc: `${formatBytes(currentWorkspace.storage_limit)} total capacity allocated` },
                      { icon: HardDrive, label: "Storage Used", value: formatBytes(wsStorage), desc: `${storagePercent.toFixed(1)}% of capacity · ${formatBytes(currentWorkspace.storage_limit - wsStorage)} remaining` },
                      { icon: Calendar, label: "Created", value: createdRelative, desc: `${format(new Date(currentWorkspace.created_at), "MMM d, yyyy")} — workspace creation date` },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</span>
                        </div>
                        <p className="text-lg font-semibold text-foreground">{item.value}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Ownership Transfer */}
              {currentWorkspace.type === "team" && isOwner && members.filter(m => m.user_id !== user?.id).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="border border-border rounded-2xl overflow-hidden"
                >
                  <div className="p-5 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-primary" /> Transfer Ownership
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Transfer workspace ownership to another member. You'll become a regular member after transfer.
                      This action requires confirmation and cannot be easily reversed.
                    </p>
                  </div>
                  <div className="p-5 space-y-3">
                    <Select value={transferTargetId ?? ""} onValueChange={(v) => setTransferTargetId(v || null)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a member to transfer ownership" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.filter(m => m.user_id !== user?.id).map((m) => {
                          const profile = profileMap[m.user_id];
                          return (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              <span className="flex items-center gap-2">
                                <Crown className="w-3.5 h-3.5 text-amber-500" />
                                {profile?.display_name || profile?.email || m.user_id.slice(0, 8)}
                                <span className="text-muted-foreground">({m.role})</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!transferTargetId}
                      onClick={() => setShowTransferDialog(true)}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Transfer Ownership
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Notification Settings */}
              {currentWorkspace.type === "team" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="border border-border rounded-2xl overflow-hidden"
                >
                  <div className="p-5 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" /> Notification Preferences
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Manage notification settings for this workspace. Muting a workspace will stop all notifications from it — file uploads, member activity, and share alerts.
                    </p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", wsNotifMuted ? "bg-destructive/10" : "bg-emerald-500/10")}>
                          {wsNotifMuted ? <BellOff className="w-5 h-5 text-destructive" /> : <Bell className="w-5 h-5 text-emerald-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{wsNotifMuted ? "Notifications Muted" : "Notifications Active"}</p>
                          <p className="text-xs text-muted-foreground">
                            {wsNotifMuted ? "You won't receive any notifications from this workspace." : "You'll receive notifications for all workspace activity."}
                          </p>
                        </div>
                      </div>
                      <Switch checked={!wsNotifMuted} onCheckedChange={(v) => setWsNotifMuted(!v)} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Danger Zone */}
              {currentWorkspace.type === "team" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="border border-destructive/20 bg-destructive/5 rounded-2xl overflow-hidden"
                >
                  <div className="p-5 border-b border-destructive/10">
                    <h3 className="text-base font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Danger Zone
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      These actions are irreversible or have significant impact. Proceed with caution.
                    </p>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Archive */}
                    {isOwner && !(currentWorkspace as any).is_frozen && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Archive className="w-4 h-4 text-amber-500" /> Archive Workspace
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Freeze this workspace — all data stays intact but no uploads, edits, or new members are allowed. You can unfreeze from the admin panel later.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowArchiveDialog(true)}>
                          <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive
                        </Button>
                      </div>
                    )}
                    {(currentWorkspace as any).is_frozen && isOwner && (
                      <div className="flex items-center justify-between bg-amber-500/5 rounded-xl p-3">
                        <div>
                          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Archive className="w-4 h-4" /> Workspace is Archived
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">This workspace is frozen. Unfreeze it to resume normal operations.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={async () => {
                          const { error } = await supabase.from("workspaces").update({ is_frozen: false, frozen_at: null, frozen_by: null } as any).eq("id", currentWorkspace.id);
                          if (!error) { queryClient.invalidateQueries({ queryKey: ["workspaces"] }); toast.success("Workspace unfrozen"); }
                        }}>
                          Unfreeze
                        </Button>
                      </div>
                    )}

                    {/* Delete */}
                    {isOwner && (
                      <div className="flex items-center justify-between pt-2 border-t border-destructive/10">
                        <div>
                          <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                            <Trash2 className="w-4 h-4" /> Delete Workspace Permanently
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            All files, folders, members, and activity will be permanently deleted.
                          </p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => setShowDeleteWorkspace(true)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                        </Button>
                      </div>
                    )}

                    {/* Leave */}
                    {!isOwner && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                            <LogOut className="w-4 h-4" /> Leave This Workspace
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            You'll lose access to all files. Rejoin only by invitation.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowLeaveDialog(true)}>
                          <LogOut className="w-3.5 h-3.5 mr-1.5" /> Leave
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </TabsContent>
          )}
        </Tabs>
        </main>
      </div>

      <BottomNavbar activeItem="menu" onItemClick={() => {}} onUploadClick={() => {}} />

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!removeMemberId} onOpenChange={(open) => !open && setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the workspace? They will lose access to all files and folders in this workspace. This action can be undone by re-inviting them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeMemberId) {
                  removeMember.mutate({ memberId: removeMemberId });
                  setRemoveMemberId(null);
                }
              }}
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Workspace Confirmation Dialog — Double Confirm */}
      <AlertDialog open={showDeleteWorkspace} onOpenChange={(open) => { setShowDeleteWorkspace(open); if (!open) setDeleteConfirmName(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete Workspace Permanently
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This action <span className="font-semibold text-foreground">CANNOT</span> be undone. All files, folders, members, and activity logs associated with this workspace will be permanently deleted.
                </p>
                <p className="text-sm text-foreground font-medium">
                  Type <span className="font-bold text-destructive">"{currentWorkspace?.name}"</span> to confirm:
                </p>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={currentWorkspace?.name}
                  className="border-destructive/30 focus:ring-destructive/20"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmName !== currentWorkspace?.name}
              onClick={() => {
                deleteWorkspace.mutate({ workspaceId: currentWorkspace.id }, {
                  onSuccess: () => navigate("/"),
                });
                setShowDeleteWorkspace(false);
                setDeleteConfirmName("");
              }}
            >
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={!!roleChangeTarget} onOpenChange={(open) => !open && setRoleChangeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Confirm Role Change
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change{" "}
              <span className="font-semibold text-foreground">
                {roleChangeTarget ? (profileMap[roleChangeTarget.userId]?.display_name || profileMap[roleChangeTarget.userId]?.email || "this member") : ""}
              </span>'s role to{" "}
              <span className="font-semibold text-foreground capitalize">{roleChangeTarget?.newRole}</span>?
              {roleChangeTarget?.newRole === "admin" && " Admins can manage members, invite others, and access all files."}
              {roleChangeTarget?.newRole === "member" && " Members have limited permissions that you can customize."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (roleChangeTarget) {
                updateRole.mutate({ memberId: roleChangeTarget.memberId, role: roleChangeTarget.newRole as any });
                setRoleChangeTarget(null);
              }
            }}>
              Yes, Change Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <AlertDialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" /> Transfer Ownership
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to transfer ownership of <span className="font-semibold text-foreground">{currentWorkspace.name}</span> to{" "}
              <span className="font-semibold text-foreground">
                {transferTargetId ? (profileMap[transferTargetId]?.display_name || profileMap[transferTargetId]?.email || "selected member") : ""}
              </span>.
              You will become a regular member. This action cannot be easily reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransferOwnership}>
              Yes, Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Workspace Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-destructive" /> Leave Workspace
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave <span className="font-semibold text-foreground">{currentWorkspace.name}</span>?
              You will lose access to all files and folders in this workspace. You can only rejoin if someone invites you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLeaveWorkspace}
            >
              Yes, Leave Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Workspace Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-500" /> Archive Workspace
            </AlertDialogTitle>
            <AlertDialogDescription>
              Archiving <span className="font-semibold text-foreground">{currentWorkspace.name}</span> will freeze all operations.
              No one will be able to upload, edit, delete, or invite new members. All existing data will be preserved.
              You can unfreeze it later from the settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveWorkspace}>
              Yes, Archive Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkspaceSettings;
