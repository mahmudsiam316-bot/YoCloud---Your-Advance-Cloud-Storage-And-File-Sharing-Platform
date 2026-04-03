import { Upload, Trash2, Pencil, FolderInput, Star, FolderPlus, RotateCcw, Clock } from "lucide-react";
import { useActivityLog } from "@/hooks/useFiles";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_META: Record<string, { icon: typeof Upload; label: string }> = {
  upload: { icon: Upload, label: "Uploaded" },
  delete: { icon: Trash2, label: "Deleted" },
  rename: { icon: Pencil, label: "Renamed" },
  move: { icon: FolderInput, label: "Moved" },
  star: { icon: Star, label: "Starred" },
  unstar: { icon: Star, label: "Unstarred" },
  trash: { icon: Trash2, label: "Trashed" },
  restore: { icon: RotateCcw, label: "Restored" },
  create_folder: { icon: FolderPlus, label: "Created folder" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityPanel() {
  const { data: logs, isLoading } = useActivityLog();

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-foreground px-1 mb-3 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Recent Activity
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : !logs || logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
      ) : (
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {logs.slice(0, 20).map((log) => {
            const meta = ACTION_META[log.action] ?? { icon: Clock, label: log.action };
            const Icon = meta.icon;
            return (
              <div key={log.id} className="flex items-start gap-2.5 px-1 py-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-tight">
                    <span className="font-medium">{meta.label}</span>{" "}
                    <span className="text-muted-foreground truncate">{log.file_name}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono-data mt-0.5">{timeAgo(log.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
