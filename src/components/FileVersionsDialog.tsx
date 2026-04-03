import { useState } from "react";
import { History, RotateCcw, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { useFileVersions, useRestoreVersion, type FileVersion } from "@/hooks/useVersions";
import type { FileItem } from "@/components/RecentFiles";

interface FileVersionsDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function FileVersionsDialog({ file, open, onOpenChange }: FileVersionsDialogProps) {
  const { data: versions, isLoading } = useFileVersions(file?.id ?? null);
  const restoreVersion = useRestoreVersion();

  const handleRestore = (version: FileVersion) => {
    if (!file) return;
    restoreVersion.mutate({ fileId: file.id, version }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Version History"
      description={file ? `Versions of "${file.name}"` : ""}
      icon={
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <History className="w-6 h-6 text-primary" />
        </div>
      }
    >
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {/* Current version */}
        {file && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Current version</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(file.size)} · Now
              </p>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (!versions || versions.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No previous versions available
          </p>
        )}

        {versions?.map((v) => (
          <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Version {v.version_number}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(v.size)} · {formatDate(v.uploaded_at)}
              </p>
            </div>
            <div className="flex gap-1">
              {v.cloudinary_url && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => window.open(v.cloudinary_url!, "_blank")}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={() => handleRestore(v)}
                disabled={restoreVersion.isPending}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ResponsiveDialog>
  );
}
