import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Heart, FileText, User, Bookmark, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useUserMarketplaceProfile } from "@/hooks/useMarketplace";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCloudinaryUrl } from "@/hooks/useCloudinary";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToggleLike } from "@/hooks/useMarketplace";
import { useAuth } from "@/hooks/useAuth";

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function formatSize(bytes: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, s = bytes;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(1)} ${units[i]}`;
}

export default function MarketplaceUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const toggleLike = useToggleLike();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).single();
      return data;
    },
  });

  const { data: mpProfile, isLoading } = useUserMarketplaceProfile(userId || null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 md:px-8 flex items-center gap-3 h-14">
          <button onClick={() => navigate("/marketplace")} className="p-1.5 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">User Profile</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {/* Profile header */}
        <div className="rounded-2xl border border-border p-6 bg-card mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {(profile?.display_name || profile?.email || "?")[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{profile?.display_name || "User"}</h1>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-lg font-bold text-foreground">{mpProfile?.totalUploads || 0}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">Uploads</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-lg font-bold text-foreground">{mpProfile?.totalDownloads || 0}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">Downloads</p>
            </div>
            <div className="rounded-xl bg-secondary/40 p-3">
              <p className="text-lg font-bold text-foreground">{mpProfile?.totalLikes || 0}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">Likes</p>
            </div>
          </div>
        </div>

        {/* Published files */}
        <h2 className="text-sm font-bold text-foreground mb-3">Published Files ({mpProfile?.listings?.length || 0})</h2>
        {mpProfile?.listings && mpProfile.listings.length > 0 ? (
          <>
            {/* Desktop grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mpProfile.listings.map((listing: any) => {
                const file = listing.files;
                const isImage = file?.mime_type?.startsWith("image");
                const thumbUrl = isImage && file?.cloudinary_url
                  ? getCloudinaryUrl(file.cloudinary_url, { width: 400, height: 300, crop: "fill" })
                  : listing.thumbnail_url;

                return (
                  <motion.div
                    key={listing.id}
                    whileHover={{ y: -4, scale: 1.01 }}
                    onClick={() => navigate(`/marketplace/${listing.id}`)}
                    className="group cursor-pointer rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-shadow"
                  >
                    <div className="relative aspect-[4/3] bg-secondary/40 overflow-hidden">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={listing.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-16 h-16 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-3.5">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">{listing.title}</h3>
                      {listing.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{listing.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {formatCount(listing.like_count)}</span>
                        <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {formatCount(listing.download_count)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Mobile detailed list with separators */}
            <div className="md:hidden">
              {mpProfile.listings.map((listing: any, index: number) => {
                const file = listing.files;
                const isImage = file?.mime_type?.startsWith("image");
                const thumbUrl = isImage && file?.cloudinary_url
                  ? getCloudinaryUrl(file.cloudinary_url, { width: 200, height: 150, crop: "fill" })
                  : listing.thumbnail_url;

                return (
                  <div key={listing.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => navigate(`/marketplace/${listing.id}`)}
                      className="flex gap-3 py-3.5 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="w-[88px] h-[88px] rounded-xl bg-secondary/40 overflow-hidden shrink-0">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={listing.title} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-muted-foreground/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground line-clamp-1">{listing.title}</h3>
                        {listing.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{listing.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                          <span>{file?.mime_type?.split("/")[1]?.toUpperCase() || "FILE"}</span>
                          <span>•</span>
                          <span>{formatSize(file?.size)}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Heart className="w-3 h-3" /> {formatCount(listing.like_count)}</span>
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Download className="w-3 h-3" /> {formatCount(listing.download_count)}</span>
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Bookmark className="w-3 h-3" /> {formatCount(listing.save_count)}</span>
                        </div>
                      </div>
                    </motion.div>
                    {index < mpProfile.listings.length - 1 && (
                      <div className="h-px w-full bg-border/60" />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <User className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No published files yet</p>
          </div>
        )}

        {isMobile && <div className="h-24" />}
      </div>
    </div>
  );
}
