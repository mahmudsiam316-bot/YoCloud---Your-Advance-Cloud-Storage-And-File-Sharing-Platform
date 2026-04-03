import { useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Star, StarOff, Pencil, Trash2, Download, RotateCcw, XCircle, FolderInput, Eye, Link2, History, Upload, Tag, Copy, ArrowRightLeft, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import type { FileItem } from "./RecentFiles";

interface FileActionMenuProps {
  file: FileItem;
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
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${Math.round(bytes / 1e3)} KB`;
  return `${bytes} B`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getFileExtIcon(name: string, isFolder: boolean): string {
  if (isFolder) return "📁";
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", webp: "🖼️", svg: "🖼️",
    mp4: "🎬", mov: "🎬", avi: "🎬", mkv: "🎬", webm: "🎬",
    mp3: "🎵", wav: "🎵", ogg: "🎵", flac: "🎵", aac: "🎵",
    pdf: "📕", doc: "📝", docx: "📝", txt: "📄", md: "📄",
    xls: "📊", xlsx: "📊", csv: "📊",
    zip: "📦", rar: "📦", "7z": "📦",
    js: "💻", ts: "💻", py: "💻", html: "💻", css: "💻",
  };
  return map[ext || ""] || "📄";
}

function DrawerMenuItem({ icon: Icon, label, onClick, destructive, primary }: { icon: any; label: string; onClick: () => void; destructive?: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
      }}
      className={`flex items-center gap-3 w-full px-3 min-h-[44px] py-2.5 text-[13px] rounded-xl transition-all duration-150 active:scale-[0.97] ${
        destructive
          ? "text-destructive hover:bg-destructive/10 active:bg-destructive/15"
          : primary
          ? "text-primary font-semibold hover:bg-primary/10 active:bg-primary/15"
          : "text-foreground hover:bg-secondary active:bg-secondary/80"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        destructive ? "bg-destructive/10" : primary ? "bg-primary/10" : "bg-secondary"
      }`}>
        <Icon className={`w-4 h-4 ${primary ? "text-primary" : destructive ? "text-destructive" : "text-muted-foreground"}`} />
      </div>
      <span className="font-medium">{label}</span>
    </button>
  );
}

interface MobileDrawerProps {
  file: FileItem;
  onClose: () => void;
  onAction: (fn: () => void) => void;
  onStar: (f: FileItem) => void;
  onTrash: (f: FileItem) => void;
  onRestore: (f: FileItem) => void;
  onDelete: (f: FileItem) => void;
  onDownload: (f: FileItem) => void;
  onOpen?: (f: FileItem) => void;
  onRename: () => void;
  onMove?: (f: FileItem) => void;
  onShare?: (f: FileItem) => void;
  onManageTags?: (f: FileItem) => void;
  onUploadVersion?: (f: FileItem) => void;
  onVersionHistory?: (f: FileItem) => void;
  onCopyToWorkspace?: (f: FileItem) => void;
  onMoveToWorkspace?: (f: FileItem) => void;
  onPublishToMarketplace?: (f: FileItem) => void;
}

function MobileDrawer({ file, onClose, onAction, onStar, onTrash, onRestore, onDelete, onDownload, onOpen, onRename, onMove, onShare, onManageTags, onUploadVersion, onVersionHistory, onCopyToWorkspace, onMoveToWorkspace, onPublishToMarketplace }: MobileDrawerProps) {
  const touchStartY = useRef(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setTranslateY(diff);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (translateY > 80) {
      setTranslateY(500);
      setTimeout(onClose, 200);
    } else {
      setTranslateY(0);
    }
  }, [translateY, onClose]);

  const handleOverlayInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-foreground/50 animate-in fade-in duration-200"
        onClick={handleOverlayInteraction}
        onTouchEnd={handleOverlayInteraction}
      />
      <div
        ref={drawerRef}
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[75vh] overflow-y-auto pb-safe animate-in slide-in-from-bottom duration-200"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-primary/5 border border-primary/10">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg">{getFileExtIcon(file.name, !!file.is_folder)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate">{file.name}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span>{file.is_folder ? "Folder" : formatFileSize(file.size)}</span>
                <span>·</span>
                <span>{formatDate(file.created_at)}</span>
                {file.is_starred && <span>⭐</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="px-2 py-2 pb-6 space-y-0.5">
          {!file.is_trashed ? (
            <>
              {onOpen && (
                <DrawerMenuItem icon={file.is_folder ? FolderInput : Eye} label="Open" onClick={() => onAction(() => onOpen(file))} primary />
              )}
              {!file.is_folder && (
                <DrawerMenuItem icon={Download} label="Download" onClick={() => onAction(() => onDownload(file))} />
              )}
              <DrawerMenuItem icon={Pencil} label="Rename" onClick={() => onAction(onRename)} />
              {onMove && (
                <DrawerMenuItem icon={FolderInput} label="Move to folder" onClick={() => onAction(() => onMove(file))} />
              )}
              {onShare && (
                <DrawerMenuItem icon={Link2} label="Share link" onClick={() => onAction(() => onShare(file))} />
              )}
              <DrawerMenuItem
                icon={file.is_starred ? StarOff : Star}
                label={file.is_starred ? "Remove from starred" : "Add to starred"}
                onClick={() => onAction(() => onStar(file))}
              />
              {onManageTags && (
                <DrawerMenuItem icon={Tag} label="Manage tags" onClick={() => onAction(() => onManageTags(file))} />
              )}
              {!file.is_folder && (
                <>
                  <div className="h-px bg-border mx-3 my-1.5" />
                  {onUploadVersion && (
                    <DrawerMenuItem icon={Upload} label="Upload new version" onClick={() => onAction(() => onUploadVersion(file))} />
                  )}
                  {onVersionHistory && (
                    <DrawerMenuItem icon={History} label="Version history" onClick={() => onAction(() => onVersionHistory(file))} />
                  )}
                </>
              )}
              <div className="h-px bg-border mx-3 my-1.5" />
              {onCopyToWorkspace && (
                <DrawerMenuItem icon={Copy} label="Copy to workspace" onClick={() => onAction(() => onCopyToWorkspace(file))} />
              )}
              {onMoveToWorkspace && (
                <DrawerMenuItem icon={ArrowRightLeft} label="Move to workspace" onClick={() => onAction(() => onMoveToWorkspace(file))} />
              )}
              {onPublishToMarketplace && !file.is_folder && (
                <DrawerMenuItem icon={Store} label="Publish to Marketplace" onClick={() => onAction(() => onPublishToMarketplace(file))} />
              )}
              <div className="h-px bg-border mx-3 my-1.5" />
              <DrawerMenuItem icon={Trash2} label="Move to trash" onClick={() => onAction(() => onTrash(file))} destructive />
            </>
          ) : (
            <>
              <DrawerMenuItem icon={RotateCcw} label="Restore from trash" onClick={() => onAction(() => onRestore(file))} />
              <div className="h-px bg-border mx-3 my-1.5" />
              <DrawerMenuItem icon={XCircle} label="Delete permanently" onClick={() => onAction(() => onDelete(file))} destructive />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function FileActionMenu({ file, onStar, onTrash, onRestore, onDelete, onRename, onDownload, onMove, onOpen, onShare, onVersionHistory, onUploadVersion, onManageTags, onCopyToWorkspace, onMoveToWorkspace, onPublishToMarketplace }: FileActionMenuProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reopenGuardRef = useRef(0);
  const isMobile = useIsMobile();

  const handleRename = () => {
    if (newName.trim() && newName !== file.name) {
      onRename(file, newName.trim());
    }
    setRenameOpen(false);
  };

  const stopEvent = (event: any) => {
    event.stopPropagation();
  };

  const blockImmediateRetap = () => {
    reopenGuardRef.current = Date.now() + 450;
  };

  const closeAndRun = (fn: () => void) => {
    blockImmediateRetap();
    setDrawerOpen(false);
    // Run action immediately — no artificial delay
    requestAnimationFrame(() => fn());
  };

  const handleDrawerTrigger = (event: any) => {
    event.preventDefault();
    event.stopPropagation();

    if (Date.now() < reopenGuardRef.current) {
      return;
    }

    setDrawerOpen(true);
  };

  // Mobile: bottom drawer with full file details
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={handleDrawerTrigger}
          onPointerDown={stopEvent}
          onMouseDown={stopEvent}
          onTouchStart={stopEvent}
          onTouchEnd={stopEvent}
          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground active:bg-secondary/80"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {drawerOpen && createPortal(
          <MobileDrawer
            file={file}
            onClose={() => { blockImmediateRetap(); setDrawerOpen(false); }}
            onAction={(fn) => closeAndRun(fn)}
            onStar={onStar} onTrash={onTrash} onRestore={onRestore} onDelete={onDelete}
            onDownload={onDownload} onOpen={onOpen} onRename={() => { setNewName(file.name); setRenameOpen(true); }}
            onMove={onMove} onShare={onShare} onManageTags={onManageTags}
            onUploadVersion={onUploadVersion} onVersionHistory={onVersionHistory}
            onCopyToWorkspace={onCopyToWorkspace} onMoveToWorkspace={onMoveToWorkspace}
            onPublishToMarketplace={onPublishToMarketplace}
          />,
          document.body
        )}

        <ResponsiveDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          title={`Rename ${file.is_folder ? "folder" : "file"}`}
          footer={
            <>
              <Button variant="outline" onClick={() => setRenameOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleRename} className="flex-1">Rename</Button>
            </>
          }
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          </div>
        </ResponsiveDialog>
      </>
    );
  }

  // Desktop: dropdown menu
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
          {!file.is_trashed ? (
            <>
              {onOpen && (
                <DropdownMenuItem onClick={() => onOpen(file)} className="font-semibold text-primary focus:text-primary">
                  {file.is_folder ? <FolderInput className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />} Open
                  <span className="ml-auto text-[10px] font-normal text-muted-foreground/60">↵</span>
                </DropdownMenuItem>
              )}
              {!file.is_folder && (
                <DropdownMenuItem onClick={() => onDownload(file)}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { setNewName(file.name); setRenameOpen(true); }}>
                <Pencil className="w-4 h-4 mr-2" /> Rename
              </DropdownMenuItem>
              {onMove && (
                <DropdownMenuItem onClick={() => onMove(file)}>
                  <FolderInput className="w-4 h-4 mr-2" /> Move
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(file)}>
                  <Link2 className="w-4 h-4 mr-2" /> Share
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onStar(file)}>
                {file.is_starred
                  ? <><StarOff className="w-4 h-4 mr-2" /> Unstar</>
                  : <><Star className="w-4 h-4 mr-2" /> Star</>
                }
              </DropdownMenuItem>
              {onManageTags && (
                <DropdownMenuItem onClick={() => onManageTags(file)}>
                  <Tag className="w-4 h-4 mr-2" /> Tags
                </DropdownMenuItem>
              )}
              {!file.is_folder && (
                <>
                  <DropdownMenuSeparator />
                  {onUploadVersion && (
                    <DropdownMenuItem onClick={() => onUploadVersion(file)}>
                      <Upload className="w-4 h-4 mr-2" /> Upload new version
                    </DropdownMenuItem>
                  )}
                  {onVersionHistory && (
                    <DropdownMenuItem onClick={() => onVersionHistory(file)}>
                      <History className="w-4 h-4 mr-2" /> Version history
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator />
              {onCopyToWorkspace && (
                <DropdownMenuItem onClick={() => onCopyToWorkspace(file)}>
                  <Copy className="w-4 h-4 mr-2" /> Copy to workspace
                </DropdownMenuItem>
              )}
              {onMoveToWorkspace && (
                <DropdownMenuItem onClick={() => onMoveToWorkspace(file)}>
                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Move to workspace
                </DropdownMenuItem>
              )}
              {onPublishToMarketplace && !file.is_folder && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onPublishToMarketplace(file)}>
                    <Store className="w-4 h-4 mr-2" /> Publish to Marketplace
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTrash(file)} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Move to trash
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => onRestore(file)}>
                <RotateCcw className="w-4 h-4 mr-2" /> Restore
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(file)} className="text-destructive focus:text-destructive">
                <XCircle className="w-4 h-4 mr-2" /> Delete permanently
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ResponsiveDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={`Rename ${file.is_folder ? "folder" : "file"}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleRename} className="flex-1">Rename</Button>
          </>
        }
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
        </div>
      </ResponsiveDialog>
    </>
  );
}
