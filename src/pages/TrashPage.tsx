import { useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, ArrowLeft, RotateCcw, AlertTriangle } from "lucide-react";
import { Header } from "@/components/Header";
import { FileTable } from "@/components/FileTable";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { BulkActionBar } from "@/components/BulkActionBar";
import { BulkTrashActions } from "@/components/BulkTrashActions";
import { PreviewPanel } from "@/components/PreviewPanel";
import { BottomNavbar } from "@/components/BottomNavbar";
import { AppSidebar } from "@/components/AppSidebar";
import { ShareDialog } from "@/components/ShareDialog";
import { useFiles, useUpdateFile, useDeleteFile } from "@/hooks/useFiles";
import { useProfile } from "@/hooks/useRoles";
import { useTags, useFileTags, type Tag } from "@/hooks/useTags";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FileItem } from "@/components/RecentFiles";

function toFileItem(dbFile: any): FileItem {
  return {
    id: dbFile.id, name: dbFile.name, mime_type: dbFile.mime_type || "application/octet-stream",
    size: dbFile.size || 0, is_starred: dbFile.is_starred ?? false, is_trashed: dbFile.is_trashed ?? false,
    is_folder: dbFile.is_folder ?? false, parent_id: dbFile.parent_id ?? null, created_at: dbFile.created_at,
    storage_path: dbFile.storage_path, cloudinary_url: dbFile.cloudinary_url ?? null,
    cloudinary_public_id: dbFile.cloudinary_public_id ?? null, user_id: dbFile.user_id,
  };
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

const TrashPage = () => {
  const navigate = useNavigate();
  const { data: dbFiles, isLoading } = useFiles();
  const { data: profile } = useProfile();
  const updateFile = useUpdateFile();
  const deleteFileMutation = useDeleteFile();
  const { data: tags } = useTags();
  const { data: fileTags } = useFileTags();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ file: FileItem; permanent: boolean } | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortField, setSortField] = useState("name");
  const [shareFile, setShareFile] = useState<FileItem | null>(null);

  const allFiles = useMemo(() => (dbFiles ?? []).map(toFileItem), [dbFiles]);
  const trashedFiles = useMemo(() => allFiles.filter((f) => f.is_trashed), [allFiles]);
  const totalTrashSize = useMemo(() => trashedFiles.reduce((s, f) => s + (f.size || 0), 0), [trashedFiles]);
  const totalStorageUsed = useMemo(() => allFiles.reduce((sum, f) => sum + (f.size || 0), 0), [allFiles]);
  const STORAGE_LIMIT = profile?.storage_limit ?? 5368709120;

  const fileTagMap = useMemo(() => {
    const map = new Map<string, Tag[]>();
    if (!fileTags || !tags) return map;
    const tagMap = new Map(tags.map((t) => [t.id, t]));
    for (const ft of fileTags) {
      const tag = tagMap.get(ft.tag_id);
      if (tag) {
        const existing = map.get(ft.file_id) ?? [];
        existing.push(tag);
        map.set(ft.file_id, existing);
      }
    }
    return map;
  }, [fileTags, tags]);

  const sortedFiles = useMemo(() => {
    return [...trashedFiles].sort((a, b) => {
      if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1;
      if (sortField === "name") return a.name.localeCompare(b.name);
      if (sortField === "size") return (b.size || 0) - (a.size || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [trashedFiles, sortField]);

  const handleRestore = (file: FileItem) => {
    updateFile.mutate({ id: file.id, is_trashed: false, _actionType: "restore", _fileName: file.name } as any);
    toast.success("File restored");
  };
  const handleDelete = (file: FileItem) => setDeleteTarget({ file, permanent: true });
  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteFileMutation.mutate({ file: deleteTarget.file as any, allFiles: allFiles as any });
    setDeleteTarget(null);
  };
  const handleDownload = async (file: FileItem) => {
    if (file.is_folder) return;
    if (file.cloudinary_url) { window.open(file.cloudinary_url, "_blank"); return; }
    const { data, error } = await supabase.storage.from("user-files").createSignedUrl(file.storage_path, 60);
    if (error || !data?.signedUrl) return toast.error("Download failed");
    window.open(data.signedUrl, "_blank");
  };

  const handleBulkToggle = (fileId: string) => {
    setBulkSelected((prev) => { const next = new Set(prev); next.has(fileId) ? next.delete(fileId) : next.add(fileId); return next; });
  };
  const handleBulkRestore = (files: FileItem[]) => {
    files.forEach((f) => updateFile.mutate({ id: f.id, is_trashed: false, _actionType: "restore", _fileName: f.name } as any));
    toast.success(`${files.length} items restored`);
    setBulkSelected(new Set());
  };
  const handleBulkDelete = (files: FileItem[]) => {
    files.forEach((f) => deleteFileMutation.mutate({ file: f as any, allFiles: allFiles as any }));
    setBulkSelected(new Set());
  };

  const selectedBulkFiles = sortedFiles.filter((f) => bulkSelected.has(f.id));

  const countChildren = useCallback((folderId: string): number => {
    let count = 0;
    const children = allFiles.filter((f) => f.parent_id === folderId);
    children.forEach((child) => { count++; if (child.is_folder) count += countChildren(child.id); });
    return count;
  }, [allFiles]);

  const deleteChildCount = deleteTarget?.file.is_folder ? countChildren(deleteTarget.file.id) : 0;

  const fileActions = {
    onStar: () => {},
    onTrash: () => {},
    onRestore: handleRestore,
    onDelete: handleDelete,
    onRename: () => {},
    onDownload: handleDownload,
    onMove: () => {},
    onOpen: (file: FileItem) => { if (!file.is_folder) { setSelectedFile(null); setPreviewFile(file); } },
    onShare: (file: FileItem) => setShareFile(file),
    onVersionHistory: () => {},
    onUploadVersion: () => {},
    onManageTags: () => {},
    onCopyToWorkspace: () => {},
    onMoveToWorkspace: () => {},
    onPublishToMarketplace: () => {},
  };

  return (
    <div className="flex min-h-screen w-full bg-background pb-16 md:pb-0">
      <AppSidebar activeItem="trash" onItemClick={(nav) => { if (nav === "trash") return; navigate("/"); }} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} storageUsedBytes={totalStorageUsed} storageLimitBytes={STORAGE_LIMIT} />

      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} searchQuery="" onSearchChange={() => {}} />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-secondary transition-colors md:hidden">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">Trash</h1>
                <p className="text-xs text-muted-foreground">
                  {trashedFiles.length} item{trashedFiles.length !== 1 ? "s" : ""} · {formatSize(totalTrashSize)}
                </p>
              </div>
            </div>
          </div>

          {/* Bulk trash actions */}
          {trashedFiles.length > 0 && (
            <BulkTrashActions trashedFiles={trashedFiles} onBulkDelete={handleBulkDelete} onBulkRestore={handleBulkRestore} />
          )}

          {/* Bulk action bar */}
          <BulkActionBar
            selectedFiles={selectedBulkFiles}
            allFiles={allFiles}
            onClearSelection={() => setBulkSelected(new Set())}
            onBulkTrash={() => {}}
            onBulkRestore={handleBulkRestore}
            onBulkDelete={handleBulkDelete}
            onBulkStar={() => {}}
            onBulkMove={() => {}}
            onBulkDownload={(files) => files.forEach(handleDownload)}
            onBulkShare={() => {}}
            isTrashView={true}
          />

          <AnimatePresence mode="wait">
            {trashedFiles.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-5">
                    <Trash2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-display font-bold text-foreground mb-2">Trash is empty</h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Files you delete will appear here. They'll be automatically removed after your configured cleanup period.
                  </p>
                  <button onClick={() => navigate("/")} className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    Back to My Storage
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-4 p-3 rounded-lg bg-destructive/5 border border-destructive/10 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Permanently deleted files cannot be recovered. Restore files before the auto-cleanup period ends.
                  </p>
                </div>
                <FileTable
                  files={sortedFiles} selectedFile={selectedFile}
                  onFileSelect={(f) => setSelectedFile((prev) => (prev?.id === f.id ? null : f))}
                  onFolderOpen={() => {}} viewMode={viewMode} onViewModeChange={setViewMode}
                  sortField={sortField} onSortChange={setSortField} searchQuery=""
                  bulkSelected={bulkSelected} onBulkToggle={handleBulkToggle}
                  fileTagMap={fileTagMap}
                  {...fileActions}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <PreviewPanel file={selectedFile} onClose={() => setSelectedFile(null)} />
      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} fileName={deleteTarget?.file.name ?? ""} fileSize={deleteTarget?.file.size} onConfirm={confirmDelete} permanent={true} childCount={deleteChildCount} />
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} onDownload={handleDownload} onShare={(f) => { setPreviewFile(null); setShareFile(f); }} onDelete={(f) => { setPreviewFile(null); setDeleteTarget({ file: f as any, permanent: true }); }} fileList={sortedFiles} onNavigate={(f) => setPreviewFile(f)} />
      <ShareDialog file={shareFile} open={!!shareFile} onOpenChange={(open) => !open && setShareFile(null)} />

      <BottomNavbar activeItem="trash" onItemClick={(nav) => { if (nav === "trash") return; navigate("/"); }} onUploadClick={() => {}} />
    </div>
  );
};

export default TrashPage;
