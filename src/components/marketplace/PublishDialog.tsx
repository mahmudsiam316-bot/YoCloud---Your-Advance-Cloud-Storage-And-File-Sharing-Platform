import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Eye, Globe, Link2, Tag, Folder, FileText, Image as ImageIcon, Video, Music } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMarketplaceCategories, usePublishToMarketplace } from "@/hooks/useMarketplace";
import { getCloudinaryUrl } from "@/hooks/useCloudinary";
import { cn } from "@/lib/utils";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: any;
}

function getFileTypeIcon(mime: string | null) {
  if (!mime) return FileText;
  if (mime.startsWith("image")) return ImageIcon;
  if (mime.startsWith("video")) return Video;
  if (mime.startsWith("audio")) return Music;
  return FileText;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

export function PublishDialog({ open, onOpenChange, file }: PublishDialogProps) {
  const isMobile = useIsMobile();
  const { data: categories } = useMarketplaceCategories();
  const publishMutation = usePublishToMarketplace();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (file && open) {
      setTitle(file.name?.replace(/\.[^.]+$/, "") || "");
      setDescription("");
      setCategoryId("");
      setVisibility("public");
      setTags([]);
      setTagInput("");
      // Auto-detect category
      const mime = file.mime_type || "";
      if (mime.startsWith("image")) {
        const imgCat = categories?.find(c => c.name === "Images");
        if (imgCat) setCategoryId(imgCat.id);
      } else if (mime.startsWith("video")) {
        const vidCat = categories?.find(c => c.name === "Videos");
        if (vidCat) setCategoryId(vidCat.id);
      } else if (mime.startsWith("audio")) {
        const audCat = categories?.find(c => c.name === "Audio");
        if (audCat) setCategoryId(audCat.id);
      } else if (mime.includes("pdf") || mime.includes("document") || mime.includes("text")) {
        const docCat = categories?.find(c => c.name === "Documents");
        if (docCat) setCategoryId(docCat.id);
      }
    }
  }, [file, open, categories]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await publishMutation.mutateAsync({
      fileId: file.id,
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId: categoryId || undefined,
      visibility,
      thumbnailUrl: file.cloudinary_url ? getCloudinaryUrl(file.cloudinary_url, { width: 400, height: 300 }) || undefined : undefined,
      tags,
    });
    onOpenChange(false);
  };

  const FileTypeIcon = getFileTypeIcon(file?.mime_type);
  const previewUrl = file?.cloudinary_url && file?.mime_type?.startsWith("image")
    ? getCloudinaryUrl(file.cloudinary_url, { width: 400, height: 240 })
    : null;

  const content = (
    <div className="space-y-5">
      {/* File preview */}
      <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-28 flex items-center justify-center bg-secondary/50">
            <FileTypeIcon className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="px-3 py-2.5 flex items-center gap-2 text-sm">
          <FileTypeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate font-medium text-foreground">{file?.name}</span>
          <span className="text-muted-foreground text-xs ml-auto">{formatSize(file?.size)}</span>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Title *</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your file a catchy title" maxLength={120} />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Description</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what this file is about... (Markdown supported)" rows={3} maxLength={2000} />
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Category</label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {categories?.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Tags</label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="Add tag..."
            maxLength={30}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          />
          <Button variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
            <Tag className="w-3.5 h-3.5" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs cursor-pointer" onClick={() => setTags(tags.filter(t => t !== tag))}>
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Visibility */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Visibility</label>
        <div className="flex gap-2">
          <button
            onClick={() => setVisibility("public")}
            className={cn("flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
              visibility === "public" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            <Globe className="w-4 h-4" /> Public
          </button>
          <button
            onClick={() => setVisibility("unlisted")}
            className={cn("flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
              visibility === "unlisted" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            <Link2 className="w-4 h-4" /> Unlisted
          </button>
        </div>
      </div>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={!title.trim() || publishMutation.isPending} className="w-full">
        {publishMutation.isPending ? "Publishing..." : "Publish to Marketplace"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/50 z-50" onClick={() => onOpenChange(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => { if (info.offset.y > 100) onOpenChange(false); }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[90vh] overflow-y-auto pb-safe"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
              <div className="px-5 pb-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" /> Publish to Marketplace
                </h3>
                {content}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Publish to Marketplace
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
