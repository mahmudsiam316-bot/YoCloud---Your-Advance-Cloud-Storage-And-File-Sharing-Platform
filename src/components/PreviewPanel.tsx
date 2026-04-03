import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getCloudinaryUrl } from "@/hooks/useCloudinary";
import { FileTypeIcon } from "./FileTypeIcon";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { DefaultVideoLayout, DefaultAudioLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import type { FileItem } from "./RecentFiles";

interface PreviewPanelProps {
  file: FileItem | null;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getFileType(mime: string): string {
  if (mime.includes('folder')) return 'Folder';
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('word')) return 'Document';
  if (mime.includes('sheet') || mime.includes('excel')) return 'Spreadsheet';
  if (mime.includes('image')) return 'Image';
  if (mime.includes('video')) return 'Video';
  if (mime.includes('audio')) return 'Audio';
  return 'File';
}

function getFileExt(name: string): string {
  return name.split('.').pop()?.toUpperCase() || '';
}

function getExtColor(ext: string): string {
  switch (ext) {
    case 'PDF': return 'text-red-500';
    case 'XLS': case 'XLSX': return 'text-green-600';
    case 'DOC': case 'DOCX': return 'text-blue-600';
    case 'SVG': case 'PNG': case 'JPG': case 'JPEG': case 'WEBP': case 'GIF': return 'text-emerald-500';
    case 'MP4': case 'MOV': case 'AVI': case 'WEBM': return 'text-purple-500';
    case 'MP3': case 'WAV': case 'OGG': case 'FLAC': return 'text-orange-500';
    default: return 'text-muted-foreground';
  }
}

function FilePreviewThumbnail({ file }: { file: FileItem }) {
  const mime = file.mime_type || '';
  const url = file.cloudinary_url;
  const name = file.name.toLowerCase();

  // Image preview
  if (mime.startsWith('image/') && url) {
    const thumbUrl = getCloudinaryUrl(url, { width: 400, height: 300, crop: 'fill' }) || url;
    return (
      <img
        src={thumbUrl}
        alt={file.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  }

  // Video preview
  if (mime.startsWith('video/') && url) {
    return (
      <MediaPlayer
        src={url}
        viewType="video"
        className="w-full h-full"
        crossOrigin
        muted
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} smallLayoutWhen={true} />
      </MediaPlayer>
    );
  }

  // Audio preview
  if (mime.startsWith('audio/') && url) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-3">
        <div className="text-3xl mb-2">🎵</div>
        <MediaPlayer
          src={url}
          viewType="audio"
          className="w-full max-w-[220px]"
          crossOrigin
        >
          <MediaProvider />
          <DefaultAudioLayout icons={defaultLayoutIcons} smallLayoutWhen={true} />
        </MediaPlayer>
      </div>
    );
  }

  // PDF preview — show first page thumbnail via canvas
  if (mime === 'application/pdf' && url) {
    return (
      <div className="flex flex-col items-center justify-center p-4 gap-2 w-full h-full">
        <FileTypeIcon name={file.name} mime={mime} isFolder={file.is_folder} size={48} />
        <p className="text-xs text-muted-foreground">PDF Document</p>
        <p className="text-[10px] text-muted-foreground">Click to preview</p>
      </div>
    );
  }

  // Office files preview via Google Docs Viewer
  const officeExts = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'];
  if (url && officeExts.some((ext) => name.endsWith(ext))) {
    return (
      <iframe
        src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
        className="w-full h-full border-0"
        title={file.name}
      />
    );
  }

  // Fallback — extension badge
  return (
    <div className="flex flex-col items-center justify-center p-4 gap-2">
      <FileTypeIcon name={file.name} mime={mime} isFolder={file.is_folder} size={64} />
      <p className="text-xs text-muted-foreground mt-1">{getFileType(mime)}</p>
    </div>
  );
}

export function PreviewPanel({ file, onClose }: PreviewPanelProps) {
  const panelContent = file ? (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-foreground">File preview</h3>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Preview area */}
      <div className="aspect-[4/3] rounded-lg bg-secondary border border-border mb-4 flex items-center justify-center overflow-hidden">
        <FilePreviewThumbnail file={file} />
      </div>

      {/* File name */}
      <div className="flex items-center gap-3 mb-6">
        <FileTypeIcon name={file.name} mime={file.mime_type} isFolder={file.is_folder} size={32} />
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
      </div>

      {/* Description */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-foreground mb-2">Description</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {file.mime_type?.startsWith('image/') ? 'An image file stored in your cloud.' :
           file.mime_type?.startsWith('video/') ? 'A video file stored in your cloud.' :
           file.mime_type?.startsWith('audio/') ? 'An audio file stored in your cloud.' :
           'A file in your storage. Click to download or share with your team members.'}
        </p>
      </div>

      {/* Properties */}
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-3">Properties</h4>
        <dl className="space-y-2.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium text-foreground">{getFileType(file.mime_type)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Size</dt>
            <dd className="font-mono-data text-foreground">{formatSize(file.size)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Last modified</dt>
            <dd className="font-mono-data text-foreground">{formatDate(file.created_at)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Extension</dt>
            <dd className="font-mono-data text-foreground">.{getFileExt(file.name)}</dd>
          </div>
        </dl>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Desktop panel */}
      <AnimatePresence>
        {file && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="hidden lg:block border-l border-border bg-card h-screen sticky top-0 overflow-y-auto overflow-x-hidden shrink-0"
          >
            {panelContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile/tablet modal */}
      <AnimatePresence>
        {file && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card rounded-t-2xl max-h-[80vh] overflow-y-auto"
            >
              {panelContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
