import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Download, Lock, AlertTriangle, FolderIcon, ChevronRight,
  Loader2, ArrowDownToLine, Pencil, Check, X, Upload, MessageSquare,
  Send, Reply, Trash2, ChevronDown, ChevronUp, Eye, Shield, User,
  Copy, Save, Code2, ExternalLink, CheckCircle2,
  FileIcon as LucideFileIcon
} from "lucide-react";
import { FileTypeIcon } from "@/components/FileTypeIcon";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import JSZip from "jszip";
import { ZipProgressTracker, type ZipProgress, type ZipFileTask } from "@/components/ZipProgressTracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchShareByToken, verifySharePassword, incrementDownloadCount, type FileShare } from "@/hooks/useShares";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type SharedFileItem = {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  cloudinary_url?: string | null;
  cloudinary_public_id?: string | null;
  is_folder: boolean;
  parent_id?: string | null;
};

type OwnerInfo = {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type SharedComment = {
  id: string;
  content: string;
  user_email: string;
  user_id: string;
  created_at: string;
  parent_comment_id: string | null;
};

function detectCategory(mime: string, name: string): "image" | "pdf" | "text" | "video" | "audio" | "unknown" {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  const textExts = [".txt", ".md", ".json", ".js", ".ts", ".css", ".html", ".xml", ".csv", ".py", ".yaml", ".yml", ".sh", ".env", ".log", ".sql", ".toml", ".ini"];
  if (mime.startsWith("text/") || textExts.some((ext) => name.toLowerCase().endsWith(ext))) return "text";
  return "unknown";
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function getFileIcon(mime: string): string {
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime === "application/pdf") return "📕";
  if (mime.includes("document") || mime.includes("word")) return "📝";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "📊";
  return "📄";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getInitials(email: string): string {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

// ─── SHARED COMMENTS COMPONENT ───
function SharedComments({ fileId, isEditor, currentUser }: { fileId: string; isEditor: boolean; currentUser: any }) {
  const [comments, setComments] = useState<SharedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("file_comments")
      .select("*")
      .eq("file_id", fileId)
      .order("created_at", { ascending: true });
    setComments((data as SharedComment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [fileId]);

  const rootComments = useMemo(() => comments.filter(c => !c.parent_comment_id), [comments]);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_comment_id === parentId);

  const handleSubmit = async () => {
    if (!text.trim() || !currentUser) return;
    setSubmitting(true);
    const { error } = await supabase.from("file_comments").insert({
      file_id: fileId,
      content: text.trim(),
      user_id: currentUser.id,
      user_email: currentUser.email,
      parent_comment_id: replyTo,
    });
    if (!error) {
      setText("");
      setReplyTo(null);
      await fetchComments();
    } else {
      toast.error("Failed to post comment");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("file_comments").delete().eq("id", id);
    await fetchComments();
  };

  if (!currentUser) {
    return (
      <div className="border-t border-border px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
          Login to view and post comments
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Comments {comments.length > 0 && `(${comments.length})`}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {loading ? (
                <div className="py-4 text-center text-xs text-muted-foreground">Loading comments...</div>
              ) : rootComments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
              ) : (
                <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                  {rootComments.map((comment) => (
                    <div key={comment.id}>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {getInitials(comment.user_email)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-foreground">{comment.user_email.split("@")[0]}</span>
                            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
                          </div>
                          <p className="text-xs text-foreground/80 mt-0.5 break-words">{comment.content}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button onClick={() => setReplyTo(comment.id)} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
                              <Reply className="w-3 h-3" /> Reply
                            </button>
                            {currentUser.id === comment.user_id && (
                              <button onClick={() => handleDelete(comment.id)} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5">
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {getReplies(comment.id).length > 0 && (
                        <div className="ml-8 mt-2 space-y-2 border-l-2 border-border pl-3">
                          {getReplies(comment.id).map((reply) => (
                            <div key={reply.id} className="flex gap-2">
                              <div className="w-5 h-5 rounded-full bg-secondary text-muted-foreground text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {getInitials(reply.user_email)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-medium text-foreground">{reply.user_email.split("@")[0]}</span>
                                  <span className="text-[9px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                                </div>
                                <p className="text-[11px] text-foreground/80 mt-0.5 break-words">{reply.content}</p>
                                {currentUser.id === reply.user_id && (
                                  <button onClick={() => handleDelete(reply.id)} className="text-[9px] text-muted-foreground hover:text-destructive mt-0.5">Delete</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  {replyTo && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] text-primary">Replying to comment</span>
                      <button onClick={() => setReplyTo(null)} className="text-[10px] text-muted-foreground hover:text-destructive">✕</button>
                    </div>
                  )}
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                    placeholder="Add a comment..."
                    className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || submitting} className="h-9 w-9 p-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MAIN COMPONENT ───
export default function SharedFile() {
  const isMobile = useIsMobile();
  const { token, code } = useParams<{ token?: string; code?: string }>();
  const shareIdentifier = token || code;
  const [state, setState] = useState<"loading" | "password" | "ready" | "expired" | "not_found" | "no_access" | "download_limit_reached">("loading");
  const [share, setShare] = useState<FileShare | null>(null);
  const [file, setFile] = useState<SharedFileItem | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);

  // Editor state
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Inline text editing state
  const [textContent, setTextContent] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string | null>(null);
  const [savingText, setSavingText] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  // Copy to drive state
  const [copying, setCopying] = useState(false);

  // Folder navigation state
  const [folderContents, setFolderContents] = useState<SharedFileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [zipProgress, setZipProgress] = useState<ZipProgress>({
    visible: false,
    folderName: "",
    files: [],
    phase: "collecting",
  });
  const navigate = useNavigate();
  const isEditor = share?.permission === "editor";
  const isPrivate = share?.access_type === "private";

  // Check current user session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user ?? null);
    });
  }, []);

  // Load share data
  useEffect(() => {
    if (!shareIdentifier) { setState("not_found"); return; }
    (async () => {
      const result = await fetchShareByToken(shareIdentifier);
      if (result.status === "not_found") { setState("not_found"); return; }
      if (result.status === "expired") { setShare(result.share); setState("expired"); return; }
      if (result.status === "download_limit_reached") { setShare(result.share); setState("download_limit_reached"); return; }

      // status === "ok"
      if (result.share.password_hash) {
        setShare(result.share);
        setFile(result.file);
        setState("password");
        return;
      }
      setShare(result.share);
      setFile(result.file);

      // Check private access gate
      if (result.share.access_type === "private") {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setState("no_access"); return; }
        if (user.id !== result.share.user_id) {
          const { data: invite } = await supabase
            .from("share_invites")
            .select("id")
            .eq("share_id", result.share.id)
            .eq("email", user.email?.toLowerCase())
            .maybeSingle();
          if (!invite) { setState("no_access"); return; }
          await supabase
            .from("share_invites")
            .update({ accepted: true } as any)
            .eq("id", invite.id);
        }
      }

      loadOwnerInfo(result.share.user_id);

      if (result.file.is_folder) {
        setCurrentFolderId(result.file.id);
        setBreadcrumbs([{ id: result.file.id, name: result.file.name }]);
        await loadFolderContents(result.file.id);
      } else {
        await loadPreview(result.file);
      }
      setState("ready");
    })();
  }, [shareIdentifier]);

  const loadOwnerInfo = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, email, avatar_url")
      .eq("id", userId)
      .single();
    if (data) setOwnerInfo(data);
  };

  const loadPreview = async (f: SharedFileItem) => {
    let url: string | null = null;
    if (f.cloudinary_url) {
      url = f.cloudinary_url;
    } else {
      const { data } = await supabase.storage.from("user-files").createSignedUrl(f.storage_path, 600);
      url = data?.signedUrl ?? null;
    }
    if (url) {
      setSignedUrl(url);
      // Load text content for text files
      const cat = detectCategory(f.mime_type, f.name);
      if (cat === "text" && f.size < 500_000) {
        try {
          const res = await fetch(url);
          const txt = await res.text();
          setTextContent(txt);
          setEditedText(txt);
        } catch { /* ignore */ }
      }
    }
  };

  const loadFolderContents = async (folderId: string) => {
    setLoadingContents(true);
    const { data, error } = await supabase
      .from("files")
      .select("id, name, mime_type, size, storage_path, cloudinary_url, is_folder, parent_id")
      .eq("parent_id", folderId)
      .eq("is_trashed", false)
      .order("is_folder", { ascending: false })
      .order("name");
    if (!error && data) setFolderContents(data as SharedFileItem[]);
    setLoadingContents(false);
  };

  const navigateToFolder = async (folder: SharedFileItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    await loadFolderContents(folder.id);
  };

  const navigateToBreadcrumb = async (index: number) => {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    await loadFolderContents(target.id);
  };

  const [verifyingPassword, setVerifyingPassword] = useState(false);

  const handlePasswordSubmit = async () => {
    if (!share || !file) return;
    setVerifyingPassword(true);
    try {
      const valid = await verifySharePassword(share.id, passwordInput);
      if (valid) {
        if (share.access_type === "private") {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { setState("no_access"); setVerifyingPassword(false); return; }
          if (user.id !== share.user_id) {
            const { data: invite } = await supabase
              .from("share_invites")
              .select("id")
              .eq("share_id", share.id)
              .eq("email", user.email?.toLowerCase())
              .maybeSingle();
            if (!invite) { setState("no_access"); setVerifyingPassword(false); return; }
            await supabase.from("share_invites").update({ accepted: true } as any).eq("id", invite.id);
          }
        }

        loadOwnerInfo(share.user_id);

        if (file.is_folder) {
          setCurrentFolderId(file.id);
          setBreadcrumbs([{ id: file.id, name: file.name }]);
          await loadFolderContents(file.id);
        } else {
          await loadPreview(file);
        }
        setState("ready");
      } else {
        setPasswordError(true);
      }
    } finally {
      setVerifyingPassword(false);
    }
  };

  // Max file size for unauthorized downloads (50MB)
  const MAX_ANON_DOWNLOAD_SIZE = 50 * 1024 * 1024;

  const handleDownloadFile = async (f: SharedFileItem) => {
    if (share && share.download_limit && share.download_count !== null && share.download_count >= share.download_limit) {
      toast.error("Download limit reached for this share link");
      return;
    }
    // Size limit for unauthorized users
    if (!currentUser && f.size > MAX_ANON_DOWNLOAD_SIZE) {
      toast.error(`File too large for guest download. Please sign in to download files over ${formatSize(MAX_ANON_DOWNLOAD_SIZE)}.`);
      return;
    }
    try {
      let downloadUrl: string | null = null;
      if (f.cloudinary_url) {
        downloadUrl = f.cloudinary_url;
      } else {
        const { data } = await supabase.storage.from("user-files").createSignedUrl(f.storage_path, 300);
        downloadUrl = data?.signedUrl ?? null;
      }
      if (!downloadUrl) {
        toast.error("Could not generate download link");
        return;
      }
      // Force download with fetch+blob for proper filename
      const resp = await fetch(downloadUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloading ${f.name}`);
    } catch {
      toast.error("Download failed");
    }
    if (share) {
      await incrementDownloadCount(share.id, share.download_count);
      setShare({ ...share, download_count: share.download_count + 1 });
    }
  };

  const handleDownloadFolder = async () => {
    if (!file || !shareIdentifier) return;
    setZipping(true);

    // Show progress UI
    setZipProgress({
      visible: true,
      folderName: file.name,
      files: [],
      phase: "collecting",
    });

    try {
      // Step 1: Recursively collect all files and folder paths
      type CollectedZipFile = ZipFileTask & {
        storagePath: string;
        cloudinaryUrl?: string | null;
      };

      const allFiles: CollectedZipFile[] = [];
      const folderPaths = new Set<string>();

      const collectAllFiles = async (parentId: string, path: string) => {
        const { data: children } = await supabase
          .from("files")
          .select("id, name, mime_type, size, storage_path, cloudinary_url, is_folder")
          .eq("parent_id", parentId)
          .eq("is_trashed", false)
          .order("is_folder", { ascending: false })
          .order("name", { ascending: true });

        if (!children) return;

        for (const child of children) {
          const childPath = path ? `${path}/${child.name}` : child.name;

          if (child.is_folder) {
            folderPaths.add(childPath);
            await collectAllFiles(child.id, childPath);
          } else {
            allFiles.push({
              id: child.id,
              name: child.name,
              path: childPath,
              size: child.size || 0,
              storagePath: child.storage_path,
              cloudinaryUrl: child.cloudinary_url,
              status: "pending",
            });
          }
        }
      };
      await collectAllFiles(file.id, "");

      if (allFiles.length === 0) {
        toast.error("Folder is empty");
        setZipProgress(p => ({ ...p, visible: false }));
        setZipping(false);
        return;
      }

      // Step 2: Update progress to downloading phase
      setZipProgress(p => ({ ...p, files: [...allFiles], phase: "downloading" }));

      // Step 3: Create zip with folder structure
      const zip = new JSZip();
      const rootFolder = zip.folder(file.name) ?? zip;

      const ensureZipFolder = (relativePath: string) => {
        return relativePath
          .split("/")
          .filter(Boolean)
          .reduce((current, segment) => current.folder(segment) ?? current, rootFolder);
      };

      // Explicitly create all subfolder entries so empty folders are preserved too
      Array.from(folderPaths)
        .sort((a, b) => a.localeCompare(b))
        .forEach((folderPath) => {
          ensureZipFolder(folderPath);
        });

      for (let i = 0; i < allFiles.length; i++) {
        const f = allFiles[i];
        // Mark current as downloading
        setZipProgress(p => ({
          ...p,
          files: p.files.map((pf, idx) => idx === i ? { ...pf, status: "downloading" } : pf),
        }));

        try {
          let downloadUrl: string | null = null;
          if (f.cloudinaryUrl) {
            downloadUrl = f.cloudinaryUrl;
          } else if (f.storagePath) {
            const { data: signed } = await supabase.storage
              .from("user-files")
              .createSignedUrl(f.storagePath, 300);
            downloadUrl = signed?.signedUrl ?? null;
          }

          if (!downloadUrl) throw new Error("No URL");

          const resp = await fetch(downloadUrl);
          const blob = await resp.arrayBuffer();
          const pathParts = f.path.split("/").filter(Boolean);
          const fileName = pathParts.pop() || f.name;
          const parentFolder = ensureZipFolder(pathParts.join("/"));
          parentFolder.file(fileName, blob);

          // Mark done
          setZipProgress(p => ({
            ...p,
            files: p.files.map((pf, idx) => idx === i ? { ...pf, status: "done" } : pf),
          }));
        } catch {
          // Mark error, continue
          setZipProgress(p => ({
            ...p,
            files: p.files.map((pf, idx) => idx === i ? { ...pf, status: "error" } : pf),
          }));
        }
      }

      // Step 4: Generate zip
      setZipProgress(p => ({ ...p, phase: "zipping" }));
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Step 5: Download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setZipProgress(p => ({ ...p, phase: "done" }));
      toast.success("ZIP download complete!");
    } catch (err: any) {
      setZipProgress(p => ({ ...p, phase: "error", error: err.message || "Failed to create ZIP" }));
      toast.error(err.message || "Download failed");
    } finally {
      setZipping(false);
    }
  };

  // ─── EDITOR: Rename ───
  const handleRename = async () => {
    if (!file || !newName.trim() || newName.trim() === file.name) {
      setIsRenaming(false);
      return;
    }
    setRenaming(true);
    const { error } = await supabase
      .from("files")
      .update({ name: newName.trim() })
      .eq("id", file.id);
    if (!error) {
      setFile({ ...file, name: newName.trim() });
      toast.success("File renamed!");
    } else {
      toast.error("Failed to rename file");
    }
    setRenaming(false);
    setIsRenaming(false);
  };

  // ─── EDITOR: Upload new version ───
  const handleVersionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFile = e.target.files?.[0];
    if (!uploadFile || !file || !share || !currentUser) return;

    toast.loading("Uploading new version...", { id: "version-upload" });

    try {
      const { data: versions } = await supabase
        .from("file_versions")
        .select("version_number")
        .eq("file_id", file.id)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

      if (file.cloudinary_url) {
        await supabase.from("file_versions").insert({
          file_id: file.id,
          version_number: nextVersion,
          cloudinary_url: file.cloudinary_url,
          cloudinary_public_id: file.cloudinary_public_id ?? null,
          size: file.size,
          user_id: currentUser.id,
        });
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("folder", `cloudbox/${share.user_id}`);

      const { data: { session } } = await supabase.auth.getSession();
      const uploadResp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/cloudinary-upload`,
        {
          method: "POST",
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
          body: formData,
        }
      );

      if (!uploadResp.ok) throw new Error("Upload failed");
      const uploadResult = await uploadResp.json();

      await supabase
        .from("files")
        .update({
          cloudinary_url: uploadResult.secure_url || uploadResult.cloudinary_url || uploadResult.url,
          cloudinary_public_id: uploadResult.public_id || uploadResult.cloudinary_public_id,
          size: uploadFile.size,
          mime_type: uploadFile.type,
        })
        .eq("id", file.id);

      setFile({
        ...file,
        cloudinary_url: uploadResult.secure_url || uploadResult.cloudinary_url || uploadResult.url,
        size: uploadFile.size,
        mime_type: uploadFile.type,
      });
      setSignedUrl(uploadResult.secure_url || uploadResult.cloudinary_url || uploadResult.url);
      toast.success("New version uploaded!", { id: "version-upload" });
    } catch (err: any) {
      toast.error(err.message || "Upload failed", { id: "version-upload" });
    }
  };

  // ─── EDITOR: Save inline text edits ───
  const handleSaveText = async () => {
    if (!file || editedText === null || editedText === textContent) return;
    setSavingText(true);
    try {
      // Save current as version first
      const { data: versions } = await supabase
        .from("file_versions")
        .select("version_number")
        .eq("file_id", file.id)
        .order("version_number", { ascending: false })
        .limit(1);
      const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

      if (file.cloudinary_url) {
        await supabase.from("file_versions").insert({
          file_id: file.id,
          version_number: nextVersion,
          cloudinary_url: file.cloudinary_url,
          cloudinary_public_id: file.cloudinary_public_id ?? null,
          size: file.size,
          user_id: currentUser?.id ?? share?.user_id,
        });
      }

      // Upload edited text to Cloudinary
      const blob = new Blob([editedText], { type: file.mime_type || "text/plain" });
      const formData = new FormData();
      formData.append("file", blob, file.name);
      formData.append("folder", `cloudbox/${share?.user_id}`);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      const uploadResp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/cloudinary-upload`,
        {
          method: "POST",
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
          body: formData,
        }
      );

      if (!uploadResp.ok) throw new Error("Save failed");
      const uploadResult = await uploadResp.json();
      const newUrl = uploadResult.secure_url || uploadResult.cloudinary_url || uploadResult.url;

      await supabase
        .from("files")
        .update({
          cloudinary_url: newUrl,
          cloudinary_public_id: uploadResult.public_id || uploadResult.cloudinary_public_id,
          size: blob.size,
        })
        .eq("id", file.id);

      setFile({ ...file, cloudinary_url: newUrl, size: blob.size });
      setSignedUrl(newUrl);
      setTextContent(editedText);
      setIsEditingText(false);
      toast.success("File saved!");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    }
    setSavingText(false);
  };

  // ─── Copy to My Drive (recursive for folders) ───
  const handleCopyToDrive = async () => {
    if (!file || !currentUser) return;
    setCopying(true);
    try {
      if (file.is_folder) {
        // Recursively copy folder and all contents
        const copyFolderRecursive = async (sourceFolderId: string, targetParentId: string | null, folderName: string) => {
          // Create the folder
          const { data: newFolder, error: folderErr } = await supabase.from("files").insert({
            name: folderName,
            user_id: currentUser.id,
            is_folder: true,
            storage_path: `${currentUser.id}/folders/${Date.now()}-${folderName}`,
            mime_type: "application/x-folder",
            size: 0,
            parent_id: targetParentId,
          }).select("id").single();
          if (folderErr || !newFolder) throw folderErr || new Error("Failed to create folder");

          // Fetch all children of the source folder
          const { data: children } = await supabase
            .from("files")
            .select("id, name, mime_type, size, storage_path, cloudinary_url, cloudinary_public_id, is_folder, parent_id")
            .eq("parent_id", sourceFolderId)
            .eq("is_trashed", false);

          if (children && children.length > 0) {
            for (const child of children) {
              if (child.is_folder) {
                await copyFolderRecursive(child.id, newFolder.id, child.name);
              } else {
                await supabase.from("files").insert({
                  name: child.name,
                  user_id: currentUser.id,
                  is_folder: false,
                  storage_path: `${currentUser.id}/${crypto.randomUUID()}-${child.name}`,
                  mime_type: child.mime_type,
                  size: child.size,
                  cloudinary_url: child.cloudinary_url,
                  cloudinary_public_id: child.cloudinary_public_id ?? null,
                  parent_id: newFolder.id,
                });
              }
            }
          }
        };

        await copyFolderRecursive(file.id, null, `${file.name} (copy)`);
        toast.success("Folder and all contents copied to your drive!");
      } else {
        const { error } = await supabase.from("files").insert({
          name: file.name,
          user_id: currentUser.id,
          is_folder: false,
          storage_path: `${currentUser.id}/${crypto.randomUUID()}-${file.name}`,
          mime_type: file.mime_type,
          size: file.size,
          cloudinary_url: file.cloudinary_url,
          cloudinary_public_id: file.cloudinary_public_id ?? null,
        });
        if (error) throw error;
        toast.success("File copied to your drive!");
      }
    } catch (err: any) {
      toast.error(err.message || "Copy failed");
    }
    setCopying(false);
  };

  const totalFolderSize = useMemo(() => folderContents.reduce((s, f) => s + (f.size || 0), 0), [folderContents]);
  const hasUnsavedTextChanges = textContent !== null && editedText !== textContent;

  // ─── Embed code generator ───
  const sharePageUrl = typeof window !== "undefined" ? window.location.href : "";
  const embedCode = `<iframe src="${sharePageUrl}" width="800" height="600" frameborder="0" allowfullscreen style="border:none;border-radius:8px;"></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied!");
    setEmbedOpen(false);
  };

  // ─── Open in App dialog state ───
  const [openInAppOpen, setOpenInAppOpen] = useState(false);
  const [copyingItems, setCopyingItems] = useState<Set<string>>(new Set());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [copyingAll, setCopyingAll] = useState(false);

  const handleCopySingleFile = async (f: SharedFileItem) => {
    if (!currentUser) return;
    setCopyingItems(prev => new Set(prev).add(f.id));
    try {
      await supabase.from("files").insert({
        name: f.name,
        user_id: currentUser.id,
        is_folder: false,
        storage_path: `${currentUser.id}/${crypto.randomUUID()}-${f.name}`,
        mime_type: f.mime_type,
        size: f.size,
        cloudinary_url: f.cloudinary_url,
        cloudinary_public_id: f.cloudinary_public_id ?? null,
      });
      setCopiedItems(prev => new Set(prev).add(f.id));
      toast.success(`Copied "${f.name}" to your drive`);
    } catch {
      toast.error(`Failed to copy "${f.name}"`);
    }
    setCopyingItems(prev => { const n = new Set(prev); n.delete(f.id); return n; });
  };

  const handleCopyAll = async () => {
    if (!currentUser || !file) return;
    setCopyingAll(true);
    try {
      await handleCopyToDrive();
      setCopiedItems(new Set(folderContents.map(f => f.id)));
    } catch { /* handled in handleCopyToDrive */ }
    setCopyingAll(false);
  };

  const handleOpenInApp = () => {
    if (!file) return;
    if (!currentUser) {
      toast.error("Please sign in to open files in app");
      navigate(`/auth?redirect=/share/${token}`);
      return;
    }
    setOpenInAppOpen(true);
  };

  // ─── Owner badge component ───
  const OwnerBadge = () => {
    if (!ownerInfo) return null;
    return (
      <div className="flex items-center gap-1.5">
        {ownerInfo.avatar_url ? (
          <img src={ownerInfo.avatar_url} className="w-5 h-5 rounded-full" alt="" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-3 h-3 text-primary" />
          </div>
        )}
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {ownerInfo.display_name || ownerInfo.email?.split("@")[0] || "User"}
        </span>
      </div>
    );
  };

  // ─── Permission badge ───
  const PermissionBadge = () => (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
      isEditor ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
    )}>
      {isEditor ? <Pencil className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      {isEditor ? "Can edit" : "View only"}
    </span>
  );

  // ─── Open in App Dialog/Drawer ───
  const OpenInAppContent = () => {
    const items = file?.is_folder ? folderContents : (file ? [file] : []);
    return (
      <div className="space-y-4">
        {/* File/Folder info */}
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
            <FileTypeIcon name={file?.name || ""} mime={file?.mime_type || ""} isFolder={file?.is_folder ?? false} size={36} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{file?.name}</p>
            <p className="text-xs text-muted-foreground">
              {file?.is_folder ? `${folderContents.length} items · ${formatSize(totalFolderSize)}` : formatSize(file?.size || 0)}
            </p>
          </div>
        </div>

        {/* Items list */}
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <FileTypeIcon name={item.name} mime={item.mime_type} isFolder={item.is_folder} size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.is_folder ? "Folder" : formatSize(item.size)}</p>
              </div>
              {!item.is_folder && (
                <Button
                  size="sm"
                  variant={copiedItems.has(item.id) ? "ghost" : "outline"}
                  className="h-7 text-[10px] px-2"
                  disabled={copyingItems.has(item.id) || copiedItems.has(item.id)}
                  onClick={() => handleCopySingleFile(item)}
                >
                  {copiedItems.has(item.id) ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> Copied</>
                  ) : copyingItems.has(item.id) ? (
                    <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Copying</>
                  ) : (
                    <><Copy className="w-3 h-3 mr-1" /> Copy</>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Copy all button */}
        {file?.is_folder && folderContents.length > 0 && (
          <Button
            className="w-full"
            onClick={handleCopyAll}
            disabled={copyingAll}
          >
            {copyingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copy all to My Drive (with folders)
          </Button>
        )}

        {!file?.is_folder && !copiedItems.has(file?.id || "") && (
          <Button
            className="w-full"
            onClick={() => file && handleCopySingleFile(file)}
            disabled={copyingItems.has(file?.id || "")}
          >
            {copyingItems.has(file?.id || "") ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copy to My Drive
          </Button>
        )}
      </div>
    );
  };

  const openInAppDialog = openInAppOpen && (
    isMobile ? (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/50 z-50"
          onClick={() => setOpenInAppOpen(false)}
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => { if (info.offset.y > 100) setOpenInAppOpen(false); }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto pb-safe"
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <div className="px-5 pb-6">
            <h3 className="text-lg font-bold text-foreground text-center mb-1">Open in App</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">Copy files to your drive</p>
            <OpenInAppContent />
          </div>
        </motion.div>
      </AnimatePresence>
    ) : (
      <>
        <div className="fixed inset-0 bg-foreground/50 z-50" onClick={() => setOpenInAppOpen(false)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Open in App</h3>
              <button onClick={() => setOpenInAppOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <OpenInAppContent />
          </motion.div>
        </div>
      </>
    )
  );

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── NO ACCESS (private gate) ───
  if (state === "no_access") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground mb-2">Access Restricted</h1>
          <p className="text-sm text-muted-foreground mb-2">
            This file is shared privately. Only invited users can access it.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            {currentUser ? `You're signed in as ${currentUser.email}, but you haven't been invited.` : "Please sign in with an invited email address."}
          </p>
          <div className="flex gap-2 justify-center">
            {!currentUser && (
              <Link to="/auth"><Button>Sign In</Button></Link>
            )}
            <Link to="/"><Button variant="outline">Go to YoCloud</Button></Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── NOT FOUND / EXPIRED / DOWNLOAD LIMIT ───
  if (state === "not_found" || state === "expired" || state === "download_limit_reached") {
    const isExpired = state === "expired";
    const isDlLimit = state === "download_limit_reached";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDlLimit ? "bg-orange-500/10" : "bg-destructive/10"}`}>
            {isDlLimit ? <Download className="w-8 h-8 text-orange-500" /> : <AlertTriangle className="w-8 h-8 text-destructive" />}
          </div>
          <h1 className="text-xl font-display font-bold text-foreground mb-2">
            {isExpired ? "Link expired" : isDlLimit ? "Download limit reached" : "File not found"}
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            {isExpired
              ? "This share link has expired and is no longer available."
              : isDlLimit
              ? "This file has reached its maximum download limit set by the owner."
              : "This share link is invalid or the file has been removed."}
          </p>
          {isExpired && share?.expires_at && (
            <p className="text-xs text-muted-foreground mb-4">
              Expired on {new Date(share.expires_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {isDlLimit && share?.download_limit && (
            <p className="text-xs text-muted-foreground mb-4">
              {share.download_count}/{share.download_limit} downloads used
            </p>
          )}
          <p className="text-xs text-muted-foreground mb-6">
            Contact the file owner for a new link.
          </p>
          <Link to="/"><Button variant="outline">Go to YoCloud</Button></Link>
        </motion.div>
      </div>
    );
  }

  // ─── PASSWORD ───
  if (state === "password") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Password required</h1>
          <p className="text-sm text-muted-foreground">Enter the password to access this {file?.is_folder ? "folder" : "file"}.</p>
          <Input
            type="password" placeholder="Password" value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            className={passwordError ? "border-destructive" : ""}
          />
          {passwordError && <p className="text-xs text-destructive">Incorrect password</p>}
          <Button className="w-full" onClick={handlePasswordSubmit} disabled={verifyingPassword}>
            {verifyingPassword ? "Verifying..." : "Unlock"}
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── FOLDER VIEW ───
  if (file?.is_folder) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {openInAppDialog}
        {/* Fixed header */}
        <header className="sticky top-0 z-30 flex flex-col border-b border-border/60 bg-card/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 gap-2">
            <Link to="/" className="flex items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <LucideFileIcon className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sm text-foreground hidden sm:inline">YoCloud</span>
            </Link>

            {/* Center: owner + permission */}
            <div className="hidden sm:flex items-center gap-2 flex-1 justify-center min-w-0">
              <OwnerBadge />
              <span className="h-3 w-px bg-border" />
              <PermissionBadge />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-xs h-8 px-2">
                    <Code2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline ml-1">Embed</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="end">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Embed this folder</h4>
                    <p className="text-xs text-muted-foreground">Copy the code below to embed on your website.</p>
                    <pre className="text-[10px] bg-secondary rounded-lg p-2.5 overflow-x-auto text-foreground border border-border whitespace-pre-wrap break-all max-h-24">
                      {embedCode}
                    </pre>
                    <Button size="sm" className="w-full text-xs" onClick={handleCopyEmbed}>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy Embed Code
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {currentUser && (
                <Button size="sm" variant="ghost" className="text-xs h-8 px-2" onClick={handleOpenInApp}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline ml-1">Open in App</span>
                </Button>
              )}
              {currentUser && currentUser.id !== share?.user_id && (
                <Button size="sm" variant="outline" className="text-xs h-8 px-2" onClick={handleCopyToDrive} disabled={copying}>
                  {copying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline ml-1">Copy</span>
                </Button>
              )}
              <Button size="sm" className="h-8 px-2 sm:px-3 text-xs" onClick={handleDownloadFolder} disabled={zipping}>
                {zipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline ml-1">{zipping ? "Zipping..." : "ZIP"}</span>
              </Button>
              {!currentUser && (
                <Link to={`/auth?redirect=/share/${token}`}>
                  <Button size="sm" variant="outline" className="text-xs h-8">Sign in</Button>
                </Link>
              )}
            </div>
          </div>
          {/* Breadcrumbs row */}
          <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
            {breadcrumbs.map((bc, i) => (
              <div key={bc.id} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md whitespace-nowrap transition-colors",
                    i === breadcrumbs.length - 1
                      ? "font-medium text-foreground bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {i === 0 ? "📁 Shared" : bc.name}
                </button>
              </div>
            ))}
          </div>
        </header>

        {/* Folder info bar - mobile shows owner here */}
        <div className="px-4 py-2 bg-secondary/30 border-b border-border/40 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <div className="sm:hidden flex items-center gap-2">
            <OwnerBadge />
            <span className="h-3 w-px bg-border" />
          </div>
          <span className="flex items-center gap-1"><FolderIcon className="w-3.5 h-3.5" /> {file.name}</span>
          <span>{folderContents.length} items</span>
          <span>{formatSize(totalFolderSize)}</span>
          <span className="ml-auto sm:hidden"><PermissionBadge /></span>
        </div>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {loadingContents ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : folderContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <FolderIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-display font-bold text-foreground mb-1">Empty folder</h2>
              <p className="text-sm text-muted-foreground">This folder has no files or subfolders.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {folderContents.map((item) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => {
                    if (item.is_folder) navigateToFolder(item);
                    else handleDownloadFile(item);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left active:bg-secondary/70"
                >
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <FileTypeIcon name={item.name} mime={item.mime_type} isFolder={item.is_folder} size={36} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.is_folder ? "Folder" : formatSize(item.size)}
                    </p>
                  </div>
                  {item.is_folder && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  {!item.is_folder && <Download className="w-4 h-4 text-muted-foreground shrink-0" />}
                </motion.button>
              ))}
            </div>
          )}
        </main>

        {/* Fixed bottom bar - mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-card/95 backdrop-blur-sm border-t border-border/60 z-20">
          <Button className="w-full h-11" onClick={handleDownloadFolder} disabled={zipping}>
            {zipping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
            {zipping ? "Preparing download..." : `Download all (${formatSize(totalFolderSize)})`}
          </Button>
        </div>
      </div>
    );
  }

  // ─── FILE VIEW ───
  const category = file ? detectCategory(file.mime_type, file.name) : "unknown";
  const isTextFile = textContent !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {openInAppDialog}
      {/* Fixed header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border/60 bg-card/95 backdrop-blur-sm shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link to="/" className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <LucideFileIcon className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
          </Link>
          <div className="h-5 w-px bg-border" />

          {/* File name with inline rename */}
          {isRenaming && isEditor ? (
            <div className="flex items-center gap-1">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className="h-7 text-xs w-32"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRename} disabled={renaming}>
                <Check className="w-3.5 h-3.5 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsRenaming(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-medium text-foreground truncate max-w-[120px] sm:max-w-[200px]">{file?.name}</span>
              {isEditor && (
                <button
                  onClick={() => { setNewName(file?.name || ""); setIsRenaming(true); }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Editor actions - hidden on mobile, in bottom bar instead */}
          <div className="hidden sm:flex items-center gap-1">
            {isEditor && isTextFile && hasUnsavedTextChanges && (
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleSaveText} disabled={savingText}>
                {savingText ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Save
              </Button>
            )}
            {isEditor && isTextFile && !isEditingText && (
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setIsEditingText(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
            {isEditor && isTextFile && isEditingText && !hasUnsavedTextChanges && (
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setIsEditingText(false)}>
                <Eye className="w-3.5 h-3.5 mr-1" /> View
              </Button>
            )}
            {isEditor && currentUser && (
              <div className="relative">
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => document.getElementById("version-upload-input")?.click()}>
                  <Upload className="w-3.5 h-3.5 mr-1" /> Replace
                </Button>
                <input id="version-upload-input" type="file" className="hidden" onChange={handleVersionUpload} />
              </div>
            )}
            {currentUser && currentUser.id !== share?.user_id && (
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleCopyToDrive} disabled={copying}>
                {copying ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                Copy to Drive
              </Button>
            )}
          </div>
          <Popover open={embedOpen} onOpenChange={setEmbedOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="text-xs h-8 px-2">
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline ml-1">Embed</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Embed this file</h4>
                <p className="text-xs text-muted-foreground">Copy the code below to embed on your website.</p>
                <pre className="text-[10px] bg-secondary rounded-lg p-2.5 overflow-x-auto text-foreground border border-border whitespace-pre-wrap break-all max-h-24">
                  {embedCode}
                </pre>
                <Button size="sm" className="w-full text-xs" onClick={handleCopyEmbed}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Embed Code
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {currentUser && (
            <Button size="sm" variant="ghost" className="text-xs h-8 px-2 hidden sm:flex" onClick={handleOpenInApp}>
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">Open in App</span>
            </Button>
          )}
          <Button size="sm" className="h-8 hidden sm:flex" onClick={() => file && handleDownloadFile(file)}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </Button>
          {!currentUser && (
            <Link to={`/auth?redirect=/share/${token}`}>
              <Button size="sm" variant="outline" className="text-xs h-8">Sign in</Button>
            </Link>
          )}
        </div>
      </header>

      {/* Info bar */}
      <div className="px-4 py-1.5 bg-secondary/30 border-b border-border/40 flex items-center gap-2 text-xs flex-wrap">
        <OwnerBadge />
        <span className="h-3 w-px bg-border" />
        <PermissionBadge />
        {share && share.view_count > 0 && (
          <>
            <span className="h-3 w-px bg-border" />
            <span className="text-muted-foreground">{share.view_count} views</span>
          </>
        )}
        {share?.download_limit && (
          <>
            <span className="h-3 w-px bg-border" />
            <span className="text-muted-foreground">
              <Download className="w-3 h-3 inline mr-0.5" />
              {share.download_count}/{share.download_limit}
            </span>
          </>
        )}
        {file && <span className="text-muted-foreground ml-auto">{formatSize(file.size)}</span>}
      </div>

      {/* Saving indicator */}
      {savingText && (
        <div className="px-4 py-1.5 bg-primary/10 text-xs text-primary font-medium">
          Saving changes...
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-4 bg-secondary/20 overflow-auto pb-20 md:pb-4">
        {!signedUrl ? (
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : isTextFile && isEditingText && isEditor ? (
          <div className="w-full h-full min-h-[50vh]">
            <textarea
              value={editedText ?? ""}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-full min-h-[50vh] font-mono text-sm bg-card rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground border border-border"
              spellCheck={false}
            />
          </div>
        ) : isTextFile ? (
          <div className="w-full h-full min-h-[50vh]">
            <pre className="w-full h-full min-h-[50vh] font-mono text-sm bg-card rounded-lg p-4 overflow-auto text-foreground border border-border whitespace-pre-wrap break-words">
              {textContent}
            </pre>
          </div>
        ) : category === "image" ? (
          <img src={signedUrl} alt={file?.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
        ) : category === "video" ? (
          <video src={signedUrl} controls className="max-w-full max-h-[70vh] rounded-lg" preload="metadata" />
        ) : category === "audio" ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-4xl">🎵</span>
            </div>
            <p className="text-sm font-medium text-foreground">{file?.name}</p>
            <audio src={signedUrl} controls className="w-full max-w-sm" preload="metadata" />
          </div>
        ) : category === "pdf" ? (
          <iframe src={signedUrl} className="w-full h-full min-h-[70vh] border-0 rounded-lg" title={file?.name} />
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <FileTypeIcon name={file?.name || ""} mime={file?.mime_type || ""} isFolder={false} size={48} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{file?.name}</p>
            <p className="text-xs text-muted-foreground mb-4">{file?.mime_type}</p>
            <Button onClick={() => file && handleDownloadFile(file)}>
              <Download className="w-4 h-4 mr-2" /> Download to view
            </Button>
          </div>
        )}
      </div>

      {/* Comments */}
      {file && (
        <SharedComments fileId={file.id} isEditor={!!isEditor} currentUser={currentUser} />
      )}

      {/* Fixed bottom bar - mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border/60 z-20 px-3 py-2.5 flex items-center gap-2">
        <Button className="flex-1 h-10" onClick={() => file && handleDownloadFile(file)}>
          <Download className="w-4 h-4 mr-1.5" /> Download
        </Button>
        {currentUser && currentUser.id !== share?.user_id && (
          <Button variant="outline" className="h-10 px-3" onClick={handleCopyToDrive} disabled={copying}>
            {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
          </Button>
        )}
        {currentUser && (
          <Button variant="outline" className="h-10 px-3" onClick={handleOpenInApp}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ZipProgressTracker progress={zipProgress} onClose={() => setZipProgress(p => ({ ...p, visible: false }))} />
    </div>
  );
}
