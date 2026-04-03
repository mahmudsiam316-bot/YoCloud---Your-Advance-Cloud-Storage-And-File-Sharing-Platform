import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { FileTypeIcon } from "./FileTypeIcon";

export interface FileItem {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  is_starred: boolean;
  is_trashed: boolean;
  is_folder: boolean;
  parent_id: string | null;
  created_at: string;
  storage_path: string;
  cloudinary_url?: string | null;
  cloudinary_public_id?: string | null;
  user_id?: string;
}

interface RecentFilesProps {
  files: FileItem[];
  selectedFile: FileItem | null;
  onFileSelect: (file: FileItem) => void;
  onOpen?: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  onViewAll?: () => void;
}

function isImageFile(mime: string): boolean {
  return mime?.startsWith("image/");
}

function RecentCard({ file, isSelected, onFileSelect }: {
  file: FileItem;
  isSelected: boolean;
  onFileSelect: (file: FileItem) => void;
}) {
  const hasThumb = isImageFile(file.mime_type) && file.cloudinary_url;

  return (
    <button
      onClick={() => onFileSelect(file)}
      className={cn(
        "w-full rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border hover:border-primary/30"
      )}
    >
      {hasThumb ? (
        <div className="w-full h-[100px] overflow-hidden">
          <img
            src={file.cloudinary_url!.replace("/upload/", "/upload/w_300,h_200,c_fill,q_auto,f_auto/")}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-full h-[100px] flex items-center justify-center bg-secondary/30">
          <FileTypeIcon
            name={file.name}
            mime={file.mime_type}
            isFolder={file.is_folder}
            size={52}
          />
        </div>
      )}

      <div className="w-full px-2.5 py-2 border-t border-border/40">
        <p className="text-[11px] font-medium text-foreground truncate leading-tight text-left">
          {file.name}
        </p>
      </div>
    </button>
  );
}

export function RecentFiles({ files, selectedFile, onFileSelect, onOpen, onDownload, onViewAll }: RecentFilesProps) {
  const recentFiles = files.slice(0, 12);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [recentFiles.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Recent files</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={cn(
                "w-7 h-7 rounded-full border border-border flex items-center justify-center transition-all",
                canScrollLeft ? "hover:bg-secondary text-foreground" : "text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={cn(
                "w-7 h-7 rounded-full border border-border flex items-center justify-center transition-all",
                canScrollRight ? "hover:bg-secondary text-foreground" : "text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {recentFiles.map((file) => (
          <div
            key={file.id}
            className="shrink-0"
            style={{ width: "clamp(7.5rem, 28vw, 10rem)" }}
          >
            <RecentCard
              file={file}
              isSelected={selectedFile?.id === file.id}
              onFileSelect={onFileSelect}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
