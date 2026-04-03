import { Upload, CloudUpload, FolderPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface EmptyStateProps {
  onFilesSelected: (files: File[]) => void;
  onCreateFolder: () => void;
  onOpenUploadDrawer?: () => void;
}

export function EmptyState({ onFilesSelected, onCreateFolder, onOpenUploadDrawer }: EmptyStateProps) {
  const isMobile = useIsMobile();

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFilesSelected(files);
  };

  const handleUploadClick = () => {
    if (isMobile && onOpenUploadDrawer) {
      onOpenUploadDrawer();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
        className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6"
      >
        <CloudUpload className="w-10 h-10 text-primary" />
      </motion.div>

      <h2 className="text-lg font-display font-bold text-foreground mb-2">
        No files uploaded yet
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-8">
        Upload your first file or create a folder to get started.
      </p>

      <div className="flex gap-3">
        {isMobile ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleUploadClick}
            className="flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:bg-primary/90 transition-colors mobile-touch"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </motion.button>
        ) : (
          <label className="cursor-pointer">
            <input type="file" multiple className="hidden" onChange={handleFileInput} />
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:bg-primary/90 transition-colors mobile-touch"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </motion.div>
          </label>
        )}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreateFolder}
          className="flex items-center gap-2 h-11 px-6 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-secondary transition-colors mobile-touch"
        >
          <FolderPlus className="w-4 h-4" />
          Create Folder
        </motion.button>
      </div>
    </motion.div>
  );
}
