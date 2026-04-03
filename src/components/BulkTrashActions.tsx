import { useState } from "react";
import { Trash2, RotateCcw, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import type { FileItem } from "@/components/RecentFiles";

interface BulkTrashActionsProps {
  trashedFiles: FileItem[];
  onBulkDelete: (files: FileItem[]) => void;
  onBulkRestore: (files: FileItem[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

export function BulkTrashActions({ trashedFiles, onBulkDelete, onBulkRestore }: BulkTrashActionsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"delete" | "restore">("delete");

  const toggleAll = () => {
    if (selected.size === trashedFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(trashedFiles.map((f) => f.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedFiles = trashedFiles.filter((f) => selected.has(f.id));
  const totalSize = selectedFiles.reduce((s, f) => s + (f.size || 0), 0);
  const allSelected = selected.size === trashedFiles.length && trashedFiles.length > 0;

  const handleConfirm = () => {
    if (confirmAction === "delete") {
      onBulkDelete(selectedFiles);
    } else {
      onBulkRestore(selectedFiles);
    }
    setSelected(new Set());
    setConfirmOpen(false);
  };

  if (trashedFiles.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 mb-4 p-3 bg-secondary/50 rounded-xl border border-border">
        <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
          <span className="font-medium">{allSelected ? "Deselect all" : "Select all"}</span>
        </button>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground font-mono-data">
              {selected.size} selected · {formatSize(totalSize)}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setConfirmAction("restore"); setConfirmOpen(true); }}
              className="h-8 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restore
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => { setConfirmAction("delete"); setConfirmOpen(true); }}
              className="h-8 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* File list with checkboxes */}
      <div className="space-y-1">
        {trashedFiles.map((file) => (
          <div
            key={file.id}
            onClick={() => toggleOne(file.id)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <Checkbox
              checked={selected.has(file.id)}
              onCheckedChange={() => toggleOne(file.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground font-mono-data">
                {file.is_folder ? "Folder" : formatSize(file.size)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <ResponsiveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction === "delete" ? "Delete permanently?" : "Restore items?"}
        description={
          confirmAction === "delete"
            ? `You are about to permanently delete ${selected.size} item${selected.size !== 1 ? "s" : ""} (${formatSize(totalSize)}). This action cannot be undone.`
            : `Restore ${selected.size} item${selected.size !== 1 ? "s" : ""} back to your files?`
        }
        icon={
          confirmAction === "delete" ? (
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-primary" />
            </div>
          )
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={handleConfirm}
              className="flex-1"
            >
              {confirmAction === "delete" ? `Delete ${selected.size} items` : `Restore ${selected.size} items`}
            </Button>
          </>
        }
      >
        {null}
      </ResponsiveDialog>
    </>
  );
}
