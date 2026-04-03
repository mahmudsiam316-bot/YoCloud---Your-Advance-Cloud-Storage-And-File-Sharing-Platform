import { useState } from "react";
import { Tag, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { useTags, useCreateTag, useDeleteTag, useToggleFileTag, useFileTags, TAG_COLORS, type Tag as TagType } from "@/hooks/useTags";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/components/RecentFiles";

export function TagBadge({ tag, size = "sm", onRemove }: { tag: TagType; size?: "sm" | "xs"; onRemove?: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0 text-[10px]"
      )}
      style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}40` }}
    >
      {tag.name}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hover:opacity-70">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

interface TagFileDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagFileDialog({ file, open, onOpenChange }: TagFileDialogProps) {
  const { data: tags } = useTags();
  const { data: fileTags } = useFileTags();
  const toggleTag = useToggleFileTag();
  const createTag = useCreateTag();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showCreate, setShowCreate] = useState(false);

  const fileTagIds = new Set(
    (fileTags ?? []).filter((ft) => ft.file_id === file?.id).map((ft) => ft.tag_id)
  );

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTag.mutate({ name: newTagName.trim(), color: newTagColor }, {
      onSuccess: () => { setNewTagName(""); setShowCreate(false); },
    });
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Manage Tags"
      description={file ? `Add or remove tags for "${file.name}"` : ""}
      icon={
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Tag className="w-6 h-6 text-primary" />
        </div>
      }
    >
      <div className="space-y-3">
        {(tags ?? []).length === 0 && !showCreate && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tags yet. Create your first tag!
          </p>
        )}

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {(tags ?? []).map((tag) => (
            <button
              key={tag.id}
              onClick={() => file && toggleTag.mutate({ fileId: file.id, tagId: tag.id })}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left",
                fileTagIds.has(tag.id) ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary border border-transparent"
              )}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-sm font-medium text-foreground flex-1">{tag.name}</span>
              {fileTagIds.has(tag.id) && (
                <span className="text-xs text-primary font-medium">✓</span>
              )}
            </button>
          ))}
        </div>

        {showCreate ? (
          <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
            />
            <div className="flex gap-1.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className={cn("w-6 h-6 rounded-full transition-transform", newTagColor === c && "ring-2 ring-offset-2 ring-foreground scale-110")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim() || createTag.isPending} className="flex-1">
                {createTag.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="w-full gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New tag
          </Button>
        )}
      </div>
    </ResponsiveDialog>
  );
}

export function ManageTagsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: tags } = useTags();
  const deleteTag = useDeleteTag();
  const createTag = useCreateTag();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Manage Tags"
      description="Create, edit or delete your tags"
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag name"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTagName.trim()) {
                createTag.mutate({ name: newTagName.trim(), color: newTagColor }, {
                  onSuccess: () => setNewTagName(""),
                });
              }
            }}
          />
          <div className="flex gap-1">
            {TAG_COLORS.slice(0, 4).map((c) => (
              <button
                key={c}
                onClick={() => setNewTagColor(c)}
                className={cn("w-7 h-7 rounded-full shrink-0", newTagColor === c && "ring-2 ring-offset-1 ring-foreground")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1 max-h-60 overflow-y-auto">
          {(tags ?? []).map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="text-sm font-medium text-foreground flex-1">{tag.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteTag.mutate(tag.id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
