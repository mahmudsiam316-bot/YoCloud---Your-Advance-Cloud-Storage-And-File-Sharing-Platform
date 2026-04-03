import { useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { RecentFiles, type FileItem } from "@/components/RecentFiles";
import { FileTable } from "@/components/FileTable";
import { PreviewPanel } from "@/components/PreviewPanel";
import { UploadArea } from "@/components/UploadArea";
import { EmptyState } from "@/components/EmptyState";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";
import { MoveFileDialog } from "@/components/MoveFileDialog";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { type UploadTask } from "@/components/UploadProgressDrawer";
import { UploadDrawer } from "@/components/UploadDrawer";
import { ActivityPanel } from "@/components/ActivityPanel";
import { StorageBreakdown } from "@/components/StorageBreakdown";
import { SearchFilters, type SearchFilterState, matchesTypeFilter } from "@/components/SearchFilters";
import { PhotosGrid } from "@/components/PhotosGrid";
import { ShareDialog } from "@/components/ShareDialog";
import { BottomNavbar } from "@/components/BottomNavbar";
import { BulkActionBar } from "@/components/BulkActionBar";
import { FileVersionsDialog } from "@/components/FileVersionsDialog";
import { UploadVersionDialog } from "@/components/UploadVersionDialog";
import { TagFileDialog } from "@/components/TagComponents";
import { useAuth } from "@/hooks/useAuth";
import { useFiles, useUpdateFile, useDeleteFile, useCreateFolder, wouldCreateCycle, hasDuplicateName } from "@/hooks/useFiles";
import { useCloudinaryUpload } from "@/hooks/useCloudinary";
import { useProfile } from "@/hooks/useRoles";
import { useDebounce } from "@/hooks/useDebounce";
import { useTags, useFileTags, type Tag } from "@/hooks/useTags";
import { createNotification } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePermissionCheck } from "@/hooks/usePermissionCheck";
import { CrossWorkspaceCopyDialog } from "@/components/CrossWorkspaceCopyDialog";
import { PublishDialog } from "@/components/marketplace/PublishDialog";

function toFileItem(dbFile: any): FileItem {
  return {
    id: dbFile.id,
    name: dbFile.name,
    mime_type: dbFile.mime_type || "application/octet-stream",
    size: dbFile.size || 0,
    is_starred: dbFile.is_starred ?? false,
    is_trashed: dbFile.is_trashed ?? false,
    is_folder: dbFile.is_folder ?? false,
    parent_id: dbFile.parent_id ?? null,
    created_at: dbFile.created_at,
    storage_path: dbFile.storage_path,
    cloudinary_url: dbFile.cloudinary_url ?? null,
    cloudinary_public_id: dbFile.cloudinary_public_id ?? null,
    user_id: dbFile.user_id,
  };
}

