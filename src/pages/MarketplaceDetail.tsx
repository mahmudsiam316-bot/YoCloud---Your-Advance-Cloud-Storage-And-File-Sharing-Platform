import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Download, Bookmark, Copy, Calendar, HardDrive, FileText, Image as ImageIcon, Video, Music, MessageCircle, ExternalLink, Eye, Star, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketplaceComments } from "@/components/marketplace/MarketplaceComments";
import { useMarketplaceListing, useToggleLike, useToggleSave, useIncrementDownload } from "@/hooks/useMarketplace";
import { getCloudinaryUrl } from "@/hooks/useCloudinary";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

function getIcon(mime: string | null) {
  if (!mime) return FileText;
  if (mime.startsWith("image")) return ImageIcon;
  if (mime.startsWith("video")) return Video;
  if (mime.startsWith("audio")) return Music;
  return FileText;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, s = bytes;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(1)} ${units[i]}`;
}

export default function MarketplaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: listing, isLoading } = useMarketplaceListing(id || null);
  const toggleLike = useToggleLike();
  const toggleSave = useToggleSave();
  const incrementDownload = useIncrementDownload();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="aspect-video rounded-2xl" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">File not found</h2>
          <Button variant="outline" onClick={() => navigate("/marketplace")}>Back to Marketplace</Button>
        </div>
      </div>
    );
  }

  const file = listing.file;
  const isImage = file?.mime_type?.startsWith("image");
  const isVideo = file?.mime_type?.startsWith("video");
  const Icon = getIcon(file?.mime_type);

  const previewUrl = isImage && file?.cloudinary_url
    ? getCloudinaryUrl(file.cloudinary_url, { width: 900, height: 600 })
    : null;

  const handleDownload = async () => {
    if (!file?.cloudinary_url) return;
    incrementDownload.mutate(listing.id);
    const link = document.createElement("a");
    link.href = file.cloudinary_url;
    link.download = file.name || "download";
    link.target = "_blank";
    link.click();
    toast.success("Download started!");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 md:px-8 flex items-center gap-3 h-14">
          <button onClick={() => navigate("/marketplace")} className="p-1.5 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground truncate flex-1">{listing.title}</span>
          <button onClick={handleCopyLink} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-5">
        {/* Preview */}
        <div className="rounded-2xl border border-border overflow-hidden bg-secondary/20 mb-5">
          {previewUrl ? (
            <img src={previewUrl} alt={listing.title} className="w-full aspect-video object-contain bg-secondary/30" />
          ) : isVideo && file?.cloudinary_url ? (
            <video src={file.cloudinary_url} controls className="w-full aspect-video" />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center">
              <Icon className="w-20 h-20 text-muted-foreground/15" />
            </div>
          )}
        </div>

        {/* ─── Action Row (no card, inline) ─── */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <Button onClick={handleDownload} size="sm" className="gap-1.5 text-xs rounded-full">
            <Download className="w-3.5 h-3.5" /> Download
          </Button>
          <Button
            variant={listing.user_liked ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLike.mutate({ listingId: listing.id, liked: listing.user_liked || false })}
            className="gap-1 text-xs rounded-full"
          >
            <Heart className={cn("w-3.5 h-3.5", listing.user_liked && "fill-current")} />
            {listing.like_count}
          </Button>
          <Button
            variant={listing.user_saved ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSave.mutate({ listingId: listing.id, saved: listing.user_saved || false })}
            className="gap-1 text-xs rounded-full"
          >
            <Bookmark className={cn("w-3.5 h-3.5", listing.user_saved && "fill-current")} />
            Save
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs rounded-full" onClick={handleCopyLink}>
            <Copy className="w-3.5 h-3.5" /> Link
          </Button>
          {user && listing.user_id !== user.id && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs rounded-full"
              onClick={() => navigate(`/marketplace/chat/${listing.user_id}?productId=${listing.id}`)}
            >
              <MessageCircle className="w-3.5 h-3.5" /> Chat
            </Button>
          )}
        </div>

        {/* ─── Title & Detailed Info (no card wrapper) ─── */}
        <div className="mb-5">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">{listing.title}</h1>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {listing.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary font-semibold">#{tag}</span>
              ))}
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed mb-4">{listing.description}</p>
          )}
        </div>

        {/* ─── Detailed Metadata (text-based, no cards) ─── */}
        <div className="border-t border-border/40 pt-4 mb-5 space-y-2.5">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">File Details</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Name</span>
              <span className="font-medium text-foreground truncate ml-2 max-w-[140px]">{file?.name || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Type</span>
              <span className="font-medium text-foreground">{file?.mime_type?.split("/")[1]?.toUpperCase() || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Size</span>
              <span className="font-medium text-foreground">{formatSize(file?.size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Published</span>
              <span className="font-medium text-foreground">{format(new Date(listing.created_at), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium text-foreground">{listing.category ? `${listing.category.icon} ${listing.category.name}` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Visibility</span>
              <span className="font-medium text-foreground capitalize">{listing.visibility}</span>
            </div>
          </div>
        </div>

        {/* ─── Stats (text-based row) ─── */}
        <div className="border-t border-border/40 pt-4 mb-5">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Engagement Stats</h3>
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-foreground">{listing.download_count}</span>
              <span className="text-muted-foreground">downloads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-500" />
              <span className="font-bold text-foreground">{listing.like_count}</span>
              <span className="text-muted-foreground">likes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-bold text-foreground">{listing.save_count}</span>
              <span className="text-muted-foreground">saves</span>
            </div>
          </div>
        </div>

        {/* ─── Uploader (text-based) ─── */}
        {listing.profile && (
          <div className="border-t border-border/40 pt-4 mb-5">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Published by</h3>
            <button
              onClick={() => navigate(`/marketplace/user/${listing.user_id}`)}
              className="flex items-center gap-3 hover:bg-secondary/50 rounded-lg p-2 -m-2 transition-colors w-full text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {(listing.profile.display_name || listing.profile.email || "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{listing.profile.display_name || "User"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{listing.profile.email}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          </div>
        )}

        {/* ─── Comments ─── */}
        <div className="border-t border-border/40 pt-5">
          <MarketplaceComments listingId={listing.id} />
        </div>

        {isMobile && <div className="h-24" />}
      </div>
    </div>
  );
}
