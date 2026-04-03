import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock, Loader2, Copy, ExternalLink,
  AlertTriangle, Clock, User, ShieldCheck, X, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileTypeIcon } from "@/components/FileTypeIcon";
import { supabase } from "@/integrations/supabase/client";
import { verifySharePassword, type FileShare } from "@/hooks/useShares";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ScannedFile = {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  is_folder: boolean;
  cloudinary_url?: string | null;
};

type OwnerInfo = {
  display_name: string | null;
  email: string | null;
};

interface ScanResultDrawerProps {
  open: boolean;
  onClose: () => void;
  scannedData: string | null;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

export function ScanResultDrawer({ open, onClose, scannedData }: ScanResultDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "password" | "ready" | "error" | "expired">("loading");
  const [share, setShare] = useState<FileShare | null>(null);
  const [file, setFile] = useState<ScannedFile | null>(null);
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [folderContents, setFolderContents] = useState<ScannedFile[]>([]);
  const [folderCount, setFolderCount] = useState(0);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copying, setCopying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open || !scannedData) return;
    setState("loading");
    setPasswordInput("");
    setPasswordError(false);
    resolveShare(scannedData);
  }, [open, scannedData]);

  const resolveShare = async (data: string) => {
    try {
      let tokenOrCode = data;
      try {
        const url = new URL(data);
        const parts = url.pathname.split("/");
        const shareIdx = parts.indexOf("share");
        if (shareIdx >= 0 && parts[shareIdx + 1]) {
          tokenOrCode = parts[shareIdx + 1];
        }
      } catch { /* Not a URL */ }

      let { data: shareData } = await supabase
        .from("file_shares").select("*").eq("token", tokenOrCode).maybeSingle();
      if (!shareData) {
        const res = await supabase.from("file_shares").select("*").eq("custom_slug", tokenOrCode).maybeSingle();
        shareData = res.data;
      }
      if (!shareData) {
        const res = await supabase.from("file_shares").select("*").eq("share_code", tokenOrCode.toUpperCase()).maybeSingle();
        shareData = res.data;
      }

      if (!shareData) { setErrorMessage("Share link not found or invalid QR code"); setState("error"); return; }

      const s = shareData as unknown as FileShare;
      if (s.expires_at && new Date(s.expires_at) < new Date()) { setState("expired"); return; }
      if (s.download_limit && s.download_count >= s.download_limit) { setErrorMessage("Download limit reached"); setState("error"); return; }

      setShare(s);
      if (s.password_hash) { setState("password"); return; }
      await loadFileAndOwner(s);
    } catch {
      setErrorMessage("Failed to process QR code");
      setState("error");
    }
  };

  const loadFileAndOwner = async (s: FileShare) => {
    const { data: fileData } = await supabase.from("files")
      .select("id, name, mime_type, size, is_folder, cloudinary_url").eq("id", s.file_id).single();
    if (!fileData) { setErrorMessage("File not found"); setState("error"); return; }

    setFile(fileData as ScannedFile);
    const { data: ownerData } = await supabase.from("profiles").select("display_name, email").eq("id", s.user_id).single();
    if (ownerData) setOwner(ownerData);

    if (fileData.is_folder) {
      const { data: contents } = await supabase.from("files")
        .select("id, name, mime_type, size, is_folder, cloudinary_url")
        .eq("parent_id", fileData.id).eq("is_trashed", false)
        .order("is_folder", { ascending: false }).order("name").limit(10);
      setFolderContents((contents as ScannedFile[]) ?? []);
      const { count } = await supabase.from("files")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", fileData.id).eq("is_trashed", false);
      setFolderCount(count ?? 0);
    }
    setState("ready");
  };

  const handlePasswordSubmit = async () => {
    if (!share) return;
    setVerifying(true);
    setPasswordError(false);
    const valid = await verifySharePassword(share.id, passwordInput);
    if (valid) { await loadFileAndOwner(share); }
    else { setPasswordError(true); }
    setVerifying(false);
  };

  const handleCopyToDrive = async () => {
    if (!user) { toast.error("Please sign in to copy files"); return; }
    if (!file || !share) return;
    setCopying(true);
    try {
      if (file.is_folder) {
        await copyFolderRecursive(file.id, null, user.id);
      } else {
        await supabase.from("files").insert({
          name: file.name, mime_type: file.mime_type, size: file.size,
          is_folder: false, user_id: user.id,
          storage_path: `copied/${user.id}/${file.name}`,
          cloudinary_url: file.cloudinary_url,
        });
      }
      toast.success("Copied to your drive!");
      onClose();
    } catch { toast.error("Failed to copy"); }
    finally { setCopying(false); }
  };

  const copyFolderRecursive = async (folderId: string, parentId: string | null, userId: string) => {
    const { data: source } = await supabase.from("files").select("*").eq("id", folderId).single();
    if (!source) return;
    const { data: newFolder } = await supabase.from("files").insert({
      name: source.name, is_folder: true, user_id: userId, parent_id: parentId,
      storage_path: `copied/${userId}/${source.name}`,
    }).select("id").single();
    if (!newFolder) return;
    const { data: children } = await supabase.from("files").select("*").eq("parent_id", folderId).eq("is_trashed", false);
    for (const child of children ?? []) {
      if (child.is_folder) { await copyFolderRecursive(child.id, newFolder.id, userId); }
      else {
        await supabase.from("files").insert({
          name: child.name, mime_type: child.mime_type, size: child.size,
          is_folder: false, user_id: userId, parent_id: newFolder.id,
          storage_path: `copied/${userId}/${child.name}`,
          cloudinary_url: child.cloudinary_url,
        });
      }
    }
  };

  const handleOpenSharePage = () => {
    if (!share) return;
    navigate(`/share/${share.custom_slug || share.token}`);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 350 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
          className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-card rounded-t-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
            <h3 className="text-sm font-semibold text-foreground">Scan Result</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="px-4 pb-6 overflow-y-auto max-h-[70vh]">
            {/* Loading */}
            {state === "loading" && (
              <div className="flex flex-col items-center py-10 gap-3">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Verifying share link...</p>
              </div>
            )}

            {/* Error */}
            {state === "error" && (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-sm font-medium text-foreground">Invalid QR Code</p>
                <p className="text-xs text-muted-foreground text-center max-w-[240px]">{errorMessage}</p>
                <Button variant="outline" size="sm" onClick={onClose} className="mt-1">Close</Button>
              </div>
            )}

            {/* Expired */}
            {state === "expired" && (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-foreground">Link Expired</p>
                <p className="text-xs text-muted-foreground">This share link has expired</p>
                <Button variant="outline" size="sm" onClick={onClose} className="mt-1">Close</Button>
              </div>
            )}

            {/* Password */}
            {state === "password" && (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Password Protected</p>
                  <p className="text-xs text-muted-foreground mt-1">Enter password to access</p>
                </div>
                <div className="w-full max-w-xs space-y-2.5">
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                    className={cn("h-10", passwordError && "border-destructive")}
                  />
                  {passwordError && <p className="text-xs text-destructive text-center">Wrong password</p>}
                  <Button className="w-full h-10" onClick={handlePasswordSubmit} disabled={!passwordInput || verifying}>
                    {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    {verifying ? "Verifying..." : "Unlock"}
                  </Button>
                </div>
              </div>
            )}

            {/* Ready */}
            {state === "ready" && file && (
              <div className="space-y-3 pt-3">
                {/* File info */}
                <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                    <FileTypeIcon name={file.name} mime={file.mime_type} isFolder={file.is_folder} size={36} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {file.is_folder ? `${folderCount} items` : formatSize(file.size)}
                      </span>
                      {share?.permission && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          share.permission === "editor" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                        )}>
                          {share.permission === "editor" ? "Can edit" : "View only"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Owner */}
                {owner && (
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {owner.display_name || owner.email?.split("@")[0] || "Unknown"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Shared by</p>
                    </div>
                  </div>
                )}

                {/* Folder contents */}
                {file.is_folder && folderContents.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground px-1">Contents</p>
                    <div className="space-y-0.5 max-h-36 overflow-y-auto rounded-xl border border-border/40">
                      {folderContents.map((item) => (
                        <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/30 transition-colors">
                          <div className="w-7 h-7 flex items-center justify-center shrink-0">
                            <FileTypeIcon name={item.name} mime={item.mime_type} isFolder={item.is_folder} size={24} />
                          </div>
                          <span className="text-xs text-foreground truncate flex-1">{item.name}</span>
                          {!item.is_folder && (
                            <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(item.size)}</span>
                          )}
                        </div>
                      ))}
                      {folderCount > folderContents.length && (
                        <p className="text-[10px] text-muted-foreground text-center py-1.5">
                          +{folderCount - folderContents.length} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Image preview */}
                {!file.is_folder && file.mime_type?.startsWith("image/") && file.cloudinary_url && (
                  <div className="rounded-xl overflow-hidden bg-secondary/30 border border-border/40">
                    <img src={file.cloudinary_url} alt={file.name} className="w-full max-h-44 object-contain" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  {user && (
                    <Button className="flex-1 h-10" onClick={handleCopyToDrive} disabled={copying}>
                      {copying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copying ? "Copying..." : "Copy to Drive"}
                    </Button>
                  )}
                  <Button variant={user ? "outline" : "default"} className="flex-1 h-10" onClick={handleOpenSharePage}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Page
                  </Button>
                </div>

                {/* Sign in prompt */}
                {!user && (
                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    Sign in to copy files to your drive
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
