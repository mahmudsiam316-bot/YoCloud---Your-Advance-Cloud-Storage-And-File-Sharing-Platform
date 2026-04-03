import { useState, useMemo } from "react";
import { FolderInput, Copy, ArrowRightLeft } from "lucide-react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { FileItem } from "./RecentFiles";

interface CrossWorkspaceCopyDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "copy" | "move";
}

export function CrossWorkspaceCopyDialog({ file, open, onOpenChange, mode }: CrossWorkspaceCopyDialogProps) {
  const { user } = useAuth();
  const { workspaces, currentWorkspace } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const [targetWsId, setTargetWsId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const otherWorkspaces = useMemo(
    () => (workspaces || []).filter((ws) => ws.id !== currentWorkspace?.id),
    [workspaces, currentWorkspace]
  );

  const handleConfirm = async () => {
    if (!file || !targetWsId || !user) return;
    setIsProcessing(true);

    try {
      if (mode === "copy") {
        // Copy: insert a duplicate record in target workspace
        const { error } = await supabase.from("files").insert({
          name: file.name,
          storage_path: file.storage_path,
          cloudinary_url: file.cloudinary_url,
          cloudinary_public_id: file.cloudinary_public_id,
          size: file.size,
          mime_type: file.mime_type,
          is_folder: file.is_folder,
          user_id: user.id,
          workspace_id: targetWsId,
          parent_id: null,
        });
        if (error) throw error;
        toast.success(`"${file.name}" copied to workspace`);
      } else {
        // Move: update workspace_id and reset parent
        const { error } = await supabase
          .from("files")
          .update({ workspace_id: targetWsId, parent_id: null } as any)
          .eq("id", file.id);
        if (error) throw error;
        toast.success(`"${file.name}" moved to workspace`);
      }

      queryClient.invalidateQueries({ queryKey: ["files"] });
      onOpenChange(false);
      setTargetWsId("");
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "copy" ? "Copy to Workspace" : "Move to Workspace"}
      description={`${mode === "copy" ? "Copy" : "Move"} "${file?.name || ""}" to another workspace. The file will appear in the root of the selected workspace.`}
    >
      <div className="space-y-4 p-1">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Select target workspace
          </label>
          <Select value={targetWsId} onValueChange={setTargetWsId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a workspace..." />
            </SelectTrigger>
            <SelectContent>
              {otherWorkspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{ws.type === "personal" ? "👤" : "👥"}</span>
                    {ws.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {otherWorkspaces.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No other workspaces available. Create a team workspace first.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!targetWsId || isProcessing}
          >
            {mode === "copy" ? <Copy className="w-4 h-4 mr-1.5" /> : <ArrowRightLeft className="w-4 h-4 mr-1.5" />}
            {isProcessing ? "Processing..." : mode === "copy" ? "Copy" : "Move"}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
