import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, ZoomIn, ZoomOut, Download, Save, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight, Maximize2, Minimize2, Image, FileText, Film, Music, FileSpreadsheet, File, Share2, Trash2, Copy, Check, Link, Globe } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { FileComments } from "@/components/FileComments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PdfViewer } from "@/components/PdfViewer";
import { HtmlPreview } from "@/components/HtmlPreview";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { DefaultVideoLayout, DefaultAudioLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import type { FileItem } from "./RecentFiles";

interface FilePreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  /** All previewable files for prev/next navigation */
  fileList?: FileItem[];
  onNavigate?: (file: FileItem) => void;
}

type FileCategory = "image" | "pdf" | "text" | "html" | "markdown" | "video" | "audio" | "office" | "unknown";

function detectFileCategory(file: FileItem): FileCategory {
  const mime = file.mime_type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  // Markdown detection
  if (mime === "text/markdown" || name.endsWith(".md") || name.endsWith(".mdx") || name.endsWith(".markdown")) return "markdown";
  // HTML detection
  if (mime === "text/html" || name.endsWith(".html") || name.endsWith(".htm")) return "html";
  const officeExts = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp"];
  const officeMimes = ["application/msword", "application/vnd.openxmlformats", "application/vnd.ms-excel", "application/vnd.ms-powerpoint", "application/vnd.oasis"];
  if (officeExts.some((ext) => name.endsWith(ext)) || officeMimes.some((m) => mime.includes(m))) return "office";
  const textExts = [".txt", ".json", ".js", ".ts", ".tsx", ".jsx", ".css", ".xml", ".yaml", ".yml", ".csv", ".py", ".sh", ".env", ".log", ".sql", ".toml", ".ini", ".cfg"];
  if (mime.startsWith("text/") || textExts.some((ext) => name.endsWith(ext))) return "text";
  return "unknown";
}

const categoryMeta: Record<FileCategory, { label: string; icon: typeof Image; color: string }> = {
  image: { label: "Image", icon: Image, color: "text-emerald-500" },
  pdf: { label: "PDF", icon: FileText, color: "text-red-500" },
  html: { label: "HTML", icon: Globe, color: "text-sky-500" },
  markdown: { label: "Markdown", icon: FileText, color: "text-violet-500" },
  text: { label: "Text", icon: FileText, color: "text-blue-500" },
  video: { label: "Video", icon: Film, color: "text-purple-500" },
  audio: { label: "Audio", icon: Music, color: "text-orange-500" },
  office: { label: "Document", icon: FileSpreadsheet, color: "text-green-600" },
  unknown: { label: "File", icon: File, color: "text-muted-foreground" },
};

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 w-full">
      <div className="w-full max-w-md space-y-3">
        <div className="h-48 w-full rounded-xl bg-muted animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
      </div>
      <p className="text-xs text-muted-foreground mt-2">Loading preview…</p>
    </div>
  );
}

function PreviewError({ onRetry, fileName, onDownload }: { onRetry: () => void; fileName: string; onDownload?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">Failed to load preview</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Could not load "{fileName}". The file may be unavailable or the link may have expired.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </Button>
        {onDownload && (
          <Button variant="secondary" size="sm" onClick={onDownload} className="gap-2">
            <Download className="w-3.5 h-3.5" /> Download instead
          </Button>
        )}
      </div>
    </div>
  );
}

// Session storage key for remembering last preview state
const PREVIEW_STATE_KEY = "file_preview_state";

function savePreviewState(fileId: string, zoom: number) {
  try {
    sessionStorage.setItem(PREVIEW_STATE_KEY, JSON.stringify({ fileId, zoom, ts: Date.now() }));
  } catch { /* ignore */ }
}

