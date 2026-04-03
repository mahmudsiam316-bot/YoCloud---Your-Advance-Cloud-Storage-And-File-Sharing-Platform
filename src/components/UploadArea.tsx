import { useState, useCallback } from "react";
import { Upload, Plus, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface UploadAreaProps {
  onFilesSelected: (files: File[]) => void;
  storageUsedBytes: number;
  storageLimitBytes: number;
  isUploading?: boolean;
  onCreateFolder?: () => void;
  onOpenUploadDrawer?: () => void;
}

export function UploadArea({ onFilesSelected, storageUsedBytes, storageLimitBytes, isUploading, onCreateFolder, onOpenUploadDrawer }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const isMobile = useIsMobile();

  const checkAndUpload = useCallback((files: File[]) => {
    const totalNewBytes = files.reduce((s, f) => s + f.size, 0);
    if (storageUsedBytes + totalNewBytes > storageLimitBytes) {
      toast.error("Storage limit reached. Upgrade your plan.");
      return;
    }
    onFilesSelected(files);
  }, [onFilesSelected, storageUsedBytes, storageLimitBytes]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) checkAndUpload(files);
  }, [checkAndUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) checkAndUpload(files);
    e.target.value = "";
  };

  const handleUploadClick = () => {
    if (isMobile && onOpenUploadDrawer) {
      onOpenUploadDrawer();
    }
    // On desktop, fall through to the label's native file input click
  };

  return (
    <>
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center"
            onDragOver={handleDrag}
            onDragLeave={handleDragOut}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <Upload className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="text-lg font-display font-bold text-foreground">Drop files to upload</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invisible drag listener */}
      <div
        className="fixed inset-0 z-10 pointer-events-none"
        onDragEnter={handleDragIn}
      />

      {/* Upload & Create buttons */}
      <div className="flex gap-2 w-full md:w-auto">
        {isMobile ? (
          <button
            onClick={handleUploadClick}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground cursor-pointer hover:bg-secondary transition-colors mobile-touch md:min-h-0"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{isUploading ? "Uploading…" : "Upload"}</span>
          </button>
        ) : (
          <label className="flex-1 md:flex-initial">
            <input type="file" multiple className="hidden" onChange={handleFileInput} />
            <div className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground cursor-pointer hover:bg-secondary transition-colors mobile-touch md:min-h-0">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{isUploading ? "Uploading…" : "Upload"}</span>
              {!isUploading && <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </div>
          </label>
        )}
        <button
          onClick={onCreateFolder}
          className="flex-1 md:flex-initial flex items-center justify-center gap-2 h-9 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors mobile-touch md:min-h-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create</span>
        </button>
      </div>
    </>
  );
}
