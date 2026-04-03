import { useState, useEffect, useMemo } from "react";
import { Link2, Copy, Check, Trash2, Eye, Shield, Clock, Lock, Users, BarChart3, QrCode, Download, Mail, Send, X, Hash, Smartphone, Monitor, Tablet, Globe, RotateCw, UserX, CheckCircle2, Pencil, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useFileShares, useCreateShare, useDeleteShare, useUpdateShare,
  useShareAccessLog, useShareInvites, useSendShareInvite, getShareUrl,
  type FileShare,
} from "@/hooks/useShares";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import type { FileItem } from "./RecentFiles";

interface ShareDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Password strength calculator
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score += 20;
  if (pw.length >= 10) score += 20;
  if (/[A-Z]/.test(pw)) score += 15;
  if (/[a-z]/.test(pw)) score += 15;
  if (/[0-9]/.test(pw)) score += 15;
  if (/[^A-Za-z0-9]/.test(pw)) score += 15;
  if (score <= 30) return { score, label: "Weak", color: "bg-destructive" };
  if (score <= 55) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 80) return { score, label: "Good", color: "bg-yellow-500" };
  return { score, label: "Strong", color: "bg-emerald-500" };
}

export function ShareDialog({ file, open, onOpenChange }: ShareDialogProps) {
  const { data: shares, isLoading } = useFileShares(file?.id ?? null);
  const createShare = useCreateShare();
  const deleteShare = useDeleteShare();
  const updateShare = useUpdateShare();
  const sendInvite = useSendShareInvite();

  const [accessType, setAccessType] = useState<"public" | "private">("public");
  const [permission, setPermission] = useState<"viewer" | "editor">("viewer");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [expiryOption, setExpiryOption] = useState<string>("none");
  const [downloadLimit, setDownloadLimit] = useState<string>("");
  const [customSlug, setCustomSlug] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [editingShare, setEditingShare] = useState<FileShare | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Edit form state
  const [editExpiry, setEditExpiry] = useState<string>("none");
  const [editDlLimit, setEditDlLimit] = useState<string>("");
  const [editSlug, setEditSlug] = useState("");
  const [editAccessType, setEditAccessType] = useState<"public" | "private">("public");
  const [editPermission, setEditPermission] = useState<"viewer" | "editor">("viewer");

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = !usePassword || !confirmPassword || password === confirmPassword;

  useEffect(() => {
    if (!open) {
      setPassword(""); setConfirmPassword(""); setUsePassword(false);
      setExpiryOption("none"); setShowAnalytics(null); setShowQR(null);
      setDownloadLimit(""); setCustomSlug(""); setEmailInput("");
      setInviteEmails([]); setEditingShare(null); setDeleteConfirmId(null);
    }
  }, [open]);

  const openEditDialog = (share: FileShare) => {
    setEditingShare(share);
    setEditAccessType(share.access_type as "public" | "private");
    setEditPermission(share.permission as "viewer" | "editor");
    setEditDlLimit(share.download_limit?.toString() ?? "");
    setEditSlug(share.custom_slug ?? "");
    setEditExpiry("none"); // Can't reverse-compute, but can set new
  };

  const handleSaveEdit = () => {
    if (!editingShare || !file) return;
    let newExpiresAt: string | null | undefined = undefined;
    if (editExpiry === "1h") newExpiresAt = new Date(Date.now() + 3600000).toISOString();
    else if (editExpiry === "1d") newExpiresAt = new Date(Date.now() + 86400000).toISOString();
    else if (editExpiry === "7d") newExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    else if (editExpiry === "30d") newExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    else if (editExpiry === "remove") newExpiresAt = null;

    const updates: any = {
      id: editingShare.id,
      fileId: file.id,
      access_type: editAccessType,
      permission: editPermission,
      download_limit: editDlLimit ? parseInt(editDlLimit) : null,
      custom_slug: editSlug.trim() || null,
    };
    if (newExpiresAt !== undefined) updates.expires_at = newExpiresAt;

    updateShare.mutate(updates, {
      onSuccess: () => { toast.success("Share updated"); setEditingShare(null); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleCreate = () => {
    if (!file) return;
    if (usePassword && password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    let expiresAt: string | null = null;
    if (expiryOption === "1h") expiresAt = new Date(Date.now() + 3600000).toISOString();
    else if (expiryOption === "1d") expiresAt = new Date(Date.now() + 86400000).toISOString();
    else if (expiryOption === "7d") expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    else if (expiryOption === "30d") expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

    createShare.mutate({
      fileId: file.id, accessType, permission,
      password: usePassword ? password : undefined,
      expiresAt,
      downloadLimit: downloadLimit ? parseInt(downloadLimit) : null,
      customSlug: customSlug.trim() || null,
    });
  };

  const handleCopy = (token: string, slug?: string | null) => {
    navigator.clipboard.writeText(getShareUrl(token, slug));
    setCopied(token);
    toast.success("Link copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !inviteEmails.includes(email)) {
      setInviteEmails((prev) => [...prev, email]);
      setEmailInput("");
    }
  };

  const handleSendInvites = (share: any) => {
    if (inviteEmails.length === 0) return;
    sendInvite.mutate({
      emails: inviteEmails,
      shareId: share.id,
      shareUrl: getShareUrl(share.token, share.custom_slug),
      fileName: file?.name || "File",
    });
    setInviteEmails([]);
  };

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Share "${file?.name ?? ""}"`}
        icon={<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Link2 className="w-6 h-6 text-primary" /></div>}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : shares && shares.length > 0 ? (
            <div className="space-y-3">
              {shares.map((share) => {
                const expired = share.expires_at && new Date(share.expires_at) < new Date();
                const dlReached = share.download_limit && share.download_count !== null && share.download_count >= share.download_limit;
                const shareCode = (share as any).share_code;
                return (
                  <motion.div
                    key={share.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-xl p-3 space-y-3 ${expired || dlReached ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/30"}`}
                  >
                    {/* Status warning banner */}
                    {(expired || dlReached) && (
                      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${expired ? "bg-destructive/10 text-destructive" : "bg-orange-500/10 text-orange-600"}`}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {expired ? "This link has expired" : "Download limit reached"}
                      </div>
                    )}

                    {/* Share code - prominent display */}
                    {shareCode && (
                      <div className="flex items-center justify-between bg-secondary/60 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-primary" />
                          <span className="text-base font-bold font-mono tracking-[0.25em] text-foreground">
                            {shareCode}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => {
                            navigator.clipboard.writeText(shareCode);
                            toast.success("Share code copied!");
                          }}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* Link row */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {getShareUrl(share.token, share.custom_slug)}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                        onClick={() => handleCopy(share.token, share.custom_slug)}>
                        {copied === share.token ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${share.access_type === "public" ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"}`}>
                        {share.access_type === "public" ? <Eye className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                        {share.access_type}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary">
                        <Users className="w-3 h-3" />{share.permission}
                      </span>
                      {share.password_hash && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-yellow-500/10 text-yellow-600">
                          <Lock className="w-3 h-3" /> password
                        </span>
                      )}
                      {share.expires_at && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${expired ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                          <Clock className="w-3 h-3" />
                          {expired ? "expired" : `expires ${formatDate(share.expires_at)}`}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">
                        <BarChart3 className="w-3 h-3" /> {share.view_count} views
                      </span>
                      {share.download_limit && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${dlReached ? "bg-destructive/10 text-destructive" : "bg-blue-500/10 text-blue-600"}`}>
                          <Download className="w-3 h-3" /> {share.download_count}/{share.download_limit}
                          {dlReached ? " (limit)" : " downloads"}
                        </span>
                      )}
                      {share.custom_slug && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-600">
                          <Hash className="w-3 h-3" /> /{share.custom_slug}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button variant="ghost" size="sm" className="text-xs h-7"
                        onClick={() => setShowQR(showQR === share.id ? null : share.id)}>
                        <QrCode className="w-3 h-3 mr-1" /> QR
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7"
                        onClick={() => setShowAnalytics(showAnalytics === share.id ? null : share.id)}>
                        <BarChart3 className="w-3 h-3 mr-1" /> Analytics
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7"
                        onClick={() => openEditDialog(share)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(share.id)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    </div>

                    {/* QR Code Panel */}
                    <AnimatePresence>
                      {showQR === share.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden flex flex-col items-center gap-3 py-3"
                        >
                          <div className="bg-white p-4 rounded-xl" id={`qr-${share.id}`}>
                            <QRCodeSVG
                              value={getShareUrl(share.token, share.custom_slug)}
                              size={180}
                              level="H"
                              includeMargin
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">Scan QR or enter share code to access</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const svgEl = document.querySelector(`#qr-${share.id} svg`);
                              if (!svgEl) return;
                              const svgData = new XMLSerializer().serializeToString(svgEl);
                              const canvas = document.createElement("canvas");
                              canvas.width = 240; canvas.height = 240;
                              const ctx = canvas.getContext("2d");
                              const img = new Image();
                              img.onload = () => {
                                ctx?.drawImage(img, 0, 0, 240, 240);
                                const a = document.createElement("a");
                                a.download = `share-qr-${shareCode || share.token.slice(0, 8)}.png`;
                                a.href = canvas.toDataURL("image/png");
                                a.click();
                              };
                              img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                            }}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> Download QR
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email Invite Section */}
                    <div className="border-t border-border pt-2 space-y-2">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Invite by email
                      </p>
                      <div className="flex gap-1.5">
                        <Input
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                          placeholder="email@example.com"
                          className="h-8 text-xs flex-1"
                        />
                        <Button size="sm" variant="outline" className="h-8 px-2" onClick={addEmail}>
                          Add
                        </Button>
                      </div>
                      {inviteEmails.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {inviteEmails.map((em) => (
                            <span key={em} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px]">
                              {em}
                              <button onClick={() => setInviteEmails((p) => p.filter((e) => e !== em))}>
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {inviteEmails.length > 0 && (
                        <Button size="sm" className="w-full h-8 text-xs" onClick={() => handleSendInvites(share)}
                          disabled={sendInvite.isPending}>
                          <Send className="w-3 h-3 mr-1" />
                          {sendInvite.isPending ? "Sending..." : `Send to ${inviteEmails.length} email(s)`}
                        </Button>
                      )}
                    </div>

                    {/* Analytics panel */}
                    <AnimatePresence>
                      {showAnalytics === share.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <ShareAnalytics shareId={share.id} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              <div className="border-t border-border pt-3">
                <Button variant="outline" className="w-full" onClick={handleCreate} disabled={createShare.isPending}>
                  <Link2 className="w-4 h-4 mr-2" /> Create another link
                </Button>
              </div>
            </div>
          ) : (
            /* Create new share form */
            <div className="space-y-4">
              {/* Access type */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {accessType === "public" ? <Eye className="w-4 h-4 text-muted-foreground" /> : <Shield className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground">Access</span>
                </div>
                <Select value={accessType} onValueChange={(v) => setAccessType(v as any)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Permission */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Permission</span>
                </div>
                <Select value={permission} onValueChange={(v) => setPermission(v as any)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">View only</SelectItem>
                    <SelectItem value="editor">Can edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Expires</span>
                </div>
                <Select value={expiryOption} onValueChange={setExpiryOption}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Never</SelectItem>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="1d">1 day</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Download limit */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Download limit</span>
                </div>
                <Input
                  type="number" min="0" placeholder="Unlimited"
                  value={downloadLimit}
                  onChange={(e) => setDownloadLimit(e.target.value)}
                  className="w-28 h-8 text-xs"
                />
              </div>

              {/* Custom slug */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Custom link</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground shrink-0">/share/</span>
                  <Input
                    placeholder="my-custom-link"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                    className="h-8 text-xs flex-1"
                  />
                </div>
              </div>

              {/* Password with strength indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Password</span>
                  </div>
                  <Switch checked={usePassword} onCheckedChange={setUsePassword} />
                </div>
                <AnimatePresence>
                  {usePassword && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-9"
                      />
                      {password && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${passwordStrength.color}`} style={{ width: `${passwordStrength.score}%` }} />
                            </div>
                            <span className={`text-[10px] font-medium ${passwordStrength.score <= 30 ? "text-destructive" : passwordStrength.score <= 55 ? "text-orange-500" : passwordStrength.score <= 80 ? "text-yellow-600" : "text-emerald-500"}`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                        </div>
                      )}
                      <Input
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`h-9 ${confirmPassword && !passwordsMatch ? "border-destructive" : ""}`}
                      />
                      {confirmPassword && !passwordsMatch && (
                        <p className="text-[10px] text-destructive">Passwords don't match</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button className="w-full" onClick={handleCreate}
                disabled={createShare.isPending || (usePassword && (!password || !passwordsMatch))}>
                <Link2 className="w-4 h-4 mr-2" />
                {createShare.isPending ? "Creating..." : "Generate share link"}
              </Button>
            </div>
          )}
        </div>
      </ResponsiveDialog>

      {/* Edit Share Dialog */}
      <AlertDialog open={!!editingShare} onOpenChange={(o) => !o && setEditingShare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Share Link</AlertDialogTitle>
            <AlertDialogDescription>Update share settings. Changes apply immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Access</span>
              <Select value={editAccessType} onValueChange={(v) => setEditAccessType(v as any)}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Permission</span>
              <Select value={editPermission} onValueChange={(v) => setEditPermission(v as any)}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">View only</SelectItem>
                  <SelectItem value="editor">Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">New expiry</span>
              <Select value={editExpiry} onValueChange={setEditExpiry}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keep current</SelectItem>
                  <SelectItem value="remove">Remove expiry</SelectItem>
                  <SelectItem value="1h">1 hour from now</SelectItem>
                  <SelectItem value="1d">1 day from now</SelectItem>
                  <SelectItem value="7d">7 days from now</SelectItem>
                  <SelectItem value="30d">30 days from now</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Download limit</span>
              <Input type="number" min="0" placeholder="Unlimited" value={editDlLimit}
                onChange={(e) => setEditDlLimit(e.target.value)} className="w-28 h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <span className="text-sm text-foreground">Custom slug</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">/share/</span>
                <Input value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                  placeholder="custom-link" className="h-8 text-xs flex-1" />
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveEdit} disabled={updateShare.isPending}>
              {updateShare.isPending ? "Saving..." : "Save Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove share link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the share link and revoke access for everyone who has it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId && file) {
                  deleteShare.mutate({ id: deleteConfirmId, fileId: file.id });
                  setDeleteConfirmId(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ShareAnalytics({ shareId }: { shareId: string }) {
  const { data: logs, isLoading } = useShareAccessLog(shareId);
  const { data: invites } = useShareInvites(shareId);

  if (isLoading) return <div className="py-2 text-xs text-muted-foreground">Loading...</div>;

  const deviceStats = { desktop: 0, mobile: 0, tablet: 0 };
  const referrerMap: Record<string, number> = {};

  (logs ?? []).forEach((log) => {
    const dt = (log.device_type || "desktop") as keyof typeof deviceStats;
    if (dt in deviceStats) deviceStats[dt]++;
    const ref = log.referrer || "Direct";
    referrerMap[ref] = (referrerMap[ref] || 0) + 1;
  });

  const totalVisits = logs?.length ?? 0;
  const topReferrers = Object.entries(referrerMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-3 pt-2">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full h-7">
          <TabsTrigger value="overview" className="text-[10px] h-6 flex-1">Overview</TabsTrigger>
          <TabsTrigger value="devices" className="text-[10px] h-6 flex-1">Devices</TabsTrigger>
          <TabsTrigger value="log" className="text-[10px] h-6 flex-1">Log</TabsTrigger>
          {(invites ?? []).length > 0 && (
            <TabsTrigger value="invites" className="text-[10px] h-6 flex-1">Invites</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-2 space-y-2">
          {totalVisits === 0 ? (
            <div className="text-center py-4">
              <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No visits yet</p>
              <p className="text-[10px] text-muted-foreground/60">Share this link to start tracking analytics</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-foreground">{totalVisits}</p>
                  <p className="text-[9px] text-muted-foreground">Total visits</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-foreground">{deviceStats.mobile}</p>
                  <p className="text-[9px] text-muted-foreground">Mobile</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-foreground">{deviceStats.desktop}</p>
                  <p className="text-[9px] text-muted-foreground">Desktop</p>
                </div>
              </div>
              {topReferrers.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-foreground mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Top referrers
                  </p>
                  {topReferrers.map(([ref, count]) => (
                    <div key={ref} className="flex items-center justify-between text-[10px] text-muted-foreground py-0.5">
                      <span className="truncate max-w-[160px]">{ref}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="devices" className="mt-2">
          <div className="space-y-2">
            {[
              { icon: Monitor, label: "Desktop", count: deviceStats.desktop },
              { icon: Smartphone, label: "Mobile", count: deviceStats.mobile },
              { icon: Tablet, label: "Tablet", count: deviceStats.tablet },
            ].map(({ icon: Icon, label, count }) => {
              const pct = totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="log" className="mt-2">
          {!logs || logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No visits yet</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-[10px] text-muted-foreground py-1">
                  <span>{formatDate(log.accessed_at)}</span>
                  <div className="flex items-center gap-2">
                    {log.device_type && <span className="capitalize">{log.device_type}</span>}
                    <span className="truncate max-w-[80px]">{log.user_agent?.split(" ")[0] ?? "Unknown"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {(invites ?? []).length > 0 && (
          <TabsContent value="invites" className="mt-2">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(invites ?? []).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-[10px] py-1.5 px-2 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-foreground truncate max-w-[120px]">{inv.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${inv.accepted ? "bg-emerald-500/10 text-emerald-600" : "bg-yellow-500/10 text-yellow-600"}`}>
                      {inv.accepted ? <><CheckCircle2 className="w-2.5 h-2.5" /> Accepted</> : "Pending"}
                    </span>
                    {!inv.accepted && (
                      <button
                        onClick={async () => {
                          const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
                          if (!session) return;
                          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                          await fetch(`https://${projectId}.supabase.co/functions/v1/send-share-invite`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                            body: JSON.stringify({ emails: [inv.email], shareId, shareUrl: "", fileName: "File" }),
                          });
                          (await import("sonner")).toast.success(`Resent invite to ${inv.email}`);
                        }}
                        className="text-primary hover:text-primary/80"
                        title="Resend invite"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const { supabase } = await import("@/integrations/supabase/client");
                        await supabase.from("share_invites").delete().eq("id", inv.id);
                        (await import("sonner")).toast.success(`Revoked invite for ${inv.email}`);
                      }}
                      className="text-destructive hover:text-destructive/80"
                      title="Revoke invite"
                    >
                      <UserX className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
              <span>{(invites ?? []).filter(i => i.accepted).length}/{(invites ?? []).length} accepted</span>
              <span>{(invites ?? []).filter(i => !i.accepted).length} pending</span>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
