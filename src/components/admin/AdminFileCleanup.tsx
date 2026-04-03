import { useState, useMemo } from "react";
import { Trash2, AlertTriangle, FileIcon, Clock, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  allFiles: any[];
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function AdminFileCleanup({ allFiles }: Props) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const trashedFiles = useMemo(() =>
    (allFiles ?? []).filter((f: any) => f.is_trashed),
    [allFiles]
  );

  const oldTrashedFiles = useMemo(() =>
    trashedFiles.filter((f: any) => {
      const days = (Date.now() - new Date(f.updated_at).getTime()) / 86400000;
      return days > 30;
    }),
    [trashedFiles]
  );

  const emptyFolders = useMemo(() => {
    const folderIds = new Set((allFiles ?? []).filter((f: any) => f.is_folder).map((f: any) => f.id));
    const parentIds = new Set((allFiles ?? []).filter((f: any) => f.parent_id).map((f: any) => f.parent_id));
    return (allFiles ?? []).filter((f: any) => f.is_folder && !parentIds.has(f.id));
  }, [allFiles]);

  const trashedSize = useMemo(() =>
    trashedFiles.reduce((s: number, f: any) => s + (f.size || 0), 0),
    [trashedFiles]
  );

  const oldTrashedSize = useMemo(() =>
    oldTrashedFiles.reduce((s: number, f: any) => s + (f.size || 0), 0),
    [oldTrashedFiles]
  );

  const handleBulkDelete = async (files: any[], label: string) => {
    if (files.length === 0) return;
    setDeleting(true);
    try {
      const storagePaths = files.filter((f: any) => !f.is_folder && f.storage_path).map((f: any) => f.storage_path);
      if (storagePaths.length > 0) {
        await supabase.storage.from("user-files").remove(storagePaths);
      }
      const ids = files.map((f: any) => f.id);
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error } = await supabase.from("files").delete().in("id", batch);
        if (error) throw error;
      }
      if (currentUser) {
        await supabase.from("admin_action_logs").insert({
          admin_id: currentUser.id,
          action: "bulk_cleanup",
          details: { type: label, count: files.length, size_freed: files.reduce((s: number, f: any) => s + (f.size || 0), 0) },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin_files"] });
      toast.success(`${files.length} ${label} deleted successfully`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Trash2 className="w-4.5 h-4.5 text-destructive" />
          Bulk File Cleanup
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Identify and remove orphaned files, old trashed items, and empty folders to reclaim storage space.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Files in trash for over 30 days are prime candidates for permanent deletion. Empty folders create clutter without consuming storage.
          All cleanup actions are logged in the admin audit trail for accountability.
        </p>
      </div>

      {/* Cleanup cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* All trashed */}
        <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">All Trashed Files</p>
              <p className="text-[10px] text-muted-foreground">{trashedFiles.length} files · {formatSize(trashedSize)}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Permanently delete all files currently in trash across all users. This action cannot be undone.
          </p>
          <Button size="sm" variant="destructive" className="w-full h-8 text-xs gap-1.5"
            disabled={deleting || trashedFiles.length === 0}
            onClick={() => handleBulkDelete(trashedFiles, "trashed files")}>
            <Trash2 className="w-3 h-3" /> Delete All ({trashedFiles.length})
          </Button>
        </div>

        {/* Old trashed (>30 days) */}
        <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-chart-3/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-chart-3" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Old Trashed (30+ days)</p>
              <p className="text-[10px] text-muted-foreground">{oldTrashedFiles.length} files · {formatSize(oldTrashedSize)}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Files that have been in trash for more than 30 days. Users are unlikely to recover these.
          </p>
          <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
            disabled={deleting || oldTrashedFiles.length === 0}
            onClick={() => handleBulkDelete(oldTrashedFiles, "old trashed files")}>
            <Trash2 className="w-3 h-3" /> Clean Up ({oldTrashedFiles.length})
          </Button>
        </div>

        {/* Empty folders */}
        <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-chart-1/10 flex items-center justify-center">
              <FileIcon className="w-4 h-4 text-chart-1" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Empty Folders</p>
              <p className="text-[10px] text-muted-foreground">{emptyFolders.length} folders · 0 B</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Folders with no files inside. Removing these helps keep directory structures clean.
          </p>
          <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5"
            disabled={deleting || emptyFolders.length === 0}
            onClick={() => handleBulkDelete(emptyFolders, "empty folders")}>
            <Trash2 className="w-3 h-3" /> Remove ({emptyFolders.length})
          </Button>
        </div>
      </div>

      {/* Trashed file list */}
      {trashedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground">Trashed Files Preview</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {trashedFiles.slice(0, 50).map((f: any) => (
              <div key={f.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                <FileIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-foreground truncate">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatSize(f.size || 0)} · Trashed {timeAgo(f.updated_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
