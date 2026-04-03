import { useRef, useEffect, useState, useCallback } from "react";
import { FileText, Folder, Image, Video, Music, Archive, X, Search, Loader2, ArrowUp, ArrowDown, CornerDownLeft } from "lucide-react";
import { useCrossWorkspaceSearch } from "@/hooks/useCrossWorkspaceSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CrossWorkspaceSearchProps {
  query: string;
  open: boolean;
  onClose: () => void;
  onFileSelect?: (file: any) => void;
}

function getFileIcon(mimeType: string | null, isFolder: boolean) {
  if (isFolder) return <Folder className="w-4 h-4 text-primary" />;
  if (!mimeType) return <FileText className="w-4 h-4 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-emerald-500" />;
  if (mimeType.startsWith("video/")) return <Video className="w-4 h-4 text-violet-500" />;
  if (mimeType.startsWith("audio/")) return <Music className="w-4 h-4 text-amber-500" />;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return <Archive className="w-4 h-4 text-yellow-500" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

function getFileTypeBadge(mimeType: string | null, isFolder: boolean) {
  if (isFolder) return { label: "Folder", className: "bg-primary/10 text-primary" };
  if (!mimeType) return { label: "File", className: "bg-muted text-muted-foreground" };
  if (mimeType.startsWith("image/")) return { label: "Image", className: "bg-emerald-500/10 text-emerald-600" };
  if (mimeType.startsWith("video/")) return { label: "Video", className: "bg-violet-500/10 text-violet-600" };
  if (mimeType.startsWith("audio/")) return { label: "Audio", className: "bg-amber-500/10 text-amber-600" };
  if (mimeType.includes("pdf")) return { label: "PDF", className: "bg-red-500/10 text-red-600" };
  if (mimeType.includes("zip") || mimeType.includes("archive")) return { label: "Archive", className: "bg-yellow-500/10 text-yellow-600" };
  return { label: "File", className: "bg-muted text-muted-foreground" };
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function highlightMatch(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export function CrossWorkspaceSearch({ query, open, onClose, onFileSelect }: CrossWorkspaceSearchProps) {
  const debouncedQuery = useDebounce(query, 300);
  const { data: results = [], isLoading } = useCrossWorkspaceSearch(debouncedQuery, open && debouncedQuery.length >= 2);
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Flatten results for keyboard navigation
  const flatResults = results as any[];

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open || flatResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      onFileSelect?.(flatResults[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }, [open, flatResults, activeIndex, onFileSelect, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0) {
      const el = ref.current?.querySelector(`[data-search-index="${activeIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!open || query.length < 2) return null;

  // Group results by workspace
  const grouped = flatResults.reduce((acc: Record<string, any[]>, file: any) => {
    const wsName = file.workspace_name || "Unknown";
    if (!acc[wsName]) acc[wsName] = [];
    acc[wsName].push(file);
    return acc;
  }, {});

  let globalIndex = -1;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-full left-0 right-0 mt-2 bg-popover/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-50 max-h-[70vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {isLoading
                ? "Searching all workspaces..."
                : `${results.length} result${results.length !== 1 ? "s" : ""} found`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* Loading skeleton */}
          {isLoading && (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-secondary/60" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-secondary/60 rounded-full w-3/4" />
                    <div className="h-2.5 bg-secondary/40 rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && results.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No files found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try a different search term for "{debouncedQuery}"
              </p>
            </div>
          )}

          {/* Grouped results */}
          {Object.entries(grouped).map(([wsName, files], groupIdx) => (
            <div key={wsName}>
              <div className="px-4 py-2 bg-muted/20 sticky top-0 backdrop-blur-sm border-b border-border/20">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {wsName}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">
                    {(files as any[]).length} file{(files as any[]).length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="p-1.5">
                {(files as any[]).map((file: any) => {
                  globalIndex++;
                  const idx = globalIndex;
                  const isActive = idx === activeIndex;
                  const badge = getFileTypeBadge(file.mime_type, file.is_folder);

                  return (
                    <motion.button
                      key={file.id}
                      data-search-index={idx}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      onClick={() => onFileSelect?.(file)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group",
                        isActive
                          ? "bg-primary/8 ring-1 ring-primary/20"
                          : "hover:bg-secondary/50"
                      )}
                    >
                      {/* Thumbnail / Icon */}
                      {file.cloudinary_url && file.mime_type?.startsWith("image/") ? (
                        <img
                          src={file.cloudinary_url}
                          alt=""
                          className={cn(
                            "w-9 h-9 rounded-xl object-cover shrink-0 transition-transform duration-200",
                            isActive && "ring-2 ring-primary/30 scale-105"
                          )}
                        />
                      ) : (
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
                          isActive ? "bg-primary/10 scale-105" : "bg-secondary/60"
                        )}>
                          {getFileIcon(file.mime_type, file.is_folder)}
                        </div>
                      )}

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate leading-tight">
                          {highlightMatch(file.name, debouncedQuery)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md", badge.className)}>
                            {badge.label}
                          </span>
                          {!file.is_folder && file.size && (
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatSize(file.size)}
                            </span>
                          )}
                          {file.updated_at && (
                            <span className="text-[10px] text-muted-foreground/40">
                              · {new Date(file.updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Enter hint on active */}
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="shrink-0"
                        >
                          <kbd className="hidden sm:flex h-5 items-center rounded-md bg-primary/10 px-1.5 text-[10px] font-mono text-primary/70">
                            ↵
                          </kbd>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer with keyboard hints */}
        {!isLoading && results.length > 0 && (
          <div className="px-4 py-2 border-t border-border/30 bg-muted/10 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
              <kbd className="h-4 w-4 rounded bg-secondary/60 flex items-center justify-center">
                <ArrowUp className="w-2.5 h-2.5" />
              </kbd>
              <kbd className="h-4 w-4 rounded bg-secondary/60 flex items-center justify-center">
                <ArrowDown className="w-2.5 h-2.5" />
              </kbd>
              <span>navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
              <kbd className="h-4 rounded bg-secondary/60 flex items-center justify-center px-1">
                <CornerDownLeft className="w-2.5 h-2.5" />
              </kbd>
              <span>open</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
              <kbd className="h-4 rounded bg-secondary/60 flex items-center justify-center px-1.5 text-[10px] font-mono">
                esc
              </kbd>
              <span>close</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
