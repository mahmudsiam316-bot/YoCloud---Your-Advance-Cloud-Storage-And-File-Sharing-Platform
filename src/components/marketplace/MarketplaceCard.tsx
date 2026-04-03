import { motion } from "framer-motion";
import { Heart, Download, Bookmark, Eye, FileText, Image as ImageIcon, Video, Music, MessageCircle } from "lucide-react";
import { getCloudinaryUrl } from "@/hooks/useCloudinary";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { MarketplaceListing } from "@/hooks/useMarketplace";

interface MarketplaceCardProps {
  listing: MarketplaceListing;
  onClick: () => void;
  onLike?: () => void;
}

function getIcon(mime: string | null) {
  if (!mime) return FileText;
  if (mime.startsWith("image")) return ImageIcon;
  if (mime.startsWith("video")) return Video;
  if (mime.startsWith("audio")) return Music;
  return FileText;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export function MarketplaceCard({ listing, onClick, onLike }: MarketplaceCardProps) {
  const file = listing.file;
  const isImage = file?.mime_type?.startsWith("image");
  const thumbUrl = isImage && file?.cloudinary_url
    ? getCloudinaryUrl(file.cloudinary_url, { width: 400, height: 300, crop: "fill" })
    : listing.thumbnail_url;
  const Icon = getIcon(file?.mime_type);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-secondary/40 overflow-hidden">
        {thumbUrl ? (
          <img src={thumbUrl} alt={listing.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-16 h-16 text-muted-foreground/20" />
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Category badge */}
        {listing.category && (
          <div className="absolute top-2.5 left-2.5">
            <Badge variant="secondary" className="bg-card/80 backdrop-blur-sm text-xs font-medium">
              {listing.category.icon} {listing.category.name}
            </Badge>
          </div>
        )}

        {/* Like button */}
        <button
          onClick={e => { e.stopPropagation(); onLike?.(); }}
          className={cn(
            "absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-sm transition-all",
            listing.user_liked ? "bg-red-500/90 text-white" : "bg-card/70 text-muted-foreground hover:bg-card/90"
          )}
        >
          <Heart className={cn("w-4 h-4", listing.user_liked && "fill-current")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">{listing.title}</h3>
        {listing.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">{listing.description}</p>
        )}

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {listing.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary font-medium">#{tag}</span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {formatCount(listing.like_count)}</span>
          <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {formatCount(listing.download_count)}</span>
          <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" /> {formatCount(listing.save_count)}</span>
        </div>

        {/* Uploader + Chat */}
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border/50">
          {listing.profile && (
            <>
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                {(listing.profile.display_name || listing.profile.email || "?")[0]?.toUpperCase()}
              </div>
              <span className="text-xs text-muted-foreground truncate flex-1">{listing.profile.display_name || listing.profile.email}</span>
            </>
          )}
          {!listing.profile && <div className="flex-1" />}
          {user && listing.user_id !== user.id && (
            <button
              onClick={e => {
                e.stopPropagation();
                navigate(`/marketplace/chat/${listing.user_id}?productId=${listing.id}`);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors"
            >
              <MessageCircle className="w-3 h-3" /> Chat
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
