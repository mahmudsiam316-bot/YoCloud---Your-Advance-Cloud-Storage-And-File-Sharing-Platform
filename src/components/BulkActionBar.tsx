import { useState } from "react";
import { Trash2, RotateCcw, FolderInput, Star, StarOff, Download, Link2, Tag, CheckSquare, Square, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { useTags, useBulkTagFiles } from "@/hooks/useTags";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/components/RecentFiles";

interface BulkActionBarProps {
  selectedFiles: FileItem[];
  allFiles: FileItem[];
  onClearSelection: () => void;
  onBulkTrash: (files: FileItem[]) => void;
  onBulkRestore: (files: FileItem[]) => void;
  onBulkDelete: (files: FileItem[]) => void;
  onBulkStar: (files: FileItem[], star: boolean) => void;
  onBulkMove: (files: FileItem[]) => void;
  onBulkDownload: (files: FileItem[]) => void;
  onBulkShare: (files: FileItem[]) => void;
  isTrashView?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

export function BulkActionBar({
  selectedFiles,
  onClearSelection,
  onBulkTrash,
  onBulkRestore,
  onBulkDelete,
  onBulkStar,
  onBulkMove,
  onBulkDownload,
  onBulkShare,
  isTrashView,
}: BulkActionBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"trash" | "delete">("trash");
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const { data: tags } = useTags();
  const bulkTag = useBulkTagFiles();

  if (selectedFiles.length === 0) return null;

  const totalSize = selectedFiles.reduce((s, f) => s + (f.size || 0), 0);
  const allStarred = selectedFiles.every((f) => f.is_starred);
  const downloadableFiles = selectedFiles.filter((f) => !f.is_folder);

  const handleConfirm = () => {
    if (confirmAction === "delete") onBulkDelete(selectedFiles);
    else onBulkTrash(selectedFiles);
    onClearSelection();
    setConfirmOpen(false);
  };

  return (
    <>
      <div className="sticky top-14 z-20 flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl mb-4 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <button onClick={onClearSelection} className="p-1 rounded hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground">
            {selectedFiles.length} selected
          </span>
          <span className="text-xs text-muted-foreground font-mono-data">
            {formatSize(totalSize)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {isTrashView ? (
            <>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { onBulkRestore(selectedFiles); onClearSelection(); }}>
                <RotateCcw className="w-3.5 h-3.5" /> Restore
              </Button>
              <Button size="sm" variant="destructive" className="h-8 gap-1.5" onClick={() => { setConfirmAction("delete"); setConfirmOpen(true); }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onBulkStar(selectedFiles, !allStarred)}>
                {allStarred ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                {allStarred ? "Unstar" : "Star"}
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { onBulkMove(selectedFiles); onClearSelection(); }}>
                <FolderInput className="w-3.5 h-3.5" /> Move
              </Button>
              {downloadableFiles.length > 0 && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onBulkDownload(downloadableFiles)}>
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { onBulkShare(selectedFiles); }}>
                <Link2 className="w-3.5 h-3.5" /> Share
              </Button>

              {/* Tag dropdown */}
              <div className="relative">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setTagMenuOpen(!tagMenuOpen)}>
                  <Tag className="w-3.5 h-3.5" /> Tag
                </Button>
                {tagMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setTagMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-40 p-1">
                      {(tags ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">No tags created</p>
                      ) : (
                        (tags ?? []).map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => {
                              bulkTag.mutate({ fileIds: selectedFiles.map((f) => f.id), tagId: tag.id });
                              setTagMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-left text-sm"
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              <Button size="sm" variant="destructive" className="h-8 gap-1.5" onClick={() => { setConfirmAction("trash"); setConfirmOpen(true); }}>
                <Trash2 className="w-3.5 h-3.5" /> Trash
              </Button>
            </>
          )}
        </div>
      </div>

      <ResponsiveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction === "delete" ? "Delete permanently?" : "Move to trash?"}
        description={
          confirmAction === "delete"
            ? `Permanently delete ${selectedFiles.length} item(s) (${formatSize(totalSize)}). This cannot be undone.`
            : `Move ${selectedFiles.length} item(s) to trash?`
        }
        icon={
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleConfirm} className="flex-1">
              {confirmAction === "delete" ? "Delete" : "Move to trash"}
            </Button>
          </>
        }
      >
        {null}
      </ResponsiveDialog>
    </>
  );
}
