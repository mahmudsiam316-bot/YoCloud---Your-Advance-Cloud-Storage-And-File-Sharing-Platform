import { useState, useMemo } from "react";
import { Folder, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { FileItem } from "./RecentFiles";

interface MoveFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileItem | null;
  allFiles: FileItem[];
  onConfirm: (file: FileItem, targetFolderId: string | null) => void;
}

function MoveContent({ file, allFiles, browseFolderId, setBrowseFolderId, onMove, onCancel }: {
  file: FileItem | null;
  allFiles: FileItem[];
  browseFolderId: string | null;
  setBrowseFolderId: (id: string | null) => void;
  onMove: () => void;
  onCancel: () => void;
}) {
  const folders = useMemo(() =>
    allFiles.filter((f) => f.is_folder && !f.is_trashed && f.id !== file?.id && f.parent_id === browseFolderId),
    [allFiles, file, browseFolderId]
  );

  const currentFolder = useMemo(() =>
    browseFolderId ? allFiles.find((f) => f.id === browseFolderId) : null,
    [allFiles, browseFolderId]
  );

  const breadcrumbs: { id: string | null; name: string }[] = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "My storage" }];
    let current = currentFolder;
    const trail: { id: string; name: string }[] = [];
    while (current) {
      trail.unshift({ id: current.id, name: current.name });
      current = current.parent_id ? allFiles.find((f) => f.id === current!.parent_id) : undefined;
    }
    return [...crumbs, ...trail];
  }, [currentFolder, allFiles]);

  return (
    <div className="space-y-3">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id ?? "root"} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            <button
              onClick={() => setBrowseFolderId(crumb.id)}
              className="hover:text-foreground transition-colors"
            >
              {i === 0 ? <Home className="w-3 h-3 inline" /> : null} {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Folder list */}
      <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
        {folders.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No subfolders here</p>
        ) : (
          folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setBrowseFolderId(folder.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-secondary transition-colors border-b border-border last:border-0"
            >
              <Folder className="w-4 h-4 text-primary fill-primary/10" />
              <span className="truncate">{folder.name}</span>
            </button>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={onMove} className="flex-1">Move here</Button>
      </div>
    </div>
  );
}

export function MoveFileDialog({ open, onOpenChange, file, allFiles, onConfirm }: MoveFileDialogProps) {
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleMove = () => {
    if (file) {
      onConfirm(file, browseFolderId);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setBrowseFolderId(null);
  };

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 z-50"
              onClick={handleClose}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => { if (info.offset.y > 100) handleClose(); }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[80vh] overflow-y-auto pb-safe"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 pb-6">
                <h3 className="text-lg font-bold text-foreground text-center mb-1">Move "{file?.name}"</h3>
                <p className="text-xs text-muted-foreground text-center mb-4">Select destination folder</p>
                <MoveContent
                  file={file}
                  allFiles={allFiles}
                  browseFolderId={browseFolderId}
                  setBrowseFolderId={setBrowseFolderId}
                  onMove={handleMove}
                  onCancel={handleClose}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setBrowseFolderId(null); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move "{file?.name}"</DialogTitle>
        </DialogHeader>
        <MoveContent
          file={file}
          allFiles={allFiles}
          browseFolderId={browseFolderId}
          setBrowseFolderId={setBrowseFolderId}
          onMove={handleMove}
          onCancel={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
