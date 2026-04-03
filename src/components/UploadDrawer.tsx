import { useState, useRef } from "react";
import { Upload, X, FileIcon, ImageIcon, Video, FileText, Loader2, CheckCircle2, AlertCircle, RotateCcw, Plus, FolderPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UploadTask } from "@/components/UploadProgressDrawer";

interface UploadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (files: File[]) => void;
  onCreateFolder?: () => void;
  isUploading?: boolean;
  uploadTasks: UploadTask[];
  onRetry?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
  storageUsedBytes: number;
  storageLimitBytes: number;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Video;
  if (type.includes("pdf") || type.includes("document") || type.includes("text")) return FileText;
  return FileIcon;
}

export function UploadDrawer({
  open,
  onOpenChange,
  onFilesSelected,
  onCreateFolder,
  isUploading,
  uploadTasks,
  onRetry,
  onCancelTask,
  storageUsedBytes,
  storageLimitBytes,
}: UploadDrawerProps) {
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasActiveTasks = uploadTasks.some((t) => t.status === "uploading" || t.status === "pending");
  const showTasks = uploadTasks.length > 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setStagedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeStaged = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (stagedFiles.length === 0) return;
    onFilesSelected(stagedFiles);
    setStagedFiles([]);
  };

  const handleClose = (val: boolean) => {
    if (!val && !hasActiveTasks) {
      setStagedFiles([]);
    }
    onOpenChange(val);
  };

  const totalStagedSize = stagedFiles.reduce((s, f) => s + f.size, 0);
  const storageAfter = storageUsedBytes + totalStagedSize;
  const wouldExceed = storageAfter > storageLimitBytes;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base font-display">Upload Files</DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground">
            Select files to upload to your storage
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 flex flex-col gap-3">
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={hasActiveTasks}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Select Files
            </Button>
            {onCreateFolder && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  onCreateFolder();
                }}
              >
                <FolderPlus className="w-4 h-4 mr-1.5" />
                New Folder
              </Button>
            )}
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

          {/* Staged files list */}
          {stagedFiles.length > 0 && !showTasks && (
            <div className="bg-secondary/50 rounded-lg border border-border">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  {stagedFiles.length} file{stagedFiles.length !== 1 ? "s" : ""} selected
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatSize(totalStagedSize)}
                </span>
              </div>
              <ScrollArea className="max-h-48">
                <div className="divide-y divide-border">
                  {stagedFiles.map((file, i) => {
                    const Icon = getFileIcon(file.type);
                    return (
                      <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
                        </div>
                        <button
                          onClick={() => removeStaged(i)}
                          className="p-1 rounded-md hover:bg-secondary text-muted-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Upload tasks (active/completed) */}
          {showTasks && (
            <div className="bg-secondary/50 rounded-lg border border-border">
              <div className="px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-foreground">
                  {hasActiveTasks
                    ? `Uploading ${uploadTasks.filter((t) => t.status === "uploading" || t.status === "pending").length} file(s)…`
                    : `${uploadTasks.filter((t) => t.status === "done").length} uploaded`}
                </span>
              </div>
              <ScrollArea className="max-h-48">
                <div className="divide-y divide-border">
                  {uploadTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2">
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
                          <span className="text-[10px] text-muted-foreground w-10 text-right">
                            {task.status === "done"
                              ? "Done"
                              : task.status === "error"
                              ? "Failed"
                              : `${task.progress}%`}
                          </span>
                        </div>
                        {task.status === "error" && task.error && (
                          <p className="text-[10px] text-destructive mt-0.5 truncate">{task.error}</p>
                        )}
                      </div>
                      {task.status === "error" && onRetry && (
                        <button onClick={() => onRetry(task.id)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(task.status === "pending" || task.status === "uploading") && onCancelTask && (
                        <button onClick={() => onCancelTask(task.id)} className="text-[10px] text-muted-foreground hover:text-destructive">
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Upload button */}
          {stagedFiles.length > 0 && !showTasks && (
            <Button
              onClick={handleUpload}
              disabled={wouldExceed || hasActiveTasks}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {wouldExceed ? "Storage limit exceeded" : `Upload ${stagedFiles.length} file${stagedFiles.length !== 1 ? "s" : ""}`}
            </Button>
          )}

          {/* Empty state */}
          {stagedFiles.length === 0 && !showTasks && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <Upload className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Tap to select files</span>
              <span className="text-[10px] mt-1">Max 100MB per file</span>
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