const Index = () => {
  const { user } = useAuth();
  const { data: dbFiles, isLoading } = useFiles();
  const uploadFile = useCloudinaryUpload();
  const { data: profile } = useProfile();
  const updateFile = useUpdateFile();
  const deleteFileMutation = useDeleteFile();
  const createFolder = useCreateFolder();
  const { data: tags } = useTags();
  const { data: fileTags } = useFileTags();
  const permissions = usePermissionCheck();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("my-storage");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortField, setSortField] = useState("name");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilterState>({ type: null, sizeMin: null, sizeMax: null });

  const [deleteTarget, setDeleteTarget] = useState<{ file: FileItem; permanent: boolean } | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);

  // New feature states
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [versionHistoryFile, setVersionHistoryFile] = useState<FileItem | null>(null);
  const [uploadVersionFile, setUploadVersionFile] = useState<FileItem | null>(null);
  const [tagFile, setTagFile] = useState<FileItem | null>(null);
  const [crossWsCopyFile, setCrossWsCopyFile] = useState<{ file: FileItem; mode: "copy" | "move" } | null>(null);
  const [publishFile, setPublishFile] = useState<FileItem | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const allFiles = useMemo(() => (dbFiles ?? []).map(toFileItem), [dbFiles]);
  const totalStorageUsed = useMemo(() => allFiles.reduce((sum, f) => sum + (f.size || 0), 0), [allFiles]);
  const STORAGE_LIMIT = profile?.storage_limit ?? 5368709120;
  const hasFiles = allFiles.filter((f) => !f.is_trashed).length > 0;

  // Build file → tags map
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

  const countChildren = useCallback((folderId: string): number => {
    let count = 0;
    const children = allFiles.filter((f) => f.parent_id === folderId);
    children.forEach((child) => { count++; if (child.is_folder) count += countChildren(child.id); });
    return count;
  }, [allFiles]);

  const filteredFiles = useMemo(() => {
    let files = allFiles.filter((f) => !f.is_trashed);

    if (activeNav === "favorites") {
      files = allFiles.filter((f) => f.is_starred && !f.is_trashed);
    } else if (activeNav === "recents") {
      files = [...allFiles.filter((f) => !f.is_trashed && !f.is_folder)]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 30);
    } else if (activeNav === "my-storage") {
      files = files.filter((f) => f.parent_id === currentFolderId);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      files = allFiles.filter((f) => !f.is_trashed && f.name.toLowerCase().includes(q));
    }

    if (searchFilters.type) files = files.filter((f) => matchesTypeFilter(f.mime_type, searchFilters.type));
    if (searchFilters.sizeMin !== null) files = files.filter((f) => (f.size || 0) >= searchFilters.sizeMin!);
    if (searchFilters.sizeMax !== null) files = files.filter((f) => (f.size || 0) <= searchFilters.sizeMax!);

    return files.sort((a, b) => {
      if (activeNav === "recents") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1;
      if (sortField === "name") return a.name.localeCompare(b.name);
      if (sortField === "size") return (b.size || 0) - (a.size || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [allFiles, debouncedSearch, sortField, activeNav, currentFolderId, searchFilters]);

  const executeUploadQueue = useCallback(async (tasks: UploadTask[], parentId: string | null) => {
    for (const task of tasks) {
      setUploadTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "uploading" as const, progress: 0 } : t)));

      try {
        await new Promise<void>((resolve) => {
          uploadFile.mutate(
            {
              file: task.file,
              parentId,
              onProgress: (percent: number) => {
                setUploadTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, progress: percent } : t)));
              },
            },
            {
              onSuccess: () => {
                setUploadTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "done" as const, progress: 100 } : t)));
                resolve();
              },
              onError: (err: Error) => {
                setUploadTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "error" as const, progress: 100, error: err.message } : t)));
                resolve();
              },
            }
          );
        });
      } catch {
        // handled above
      }
    }

    setTimeout(() => {
      setUploadTasks((prev) => {
        const allFinished = prev.every((t) => t.status === "done" || t.status === "error");
        if (allFinished) {
          setUploadDrawerOpen(false);
          setTimeout(() => setUploadTasks([]), 400);
        }
        return prev;
      });
    }, 1500);
  }, [uploadFile]);

  const handleUpload = useCallback((files: File[]) => {
    if (!permissions.canUpload) { toast.error("You don't have upload permission in this workspace"); return; }
    const totalNewBytes = files.reduce((s, f) => s + f.size, 0);
    if (totalStorageUsed + totalNewBytes > STORAGE_LIMIT) { toast.error("Storage limit reached. Upgrade your plan."); return; }
    const oversized = files.filter((f) => f.size > 100 * 1024 * 1024);
    if (oversized.length > 0) { toast.error(`${oversized.length} file(s) exceed 100MB limit`); files = files.filter((f) => f.size <= 100 * 1024 * 1024); if (files.length === 0) return; }

    // Check storage warning
    const usedAfter = totalStorageUsed + totalNewBytes;
    if (user && usedAfter / STORAGE_LIMIT > 0.9) {
      createNotification(user.id, "storage", "Storage almost full", `You're using ${Math.round((usedAfter / STORAGE_LIMIT) * 100)}% of your storage. Consider upgrading your plan.`);
    }

    const tasks: UploadTask[] = files.map((f) => ({ id: `${Date.now()}-${f.name}-${Math.random().toString(36).slice(2)}`, file: f, progress: 0, status: "pending" as const }));
    setUploadTasks((prev) => [...prev, ...tasks]);
    executeUploadQueue(tasks, currentFolderId);
  }, [executeUploadQueue, currentFolderId, totalStorageUsed, user, STORAGE_LIMIT, permissions]);

  const handleRetryUpload = useCallback((taskId: string) => {
    const task = uploadTasks.find((t) => t.id === taskId);
    if (!task) return;
    setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "pending" as const, progress: 0, error: undefined } : t)));
    executeUploadQueue([{ ...task, status: "pending", progress: 0 }], currentFolderId);
  }, [uploadTasks, executeUploadQueue, currentFolderId]);

  const handleStar = (file: FileItem) => { updateFile.mutate({ id: file.id, is_starred: !file.is_starred, _actionType: file.is_starred ? "unstar" : "star", _fileName: file.name } as any); };
  const handleTrash = (file: FileItem) => {
    if (!permissions.canDelete) { toast.error("You don't have delete permission in this workspace"); return; }
    setDeleteTarget({ file, permanent: false });
  };
  const handleRestore = (file: FileItem) => { updateFile.mutate({ id: file.id, is_trashed: false, _actionType: "restore", _fileName: file.name } as any); toast.success("File restored"); };
  const handleDelete = (file: FileItem) => {
    if (!permissions.canDelete) { toast.error("You don't have delete permission in this workspace"); return; }
    setDeleteTarget({ file, permanent: true });
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.permanent) { deleteFileMutation.mutate({ file: deleteTarget.file as any, allFiles: allFiles as any }); }
    else { updateFile.mutate({ id: deleteTarget.file.id, is_trashed: true, _actionType: "trash", _fileName: deleteTarget.file.name } as any); toast.success("Moved to trash"); }
    setDeleteTarget(null);
  };
  const handleRename = (file: FileItem, newName: string) => {
    if (!permissions.canEdit) { toast.error("You don't have edit permission in this workspace"); return; }
    if (!newName.trim()) { toast.error("Name cannot be empty"); return; }
    if (!file.is_folder) { const oldExt = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''; const newExt = newName.includes('.') ? '.' + newName.split('.').pop() : ''; if (oldExt && !newExt) newName = newName + oldExt; }
    if (hasDuplicateName(newName, file.parent_id, file.id, allFiles as any)) { toast.error(`"${newName}" already exists in this folder`); return; }
    updateFile.mutate({ id: file.id, name: newName, _actionType: "rename", _fileName: file.name } as any); toast.success("Renamed");
  };
  const handleDownload = async (file: FileItem) => {
    if (file.is_folder) return;
    if (file.cloudinary_url) { window.open(file.cloudinary_url, "_blank"); return; }
    if (!file.storage_path) return;
    const { data, error } = await supabase.storage.from("user-files").createSignedUrl(file.storage_path, 60);
    if (error || !data?.signedUrl) return toast.error("Download failed");
    window.open(data.signedUrl, "_blank");
  };
  const handleMove = (file: FileItem, targetFolderId: string | null) => {
    if (file.parent_id === targetFolderId) { toast.error("File is already in this folder"); return; }
    if (file.is_folder && wouldCreateCycle(file.id, targetFolderId, allFiles as any)) { toast.error("Cannot move a folder into itself"); return; }
    if (hasDuplicateName(file.name, targetFolderId, file.id, allFiles as any)) { toast.error(`"${file.name}" already exists in the target folder`); return; }
    updateFile.mutate({ id: file.id, parent_id: targetFolderId, _actionType: "move", _fileName: file.name } as any); toast.success("File moved");
  };
  const handleFolderOpen = (folderId: string) => { setCurrentFolderId(folderId); setSelectedFile(null); setBulkSelected(new Set()); };
  const handleNavClick = (nav: string) => { setActiveNav(nav); if (nav !== "my-storage") setCurrentFolderId(null); setSelectedFile(null); setBulkSelected(new Set()); };

  // Bulk operations
  const handleBulkToggle = (fileId: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      next.has(fileId) ? next.delete(fileId) : next.add(fileId);
      return next;
    });
  };

  const handleBulkTrash = (files: FileItem[]) => {
    files.forEach((f) => updateFile.mutate({ id: f.id, is_trashed: true, _actionType: "trash", _fileName: f.name } as any));
    toast.success(`${files.length} items moved to trash`);
  };

  const handleBulkRestore = (files: FileItem[]) => {
    files.forEach((f) => updateFile.mutate({ id: f.id, is_trashed: false, _actionType: "restore", _fileName: f.name } as any));
    toast.success(`${files.length} items restored`);
  };

  const handleBulkDelete = (files: FileItem[]) => {
    files.forEach((f) => deleteFileMutation.mutate({ file: f as any, allFiles: allFiles as any }));
  };

  const handleBulkStar = (files: FileItem[], star: boolean) => {
    files.forEach((f) => updateFile.mutate({ id: f.id, is_starred: star, _actionType: star ? "star" : "unstar", _fileName: f.name } as any));
    toast.success(`${files.length} items ${star ? "starred" : "unstarred"}`);
    setBulkSelected(new Set());
  };

  const handleBulkMove = (files: FileItem[]) => {
    if (files.length === 1) { setMoveTarget(files[0]); }
    else { toast.info("Select a single file to move, or move files one by one"); }
  };

  const handleBulkDownload = (files: FileItem[]) => {
    files.forEach((f) => handleDownload(f));
  };

  const handleBulkShare = (files: FileItem[]) => {
    if (files.length === 1) { setShareFile(files[0]); }
    else { toast.info("Share one file at a time"); }
  };

  const selectedBulkFiles = filteredFiles.filter((f) => bulkSelected.has(f.id));

  const fileActions = {
    onStar: handleStar, onTrash: handleTrash, onRestore: handleRestore, onDelete: handleDelete,
    onRename: handleRename, onDownload: handleDownload,
    onMove: (file: FileItem) => setMoveTarget(file),
    onOpen: (file: FileItem) => {
      if (file.is_folder) {
        setCurrentFolderId(file.id);
      } else {
        setSelectedFile(null); // close side panel when modal opens
        setPreviewFile(file);
      }
    },
    onShare: (file: FileItem) => {
      if (!permissions.canShare) { toast.error("You don't have share permission in this workspace"); return; }
      setShareFile(file);
    },
    onVersionHistory: (file: FileItem) => setVersionHistoryFile(file),
    onUploadVersion: (file: FileItem) => {
      if (!permissions.canUpload) { toast.error("You don't have upload permission in this workspace"); return; }
      setUploadVersionFile(file);
    },
    onManageTags: (file: FileItem) => setTagFile(file),
    onCopyToWorkspace: (file: FileItem) => setCrossWsCopyFile({ file, mode: "copy" }),
    onMoveToWorkspace: (file: FileItem) => setCrossWsCopyFile({ file, mode: "move" }),
    onPublishToMarketplace: (file: FileItem) => setPublishFile(file),
  };

  const showEmpty = !isLoading && !hasFiles && activeNav !== "trash";
  const isSearching = !!debouncedSearch;
  const deleteChildCount = deleteTarget?.file.is_folder ? countChildren(deleteTarget.file.id) : 0;

  const pageTitle = activeNav === "favorites" ? "Favorites"
    : activeNav === "photos" ? "Photos"
    : activeNav === "recents" ? "Recents"
    : activeNav === "activity" ? "Activity"
    : currentFolderId ? allFiles.find((f) => f.id === currentFolderId)?.name || "Folder"
    : "My storage";

  return (
    <div className="flex min-h-screen w-full bg-background pb-16 md:pb-0">
      <AppSidebar activeItem={activeNav} onItemClick={handleNavClick} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} storageUsedBytes={totalStorageUsed} storageLimitBytes={STORAGE_LIMIT} />

      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {activeNav === "my-storage" && !isSearching && (
            <Breadcrumbs currentFolderId={currentFolderId} allFiles={allFiles} onNavigate={setCurrentFolderId} />
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-display font-bold text-foreground">
                {isSearching ? `Search: "${debouncedSearch}"` : pageTitle}
              </h1>
              {isSearching && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                  {filteredFiles.length} result{filteredFiles.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <SearchFilters filters={searchFilters} onFiltersChange={setSearchFilters} />
              {(hasFiles || currentFolderId) && activeNav !== "photos" && activeNav !== "activity" && (
                <UploadArea onFilesSelected={handleUpload} storageUsedBytes={totalStorageUsed} storageLimitBytes={STORAGE_LIMIT} isUploading={uploadFile.isPending} onCreateFolder={() => setCreateFolderOpen(true)} onOpenUploadDrawer={() => setUploadDrawerOpen(true)} />
              )}
            </div>
          </div>

          {/* Bulk action bar */}
          <BulkActionBar
            selectedFiles={selectedBulkFiles}
            allFiles={allFiles}
            onClearSelection={() => setBulkSelected(new Set())}
            onBulkTrash={handleBulkTrash}
            onBulkRestore={handleBulkRestore}
            onBulkDelete={handleBulkDelete}
            onBulkStar={handleBulkStar}
            onBulkMove={handleBulkMove}
            onBulkDownload={handleBulkDownload}
            onBulkShare={handleBulkShare}
            isTrashView={activeNav === "trash"}
          />

          <AnimatePresence mode="wait">
            {activeNav === "photos" ? (
              <motion.div key="photos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PhotosGrid files={allFiles} onFileSelect={setSelectedFile} onOpen={(file) => setPreviewFile(file)} />
              </motion.div>
            ) : activeNav === "activity" ? (
              <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="max-w-2xl">
                  <ActivityPanel />
                </div>
              </motion.div>
            ) : showEmpty && !currentFolderId ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState onFilesSelected={handleUpload} onCreateFolder={() => setCreateFolderOpen(true)} onOpenUploadDrawer={() => setUploadDrawerOpen(true)} />
              </motion.div>
            ) : filteredFiles.length === 0 && (isSearching || searchFilters.type) ? (
              <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h2 className="text-lg font-display font-bold text-foreground mb-1">No results found</h2>
                  <p className="text-sm text-muted-foreground max-w-xs">Try a different search term or adjust your filters.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {activeNav === "my-storage" && !currentFolderId && !isSearching && filteredFiles.filter((f) => !f.is_folder).length > 0 && (
                  <RecentFiles
                    files={filteredFiles.filter((f) => !f.is_folder)}
                    selectedFile={selectedFile}
                    onFileSelect={setSelectedFile}
                    onOpen={(file) => setPreviewFile(file)}
                    onDownload={handleDownload}
                    onViewAll={() => handleNavClick("recents")}
                  />
                )}
                <FileTable
                  files={filteredFiles} selectedFile={selectedFile}
                  onFileSelect={(f) => setSelectedFile((prev) => (prev?.id === f.id ? null : f))}
                  onFolderOpen={handleFolderOpen} viewMode={viewMode} onViewModeChange={setViewMode}
                  sortField={sortField} onSortChange={setSortField} searchQuery={debouncedSearch}
                  bulkSelected={bulkSelected} onBulkToggle={handleBulkToggle}
                  fileTagMap={fileTagMap}
                  {...fileActions}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {activeNav === "my-storage" && !isSearching && hasFiles && (
            <div className="mt-8">
              <StorageBreakdown files={allFiles} />
            </div>
          )}
        </main>
      </div>

      <PreviewPanel file={selectedFile} onClose={() => setSelectedFile(null)} />

      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} fileName={deleteTarget?.file.name ?? ""} fileSize={deleteTarget?.file.size} onConfirm={confirmDelete} permanent={deleteTarget?.permanent} childCount={deleteChildCount} />
      <CreateFolderDialog open={createFolderOpen} onOpenChange={setCreateFolderOpen} onConfirm={(name) => createFolder.mutate({ name, parentId: currentFolderId })} />
      <MoveFileDialog open={!!moveTarget} onOpenChange={(open) => !open && setMoveTarget(null)} file={moveTarget} allFiles={allFiles} onConfirm={handleMove} />
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
        onShare={(f) => { setPreviewFile(null); setShareFile(f); }}
        onDelete={(f) => { setPreviewFile(null); setDeleteTarget({ file: f as any, permanent: false }); }}
        fileList={filteredFiles}
        onNavigate={(f) => setPreviewFile(f)}
      />
      <UploadDrawer
        open={uploadDrawerOpen}
        onOpenChange={setUploadDrawerOpen}
        onFilesSelected={handleUpload}
        onCreateFolder={() => { setUploadDrawerOpen(false); setCreateFolderOpen(true); }}
        isUploading={uploadFile.isPending}
        uploadTasks={uploadTasks}
        onRetry={handleRetryUpload}
        onCancelTask={(id) => setUploadTasks((prev) => prev.filter((t) => t.id !== id))}
        storageUsedBytes={totalStorageUsed}
        storageLimitBytes={STORAGE_LIMIT}
      />
      <ShareDialog file={shareFile} open={!!shareFile} onOpenChange={(open) => !open && setShareFile(null)} />

      {/* New feature dialogs */}
      <FileVersionsDialog file={versionHistoryFile} open={!!versionHistoryFile} onOpenChange={(open) => !open && setVersionHistoryFile(null)} />
      <UploadVersionDialog file={uploadVersionFile} open={!!uploadVersionFile} onOpenChange={(open) => !open && setUploadVersionFile(null)} />
      <TagFileDialog file={tagFile} open={!!tagFile} onOpenChange={(open) => !open && setTagFile(null)} />
      <CrossWorkspaceCopyDialog
        file={crossWsCopyFile?.file ?? null}
        open={!!crossWsCopyFile}
        onOpenChange={(open) => !open && setCrossWsCopyFile(null)}
        mode={crossWsCopyFile?.mode ?? "copy"}
      />
      <PublishDialog
        open={!!publishFile}
        onOpenChange={(open) => !open && setPublishFile(null)}
        file={publishFile}
      />

      <BottomNavbar activeItem={activeNav} onItemClick={handleNavClick} onUploadClick={() => setUploadDrawerOpen(true)} />
    </div>
  );
};

export default Index;
