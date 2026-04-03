import { X, CheckCircle2, Loader2, AlertCircle, FileArchive, FolderArchive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export interface ZipFileTask {
  id: string;
  name: string;
  path: string;
  size: number;
  status: "pending" | "downloading" | "done" | "error";
}

export interface ZipProgress {
  visible: boolean;
  folderName: string;
  files: ZipFileTask[];
  phase: "collecting" | "downloading" | "zipping" | "done" | "error";
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

interface ZipProgressTrackerProps {
  progress: ZipProgress;
  onClose: () => void;
}

function ProgressContent({ progress, onClose }: ZipProgressTrackerProps) {
  const doneCount = progress.files.filter(f => f.status === "done").length;
  const totalCount = progress.files.length;
  const errorCount = progress.files.filter(f => f.status === "error").length;
  const currentFile = progress.files.find(f => f.status === "downloading");
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const phaseLabel = () => {
    switch (progress.phase) {
      case "collecting": return "Scanning folder structure...";
      case "downloading": return `Processing ${doneCount}/${totalCount} files`;
      case "zipping": return "Creating ZIP archive...";
      case "done": return errorCount > 0 ? `Done — ${errorCount} file(s) skipped` : "ZIP download complete!";
      case "error": return progress.error || "Failed to create ZIP";
    }
  };

  const phaseIcon = () => {
    switch (progress.phase) {
      case "done": return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case "error": return <AlertCircle className="w-5 h-5 text-destructive" />;
      default: return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <FolderArchive className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {progress.folderName}.zip
            </p>
            <p className="text-[11px] text-muted-foreground">{phaseLabel()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {phaseIcon()}
          {(progress.phase === "done" || progress.phase === "error") && (
            <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress.phase !== "collecting" && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">
              {progress.phase === "zipping" ? "Compressing..." : progress.phase === "done" ? "Complete" : `${percent}%`}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {doneCount}/{totalCount} files
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${progress.phase === "error" ? "bg-destructive" : progress.phase === "done" ? "bg-primary" : "bg-primary"}`}
              initial={{ width: 0 }}
              animate={{
                width: progress.phase === "zipping" || progress.phase === "done" ? "100%" : `${percent}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* File list */}
      <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
        {progress.phase === "collecting" ? (
          <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Scanning files...
          </div>
        ) : (
          progress.files.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5 px-4 py-2">
              {f.status === "done" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : f.status === "error" ? (
                <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
              ) : f.status === "downloading" ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
              ) : (
                <FileArchive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground truncate">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">{f.path} · {formatSize(f.size)}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {f.status === "done" ? "✓" : f.status === "error" ? "✗" : f.status === "downloading" ? "..." : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ZipProgressTracker({ progress, onClose }: ZipProgressTrackerProps) {
  const isMobile = useIsMobile();

  if (!progress.visible) return null;

  // Mobile: Drawer
  if (isMobile) {
    return (
      <Drawer open={progress.visible} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Download Progress</DrawerTitle>
          </DrawerHeader>
          <ProgressContent progress={progress} onClose={onClose} />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Bottom-right popup
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed bottom-4 right-4 w-96 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
      >
        <ProgressContent progress={progress} onClose={onClose} />
      </motion.div>
    </AnimatePresence>
  );
}
