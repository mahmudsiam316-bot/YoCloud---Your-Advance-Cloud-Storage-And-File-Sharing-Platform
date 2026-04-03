import { useState, useEffect, useRef, useCallback } from "react";
import { List, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { FileActionMenu } from "./FileActionMenu";
import { TagBadge } from "./TagComponents";
import { FileTypeIcon } from "./FileTypeIcon";
import { supabase } from "@/integrations/supabase/client";
import type { FileItem } from "./RecentFiles";
import type { Tag } from "@/hooks/useTags";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface FileTableProps {
  files: FileItem[];
  selectedFile: FileItem | null;
  onFileSelect: (file: FileItem) => void;
  onFolderOpen: (folderId: string) => void;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  sortField: string;
  onSortChange: (field: string) => void;
  onStar: (file: FileItem) => void;
  onTrash: (file: FileItem) => void;
  onRestore: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  onDownload: (file: FileItem) => void;
  onMove?: (file: FileItem) => void;
  onOpen?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
  onVersionHistory?: (file: FileItem) => void;
  onUploadVersion?: (file: FileItem) => void;
  onManageTags?: (file: FileItem) => void;
  onCopyToWorkspace?: (file: FileItem) => void;
  onMoveToWorkspace?: (file: FileItem) => void;
  onPublishToMarketplace?: (file: FileItem) => void;
  searchQuery?: string;
  bulkSelected?: Set<string>;
  onBulkToggle?: (fileId: string) => void;
  fileTagMap?: Map<string, Tag[]>;
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
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return 'Spreadsheet';
  if (mime.includes('image')) return 'Image';
  if (mime.includes('video')) return 'Video';
  if (mime.includes('audio')) return 'Audio';
  return 'File';
}

function getFileExt(name: string): string {
  return name.split('.').pop()?.toUpperCase() || '';
}

function getExtConfig(ext: string): { bg: string; text: string; border: string } {
  switch (ext) {
    case 'PDF': return { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-500', border: 'border-red-200 dark:border-red-500/20' };
    case 'XLS': case 'XLSX': return { bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600', border: 'border-green-200 dark:border-green-500/20' };
    case 'DOC': case 'DOCX': return { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200 dark:border-blue-500/20' };
    case 'SVG': return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-200 dark:border-emerald-500/20' };
    case 'PNG': case 'JPG': case 'JPEG': case 'WEBP': case 'GIF': return { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-200 dark:border-violet-500/20' };
    case 'MP4': case 'MOV': case 'AVI': case 'WEBM': return { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-200 dark:border-purple-500/20' };
    case 'MP3': case 'WAV': case 'OGG': case 'FLAC': return { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-200 dark:border-orange-500/20' };
    case 'ZIP': case 'RAR': case '7Z': return { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200 dark:border-amber-500/20' };
    case 'JSON': case 'JS': case 'TS': case 'TSX': case 'JSX': return { bg: 'bg-yellow-50 dark:bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-200 dark:border-yellow-500/20' };
    case 'TXT': case 'MD': case 'CSV': return { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-200 dark:border-slate-500/20' };
    default: return { bg: 'bg-secondary', text: 'text-muted-foreground', border: 'border-border' };
  }
}

function FileRowIcon({ mime, name }: { mime: string; name: string }) {
  const isFolder = mime.includes('folder');
  return (
    <FileTypeIcon name={name} mime={mime} isFolder={isFolder} size={36} />
  );
}

function SortIcon({ field, currentSort }: { field: string; currentSort: string }) {
  if (currentSort === field) return <ArrowUp className="w-3 h-3" />;
  if (currentSort === `-${field}`) return <ArrowDown className="w-3 h-3" />;
  return <ArrowUpDown className="w-3 h-3 opacity-40" />;
}

function GridThumbnail({ file }: { file: FileItem }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const isImage = file.mime_type?.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    if (file.cloudinary_url) {
      setUrl(file.cloudinary_url.replace("/upload/", "/upload/w_300,h_200,c_fill,q_auto,f_auto/"));
      return;
    }
    let cancelled = false;
    supabase.storage.from("user-files").createSignedUrl(file.storage_path, 300).then(({ data }) => {
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [file.storage_path, file.cloudinary_url, isImage]);

  if (isImage && url) {
    return (
      <div className="relative w-full h-[120px] bg-secondary/50 rounded-t-xl overflow-hidden">
        {!loaded && <div className="absolute inset-0 animate-pulse bg-secondary" />}
        <img
          src={url}
          alt={file.name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn("w-full h-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-[120px] bg-secondary/30 rounded-t-xl">
      <FileTypeIcon name={file.name} mime={file.mime_type} isFolder={file.is_folder} size={52} />
    </div>
  );
}

interface GridCardProps {
  file: FileItem;
  index: number;
  selected: boolean;
  bulkChecked: boolean;
  hasBulkMode: boolean;
  onCheckboxClick: (e: React.MouseEvent, id: string) => void;
  onClick: () => void;
  searchQuery?: string;
  renderTags: (fileId: string) => React.ReactNode;
  actionProps: any;
}

function GridCard({ file, index, selected, bulkChecked, hasBulkMode, onCheckboxClick, onClick, searchQuery, renderTags, actionProps, onLongPress }: GridCardProps & { onLongPress?: (fileId: string) => void }) {
  const ext = getFileExt(file.name);
  const extCfg = getExtConfig(ext);
  const isMobile = useIsMobile();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const handleTouchStart = useCallback(() => {
    if (!isMobile) return;
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress?.(file.id);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }, [isMobile, file.id, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    // If bulk mode is active on mobile, toggle selection on tap
    if (isMobile && hasBulkMode) {
      onLongPress?.(file.id);
      return;
    }
    onClick();
  }, [isMobile, hasBulkMode, onClick, file.id, onLongPress]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={cn(
        "group relative rounded-xl border cursor-pointer transition-all overflow-hidden select-none",
        bulkChecked ? "border-primary/40 bg-primary/5 shadow-md ring-2 ring-primary/20" :
        selected ? "border-primary/30 bg-primary/5 shadow-md" :
        "border-border bg-card hover:border-primary/20 hover:shadow-md"
      )}
    >
      {/* Desktop: always show checkbox in bulk mode; Mobile: show checkmark overlay when selected */}
      {hasBulkMode && !isMobile && (
        <div className="absolute top-2 left-2 z-10" onClick={(e) => onCheckboxClick(e, file.id)}>
          <Checkbox checked={bulkChecked} className="bg-card/80 backdrop-blur-sm" />
        </div>
      )}
      {isMobile && bulkChecked && (
        <div className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      <div
        className="absolute top-2 right-2 z-10 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <FileActionMenu file={file} {...actionProps} />
      </div>

      <GridThumbnail file={file} />

      <div className="p-3 space-y-1.5">
        <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
          <HighlightText text={file.name} query={searchQuery} />
        </p>
        <div className="flex items-center gap-2">
          {!file.is_folder && (
            <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border", extCfg.bg, extCfg.text, extCfg.border)}>
              {ext}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground font-mono">
            {file.is_folder ? "Folder" : formatSize(file.size)}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">{formatDate(file.created_at)}</p>
        {renderTags(file.id)}
      </div>
    </motion.div>
  );
}

function MobileListView({ files, selectedFile, bulkSelected, hasBulkMode, allSelected, someSelected, handleSelectAll, handleRowClick, handleLongPress, handleCheckboxClick, searchQuery, renderTags, actionProps }: {
  files: FileItem[]; selectedFile: FileItem | null; bulkSelected?: Set<string>; hasBulkMode: boolean;
  allSelected: boolean; someSelected: boolean; handleSelectAll: () => void;
  handleRowClick: (file: FileItem) => void; handleLongPress: (fileId: string) => void;
  handleCheckboxClick: (e: React.MouseEvent, fileId: string) => void;
  searchQuery?: string; renderTags: (fileId: string) => React.ReactNode; actionProps: any;
}) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const onTouchStart = useCallback((fileId: string) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      handleLongPress(fileId);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }, [handleLongPress]);

  const onTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const onItemClick = useCallback((file: FileItem) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (hasBulkMode) {
      handleLongPress(file.id);
      return;
    }
    handleRowClick(file);
  }, [hasBulkMode, handleLongPress, handleRowClick]);

  return (
    <div className="md:hidden space-y-0.5">
      {hasBulkMode && bulkSelected && bulkSelected.size > 0 && (
        <div className="flex items-center gap-2 px-2 py-2 mb-1">
          <Checkbox
            checked={allSelected}
            // @ts-ignore
            indeterminate={someSelected}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-[11px] text-muted-foreground">Select all</span>
        </div>
      )}
      {files.map((file, i) => (
        <motion.div
          key={file.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.015 }}
          onClick={() => onItemClick(file)}
          onTouchStart={() => onTouchStart(file.id)}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          className={cn(
            "flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.99] select-none",
            bulkSelected?.has(file.id) ? "bg-primary/8 ring-1 ring-primary/20" :
            selectedFile?.id === file.id ? "bg-primary/5" : "hover:bg-secondary/40"
          )}
        >
          {hasBulkMode && bulkSelected && bulkSelected.size > 0 && bulkSelected?.has(file.id) && (
            <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
          {hasBulkMode && bulkSelected && bulkSelected.size > 0 && !bulkSelected?.has(file.id) && (
            <div className="shrink-0 w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
          )}
          <FileRowIcon mime={file.mime_type} name={file.name} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate leading-tight">
              <HighlightText text={file.name} query={searchQuery} />
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-mono">
                {file.is_folder ? "Folder" : formatSize(file.size)}
              </span>
              {!file.is_folder && (
                <>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">{getFileType(file.mime_type)}</span>
                </>
              )}
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{formatDate(file.created_at).split(' ')[0]}</span>
            </div>
            {renderTags(file.id)}
          </div>
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <FileActionMenu file={file} {...actionProps} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function FileTable({ files, selectedFile, onFileSelect, onFolderOpen, viewMode, onViewModeChange, sortField, onSortChange, onStar, onTrash, onRestore, onDelete, onRename, onDownload, onMove, onOpen, onShare, onVersionHistory, onUploadVersion, onManageTags, onCopyToWorkspace, onMoveToWorkspace, onPublishToMarketplace, searchQuery, bulkSelected, onBulkToggle, fileTagMap }: FileTableProps) {
  const isMobile = useIsMobile();
  const actionProps = { onStar, onTrash, onRestore, onDelete, onRename, onDownload, onMove, onOpen, onShare, onVersionHistory, onUploadVersion, onManageTags, onCopyToWorkspace, onMoveToWorkspace, onPublishToMarketplace };
  const bulkSelectionEnabled = !!bulkSelected && !!onBulkToggle;
  const mobileSelectionMode = bulkSelectionEnabled && (bulkSelected?.size ?? 0) > 0;

  const allSelected = bulkSelectionEnabled && files.length > 0 && files.every((f) => bulkSelected?.has(f.id));
  const someSelected = bulkSelectionEnabled && files.some((f) => bulkSelected?.has(f.id)) && !allSelected;

  const handleSelectAll = () => {
    if (!onBulkToggle) return;
    if (allSelected) {
      files.forEach((f) => { if (bulkSelected?.has(f.id)) onBulkToggle(f.id); });
    } else {
      files.forEach((f) => { if (!bulkSelected?.has(f.id)) onBulkToggle(f.id); });
    }
  };

  const handleRowClick = (file: FileItem) => {
    if (file.is_folder) {
      onFolderOpen(file.id);
    } else {
      onFileSelect(file);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    onBulkToggle?.(fileId);
  };

  const handleLongPress = useCallback((fileId: string) => {
    onBulkToggle?.(fileId);
  }, [onBulkToggle]);

  const renderTags = (fileId: string) => {
    const tags = fileTagMap?.get(fileId);
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex gap-1 flex-wrap mt-0.5">
        {tags.slice(0, 3).map((tag) => (
          <TagBadge key={tag.id} tag={tag} size="xs" />
        ))}
        {tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>}
      </div>
    );
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">All files</h2>
          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md font-medium">
            {files.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange("list")}
            className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn("p-1.5 rounded-md transition-all", viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {files.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No files in this folder
        </div>
      )}

      {/* Desktop List View */}
      {files.length > 0 && viewMode === "list" && (
        <div className="hidden md:block border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {bulkSelectionEnabled && (
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={allSelected}
                      // @ts-ignore
                      indeterminate={someSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-[40%]">
                  <button onClick={() => onSortChange("name")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Name <SortIcon field="name" currentSort={sortField} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                  <button onClick={() => onSortChange("type")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Type <SortIcon field="type" currentSort={sortField} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <button onClick={() => onSortChange("size")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Size <SortIcon field="size" currentSort={sortField} />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Modified</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => (
                <motion.tr
                  key={file.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => handleRowClick(file)}
                  className={cn(
                    "h-[52px] border-b border-border/50 last:border-0 cursor-pointer transition-all group",
                    bulkSelected?.has(file.id) ? "bg-primary/5" :
                    selectedFile?.id === file.id ? "bg-primary/5" : "hover:bg-secondary/60"
                  )}
                >
                  {bulkSelectionEnabled && (
                    <td className="px-3" onClick={(e) => handleCheckboxClick(e, file.id)}>
                      <Checkbox checked={bulkSelected?.has(file.id) ?? false} />
                    </td>
                  )}
                  <td className="px-4 overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileRowIcon mime={file.mime_type} name={file.name} />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-foreground truncate block text-[13px] max-w-full"><HighlightText text={file.name} query={searchQuery} /></span>
                        {renderTags(file.id)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 text-muted-foreground text-[13px] hidden lg:table-cell">{getFileType(file.mime_type)}</td>
                  <td className="px-4 font-mono text-muted-foreground text-[13px]">{file.is_folder ? "—" : formatSize(file.size)}</td>
                  <td className="px-4 font-mono text-muted-foreground text-[13px] hidden xl:table-cell">{formatDate(file.created_at)}</td>
                  <td className="px-2">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <FileActionMenu file={file} {...actionProps} />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View — Desktop & Mobile */}
      {files.length > 0 && viewMode === "grid" && (
        <div>
          {bulkSelectionEnabled && bulkSelected && bulkSelected.size > 0 && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <Checkbox
                checked={allSelected}
                // @ts-ignore
                indeterminate={someSelected}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-[11px] text-muted-foreground">Select all</span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-3">
            {files.map((file, i) => (
              <GridCard
                key={file.id}
                file={file}
                index={i}
                selected={selectedFile?.id === file.id}
                bulkChecked={bulkSelected?.has(file.id) ?? false}
                hasBulkMode={isMobile ? mobileSelectionMode : bulkSelectionEnabled}
                onCheckboxClick={handleCheckboxClick}
                onClick={() => handleRowClick(file)}
                searchQuery={searchQuery}
                renderTags={renderTags}
                actionProps={actionProps}
                onLongPress={handleLongPress}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mobile List View */}
      {files.length > 0 && viewMode === "list" && (
        <MobileListView
          files={files}
          selectedFile={selectedFile}
          bulkSelected={bulkSelected}
           hasBulkMode={mobileSelectionMode}
          allSelected={allSelected}
          someSelected={someSelected}
          handleSelectAll={handleSelectAll}
          handleRowClick={handleRowClick}
          handleLongPress={handleLongPress}
          handleCheckboxClick={handleCheckboxClick}
          searchQuery={searchQuery}
          renderTags={renderTags}
          actionProps={actionProps}
        />
      )}
    </section>
  );
}