function loadPreviewState(fileId: string): { zoom: number } | null {
  try {
    const raw = sessionStorage.getItem(PREVIEW_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (state.fileId === fileId && Date.now() - state.ts < 300_000) return { zoom: state.zoom };
  } catch { /* ignore */ }
  return null;
}

export function FilePreviewModal({ file, onClose, onDownload, onShare, onDelete, fileList, onNavigate }: FilePreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [textContent, setTextContent] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [officeFallback, setOfficeFallback] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [deferredLoad, setDeferredLoad] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const retryCountRef = useRef(0);
  const isMobile = useIsMobile();
  const dragY = useMotionValue(0);
  const modalOpacity = useTransform(dragY, [0, 200], [1, 0.3]);
  const contentRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Navigation
  const previewableFiles = useMemo(() => (fileList ?? []).filter(f => !f.is_folder && !f.is_trashed), [fileList]);
  const currentIndex = file ? previewableFiles.findIndex(f => f.id === file.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < previewableFiles.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev && onNavigate) onNavigate(previewableFiles[currentIndex - 1]);
  }, [hasPrev, onNavigate, previewableFiles, currentIndex]);

  const goToNext = useCallback(() => {
    if (hasNext && onNavigate) onNavigate(previewableFiles[currentIndex + 1]);
  }, [hasNext, onNavigate, previewableFiles, currentIndex]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!modalRef.current) return;
    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Focus trap + keyboard navigation + a11y
  useEffect(() => {
    if (!file) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    // Focus modal on open
    requestAnimationFrame(() => modalRef.current?.focus());
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const handleKey = (e: KeyboardEvent) => {
      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
      if (e.key === "ArrowLeft") { e.preventDefault(); goToPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goToNext(); }
      if (e.key === "Escape") { e.preventDefault(); handleCloseWithCheck(); }
      if (e.key === "f" || e.key === "F") {
        if (document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
          e.preventDefault(); toggleFullscreen();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [file, goToPrev, goToNext, toggleFullscreen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  };

  const loadPreview = useCallback(async () => {
    if (!file || file.is_folder) return;
    setSignedUrl(null);
    setTextContent(null);
    setEditedContent(null);
    setPanOffset({ x: 0, y: 0 });
    setPdfZoom(100);
    setOfficeFallback(false);
    setLoading(true);
    setError(false);
    setDeferredLoad(false);

    // Restore last zoom level
    const savedState = loadPreviewState(file.id);
    setZoom(savedState?.zoom ?? 1);

    try {
      let url: string | null = null;
      if (file.cloudinary_url) {
        url = file.cloudinary_url;
      } else {
        const { data, error: storageError } = await supabase.storage.from("user-files").createSignedUrl(file.storage_path, 600);
        if (storageError) throw storageError;
        url = data?.signedUrl ?? null;
      }
      if (!url) throw new Error("No URL");
      setSignedUrl(url);
      requestAnimationFrame(() => setDeferredLoad(true));

      const category = detectFileCategory(file);
      // Load text content for text & html files
      if ((category === "text" || category === "html" || category === "markdown") && file.size < 500_000) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error("fetch failed");
          const text = await res.text();
          setTextContent(text);
          setEditedContent(text);
        } catch { /* non-critical */ }
      }
      retryCountRef.current = 0;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [file]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  // Save zoom state on change
  useEffect(() => {
    if (file && zoom !== 1) savePreviewState(file.id, zoom);
  }, [file, zoom]);

  const handleRetry = () => { retryCountRef.current++; loadPreview(); };

  const handleSave = async () => {
    if (!file || editedContent === null || editedContent === textContent) return;
    setSaving(true);
    try {
      const blob = new Blob([editedContent], { type: file.mime_type });
      await supabase.storage.from("user-files").update(file.storage_path, blob, { upsert: true });
      setTextContent(editedContent);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleSaveClick = () => setSaveConfirmOpen(true);

  const handleCloseWithCheck = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Discard?")) onClose();
    } else {
      onClose();
    }
  }, [onClose]);

  // Copy shareable link
  const handleCopyLink = useCallback(async () => {
    if (!signedUrl) return;
    try {
      await navigator.clipboard.writeText(signedUrl);
      setLinkCopied(true);
      toast.success("Preview link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }, [signedUrl]);

  // Image zoom + pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.min(8, Math.max(0.25, z + delta)));
  }, []);

  const handleImagePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom, panOffset]);

  const handleImagePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: panStart.current.ox + (e.clientX - panStart.current.x),
      y: panStart.current.oy + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleImagePointerUp = useCallback(() => setIsPanning(false), []);

  const resetImageView = useCallback(() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }, []);

  // Pinch-to-zoom for mobile
  const lastPinchDist = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastPinchDist.current > 0) {
        const scale = dist / lastPinchDist.current;
        setZoom(z => Math.min(8, Math.max(0.25, z * scale)));
      }
      lastPinchDist.current = dist;
    }
  }, []);

  if (!file) return null;

  const category = detectFileCategory(file);
  const meta = categoryMeta[category];
  const CategoryIcon = meta.icon;
  const isTextFile = textContent !== null;
  const hasUnsavedChanges = isTextFile && editedContent !== textContent;

  return (
    <AnimatePresence>
      {file && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-foreground/70 z-[110] backdrop-blur-sm"
            onClick={handleCloseWithCheck}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Preview: ${file.name}`}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: isMobile ? "100%" : 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: isMobile ? "100%" : 20 }}
            transition={isMobile
              ? { type: "spring", stiffness: 350, damping: 30 }
              : { type: "spring", stiffness: 500, damping: 35, mass: 0.8 }
            }
            style={isMobile ? { y: dragY, opacity: modalOpacity } : undefined}
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed inset-0 md:inset-6 lg:inset-10 z-[110] bg-card md:rounded-2xl md:border md:border-border md:shadow-2xl flex flex-col lg:flex-row overflow-hidden outline-none"
          >
            {/* Main content column */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Mobile swipe handle */}
            {isMobile && (
              <div className="flex justify-center pt-2 pb-0 shrink-0 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
            )}

            {/* Header — file details + controls */}
            <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-border shrink-0 bg-card gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Type badge */}
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-semibold shrink-0 ${meta.color}`}>
                  <CategoryIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">{meta.label}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{file.name}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {formatSize(file.size)}
                    <span className="mx-1">·</span>
                    {file.mime_type}
                    <span className="mx-1">·</span>
                    {formatRelativeTime(file.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {/* Image zoom controls */}
                {category === "image" && !error && !loading && (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setZoom(z => Math.max(0.25, z - 0.25)); setPanOffset({ x: 0, y: 0 }); }} aria-label="Zoom out">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground w-8 text-center font-mono" aria-live="polite">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(8, z + 0.25))} aria-label="Zoom in">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetImageView} aria-label="Fit to screen" title="Fit to screen">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                {/* PDF zoom is handled inside PdfViewer component */}

                {/* Separator */}
                <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

                {/* Quick actions */}
                {hasUnsavedChanges && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveClick} disabled={saving} aria-label="Save changes">
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyLink} aria-label="Copy preview link" title="Copy link">
                  {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(file)} aria-label="Download file" title="Download">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                {onShare && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onShare(file)} aria-label="Share file" title="Share">
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(file)} aria-label="Delete file" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}

                {/* Fullscreen (desktop only) */}
                {!isMobile && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} title="Fullscreen (F)">
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </Button>
                )}

                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCloseWithCheck} aria-label="Close preview">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {saving && (
              <div className="px-4 py-1.5 bg-primary/10 text-xs text-primary font-medium" role="status">Saving...</div>
            )}

            {/* Content + Navigation arrows */}
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-secondary/30 relative" ref={contentRef}>
              {/* Prev arrow */}
              {hasPrev && (
                <button
                  onClick={goToPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card/90 border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                  aria-label="Previous file"
                  title="Previous file (←)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {/* Next arrow */}
              {hasNext && (
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-card/90 border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                  aria-label="Next file"
                  title="Next file (→)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* File position indicator */}
              {previewableFiles.length > 1 && currentIndex >= 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-full bg-card/90 border border-border text-[10px] font-mono text-muted-foreground shadow-sm" aria-live="polite">
                  {currentIndex + 1} / {previewableFiles.length}
                </div>
              )}

              {error ? (
                <PreviewError onRetry={handleRetry} fileName={file.name} onDownload={() => onDownload(file)} />
              ) : loading || !signedUrl ? (
                <PreviewSkeleton />
              ) : !deferredLoad ? (
                <PreviewSkeleton />
              ) : category === "image" ? (
                <div
                  className="w-full h-full overflow-hidden flex items-center justify-center"
                  onWheel={handleWheel}
                  onPointerDown={handleImagePointerDown}
                  onPointerMove={handleImagePointerMove}
                  onPointerUp={handleImagePointerUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  style={{ cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default", touchAction: "none" }}
                >
                  <img
                    src={signedUrl}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain transition-transform duration-100 select-none"
                    style={{ transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)` }}
                    draggable={false}
                    onError={() => setError(true)}
                  />
                </div>
              ) : category === "pdf" ? (
                <PdfViewer
                  url={signedUrl}
                  fileName={file.name}
                  zoom={pdfZoom}
                  onZoomChange={setPdfZoom}
                  onError={() => setError(true)}
                />
              ) : category === "office" ? (
                officeFallback ? (
                  <PreviewError
                    onRetry={() => setOfficeFallback(false)}
                    fileName={file.name}
                    onDownload={() => onDownload(file)}
                  />
                ) : (
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}&embedded=true`}
                    className="w-full h-full border-0"
                    title={file.name}
                    onLoad={(e) => {
                      const timer = setTimeout(() => {
                        try {
                          const iframe = e.target as HTMLIFrameElement;
                          if (iframe.contentDocument?.body?.innerHTML === "") setOfficeFallback(true);
                        } catch { /* cross-origin = loaded ok */ }
                      }, 8000);
                      return () => clearTimeout(timer);
                    }}
                    onError={() => setOfficeFallback(true)}
                  />
                )
              ) : category === "video" ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <MediaPlayer
                    src={signedUrl}
                    viewType="video"
                    className="w-full max-w-4xl aspect-video rounded-lg overflow-hidden"
                    crossOrigin
                    playsInline
                  >
                    <MediaProvider />
                    <DefaultVideoLayout icons={defaultLayoutIcons} />
                  </MediaPlayer>
                </div>
              ) : category === "audio" ? (
                <div className="flex flex-col items-center gap-6 p-8">
                  <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="text-4xl">🎵</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <MediaPlayer src={signedUrl} viewType="audio" className="w-full max-w-md" crossOrigin>
                    <MediaProvider />
                    <DefaultAudioLayout icons={defaultLayoutIcons} />
                  </MediaPlayer>
                </div>
              ) : category === "markdown" && isTextFile ? (
                <MarkdownPreview
                  content={editedContent ?? textContent ?? ""}
                  fileName={file.name}
                  onContentChange={setEditedContent}
                />
              ) : category === "html" && isTextFile ? (
                <HtmlPreview
                  content={editedContent ?? textContent ?? ""}
                  fileName={file.name}
                  onContentChange={setEditedContent}
                />
              ) : isTextFile ? (
                <div className="w-full h-full p-4">
                  <textarea
                    value={editedContent ?? ""}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-full font-mono text-sm bg-card rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-ring/30 text-foreground border border-border"
                    spellCheck={false}
                    aria-label={`Editing ${file.name}`}
                  />
                </div>
              ) : (
                <div className="text-center p-8">
                  <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📄</span>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{file.name}</p>
                  <p className="text-xs text-muted-foreground mb-4">{file.mime_type} · {formatSize(file.size)}</p>
                  <Button variant="outline" onClick={() => onDownload(file)}>
                    <Download className="w-4 h-4 mr-2" /> Download to view
                  </Button>
                </div>
              )}
            </div>

            {/* Comments — collapsed on mobile, bottom of main column */}
            {isMobile && <FileComments fileId={file.id} defaultCollapsed />}
            </div>

            {/* Desktop side panel for comments */}
            {!isMobile && (
              <div className="hidden lg:flex w-80 border-l border-border flex-col shrink-0 overflow-y-auto bg-card">
                <FileComments fileId={file.id} defaultCollapsed={false} />
              </div>
            )}
          </motion.div>

          {/* Save confirmation dialog */}
          <AlertDialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
            <AlertDialogContent className="z-[120]">
              <AlertDialogHeader>
                <AlertDialogTitle>Save changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  You've edited "{file.name}". This will overwrite the file in storage permanently.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setSaveConfirmOpen(false); handleSave(); }}>
                  Save
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AnimatePresence>
  );
}
