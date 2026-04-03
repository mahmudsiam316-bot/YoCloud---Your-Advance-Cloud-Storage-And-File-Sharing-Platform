import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
}

export function CreateFolderDialog({ open, onOpenChange, onConfirm }: CreateFolderDialogProps) {
  const [name, setName] = useState("New folder");

  const handleCreate = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      onOpenChange(false);
      setName("New folder");
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => { onOpenChange(v); if (!v) setName("New folder"); }}
      title="Create folder"
      icon={
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FolderPlus className="w-6 h-6 text-primary" />
        </div>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleCreate} className="flex-1">Create</Button>
        </>
      }
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        autoFocus
        onFocus={(e) => e.target.select()}
      />
    </ResponsiveDialog>
  );
}
