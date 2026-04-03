import { X, CheckCircle2, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface UploadProgressDrawerProps {
  tasks: UploadTask[];
  onClose: () => void;
  onCancel: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

export function UploadProgressDrawer({ tasks, onClose, onCancel, onRetry }: UploadProgressDrawerProps) {
  if (tasks.length === 0) return null;

  const allDone = tasks.every((t) => t.status === "done" || t.status === "error");
  const activeCount = tasks.filter((t) => t.status === "uploading" || t.status === "pending").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const errorCount = tasks.filter((t) => t.status === "error").length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-40 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {allDone
                ? errorCount > 0
                  ? `${doneCount} uploaded, ${errorCount} failed`
                  : "All uploads complete"
                : `Uploading ${activeCount} file${activeCount !== 1 ? "s" : ""}…`}
            </p>
            {!allDone && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {doneCount}/{tasks.length} complete
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-48 overflow-y-auto divide-y divide-border">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
              {task.status === "done" ? (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              ) : task.status === "error" ? (
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{task.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${task.status === "error" ? "bg-destructive" : "bg-primary"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono-data w-12 text-right">
                    {task.status === "done" ? formatSize(task.file.size) : task.status === "error" ? "Failed" : `${task.progress}%`}
                  </span>
                </div>
                {task.status === "error" && task.error && (
                  <p className="text-[10px] text-destructive mt-0.5 truncate">{task.error}</p>
                )}
              </div>
              {task.status === "error" && onRetry && (
                <button onClick={() => onRetry(task.id)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground" title="Retry">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              {(task.status === "pending" || task.status === "uploading") && (
                <button onClick={() => onCancel(task.id)} className="text-xs text-muted-foreground hover:text-destructive">
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
