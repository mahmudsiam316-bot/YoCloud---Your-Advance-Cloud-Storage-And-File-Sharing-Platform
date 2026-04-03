import { useMemo } from "react";
import { ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { FileItem } from "./RecentFiles";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

interface PhotosGridProps {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
  onOpen: (file: FileItem) => void;
}

function PhotoThumbnail({ file, onClick }: { file: FileItem; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    // Use Cloudinary URL if available
    if (file.cloudinary_url) {
      // Add auto-optimization transforms
      const optimizedUrl = file.cloudinary_url.replace("/upload/", "/upload/w_400,h_400,c_fill,q_auto,f_auto/");
      setUrl(optimizedUrl);
      return;
    }
    
    // Fallback to Supabase storage
    supabase.storage.from("user-files").createSignedUrl(file.storage_path, 300).then(({ data }) => {
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [file.storage_path, file.cloudinary_url]);

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary group"
    >
      {!loaded && (
        <Skeleton className="absolute inset-0 rounded-xl" />
      )}
      {url && (
        <img
          src={url}
          alt={file.name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[11px] text-white font-medium truncate">{file.name}</p>
      </div>
    </motion.button>
  );
}

export function PhotosGrid({ files, onFileSelect, onOpen }: PhotosGridProps) {
  const photos = useMemo(
    () => files.filter((f) => f.mime_type.startsWith("image/") && !f.is_trashed),
    [files]
  );

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <ImageIcon className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-display font-bold text-foreground mb-1">No photos yet</h2>
        <p className="text-sm text-muted-foreground">Upload some images to see them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {photos.map((photo) => (
        <PhotoThumbnail key={photo.id} file={photo} onClick={() => onOpen(photo)} />
      ))}
    </div>
  );
}
