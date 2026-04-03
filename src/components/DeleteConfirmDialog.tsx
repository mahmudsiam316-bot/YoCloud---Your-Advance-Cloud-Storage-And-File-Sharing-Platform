import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileSize?: number;
  onConfirm: () => void;
  permanent?: boolean;
  childCount?: number;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

export function DeleteConfirmDialog({ open, onOpenChange, fileName, fileSize, onConfirm, permanent, childCount }: DeleteConfirmDialogProps) {
  let desc = permanent
    ? `"${fileName}" will be permanently deleted. This action cannot be undone.`
    : `"${fileName}" will be moved to trash. You can restore it later.`;

  if (fileSize && fileSize > 0) {
    desc += ` (${formatSize(fileSize)})`;
  }

  if (childCount && childCount > 0) {
    desc += ` This folder contains ${childCount} item${childCount !== 1 ? "s" : ""} that will also be ${permanent ? "deleted" : "trashed"}.`;
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={permanent ? "Delete permanently?" : "Move to trash?"}
      description={desc}
      icon={
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(); onOpenChange(false); }}
            className="flex-1"
          >
            {permanent ? "Delete" : "Move to trash"}
          </Button>
        </>
      }
    >
      {null}
    </ResponsiveDialog>
  );
}
