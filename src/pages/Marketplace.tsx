import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Clock, TrendingUp, Store, X, Home, Palette, MessagesSquare, LayoutGrid, Plus, Heart, Download, Bookmark, FileText, Image as ImageIcon, Video, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplaceListings, useMarketplaceCategories, useToggleLike } from "@/hooks/useMarketplace";
import { useUnreadChatCount } from "@/hooks/useChat";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { getCloudinaryUrl } from "@/hooks/useCloudinary";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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

function formatSize(bytes: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, s = bytes;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(1)} ${units[i]}`;
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const debouncedSearch = useDebounce(search, 300);

  const { data: categories } = useMarketplaceCategories();
  const toggleLike = useToggleLike();
  const { data: unreadChatCount } = useUnreadChatCount();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMarketplaceListings({
    search: debouncedSearch || undefined,
    category: category || undefined,
    sort,
  });

  const listings = data?.pages.flat() || [];

  const observerRef = useRef<IntersectionObserver>();
  const lastRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
    });
    if (node) observerRef.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center h-14">
            <h1 className="font-bold text-foreground text-lg">Marketplace</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
        {/* Hero search */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-foreground mb-1">Discover & Download</h2>
          <p className="text-xs text-muted-foreground mb-3">Browse thousands of free files shared by the community. Download, like, and connect with creators.</p>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files, categories, tags..."
              className="pl-10 h-11 rounded-xl bg-secondary/50 border-border/50 focus:bg-card"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1 -mx-1 px-1">
          <button
            onClick={() => setCategory("")}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
              !category ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {categories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(category === cat.id ? "" : cat.id)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
                category === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Sort / Filter bar */}
        <div className="flex items-center gap-2 mb-5">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-auto h-8 text-xs gap-1.5 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest"><Clock className="w-3 h-3 inline mr-1" /> Newest</SelectItem>
              <SelectItem value="most_downloaded"><TrendingUp className="w-3 h-3 inline mr-1" /> Most Downloaded</SelectItem>
              <SelectItem value="most_liked">❤️ Most Liked</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">{listings.length} files</span>
        </div>

        {/* Listings — responsive grid on desktop, list on mobile */}
        {isLoading ? (
          <>
            {/* Desktop skeleton grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
            {/* Mobile skeleton list */}
            <div className="md:hidden space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl border border-border">
                  <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-muted-foreground/15 mx-auto mb-4" />
            <h3 className="font-bold text-foreground mb-1">No files found</h3>
            <p className="text-sm text-muted-foreground">Be the first to publish something!</p>
          </div>
        ) : (
          <>
            {/* ── Desktop: Card Grid ── */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {listings.map((listing, index) => {
                const file = listing.file;
                const isImage = file?.mime_type?.startsWith("image");
                const thumbUrl = isImage && file?.cloudinary_url
                  ? getCloudinaryUrl(file.cloudinary_url, { width: 400, height: 300, crop: "fill" })
                  : listing.thumbnail_url;
                const Icon = getIcon(file?.mime_type);

                return (
                  <motion.div
                    key={listing.id}
                    ref={index === listings.length - 1 ? lastRef : undefined}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                    onClick={() => navigate(`/marketplace/${listing.id}`)}
                    className="group cursor-pointer rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-shadow"
                  >
                    {/* Card Thumbnail */}
                    <div className="relative aspect-[4/3] bg-secondary/40 overflow-hidden">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={listing.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon className="w-16 h-16 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {listing.category && (
                        <div className="absolute top-2.5 left-2.5">
                          <span className="bg-card/80 backdrop-blur-sm text-xs font-medium px-2 py-0.5 rounded-full">
                            {listing.category.icon} {listing.category.name}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); toggleLike.mutate({ listingId: listing.id, liked: listing.user_liked || false }); }}
                        className={cn(
                          "absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-sm transition-all",
                          listing.user_liked ? "bg-red-500/90 text-white" : "bg-card/70 text-muted-foreground hover:bg-card/90"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", listing.user_liked && "fill-current")} />
                      </button>
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-1">{listing.title}</h3>
                      {listing.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{listing.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        <span>{file?.mime_type?.split("/")[1]?.toUpperCase() || "FILE"}</span>
                        <span>•</span>
                        <span>{formatSize(file?.size)}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
                      </div>
                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {listing.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary font-medium">#{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {formatCount(listing.like_count)}</span>
                        <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {formatCount(listing.download_count)}</span>
                        <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" /> {formatCount(listing.save_count)}</span>
                      </div>
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
                            <MessagesSquare className="w-3 h-3" /> Chat
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Mobile: Detailed List with Separators ── */}
            <div className="md:hidden">
              {listings.map((listing, index) => {
                const file = listing.file;
                const isImage = file?.mime_type?.startsWith("image");
                const thumbUrl = isImage && file?.cloudinary_url
                  ? getCloudinaryUrl(file.cloudinary_url, { width: 200, height: 150, crop: "fill" })
                  : listing.thumbnail_url;
                const Icon = getIcon(file?.mime_type);

                return (
                  <div key={listing.id}>
                    <motion.div
                      ref={index === listings.length - 1 ? lastRef : undefined}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => navigate(`/marketplace/${listing.id}`)}
                      className="flex gap-3 py-3.5 cursor-pointer group active:scale-[0.98] transition-transform"
                    >
                      <div className="w-[88px] h-[88px] rounded-xl bg-secondary/40 overflow-hidden shrink-0 relative">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={listing.title} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-8 h-8 text-muted-foreground/20" />
                          </div>
                        )}
                        {listing.category && (
                          <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full bg-card/80 backdrop-blur-sm font-medium">
                            {listing.category.icon}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground line-clamp-1">{listing.title}</h3>
                          <button
                            onClick={e => { e.stopPropagation(); toggleLike.mutate({ listingId: listing.id, liked: listing.user_liked || false }); }}
                            className={cn("p-1 rounded-full shrink-0 transition-colors", listing.user_liked ? "text-red-500" : "text-muted-foreground hover:text-red-500")}
                          >
                            <Heart className={cn("w-3.5 h-3.5", listing.user_liked && "fill-current")} />
                          </button>
                        </div>
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
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Heart className="w-3 h-3" /> {formatCount(listing.like_count)}</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Download className="w-3 h-3" /> {formatCount(listing.download_count)}</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Bookmark className="w-3 h-3" /> {formatCount(listing.save_count)}</span>
                          </div>
                          {listing.profile && (
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                                {(listing.profile.display_name || listing.profile.email || "?")[0]?.toUpperCase()}
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{listing.profile.display_name || listing.profile.email?.split("@")[0]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                    {/* Full-width separator */}
                    {index < listings.length - 1 && (
                      <div className="h-px w-full bg-border/60" />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isMobile && <div className="h-24" />}
      </div>

      {/* Marketplace Bottom Navbar - mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <nav className="relative bg-card/90 backdrop-blur-xl border-t border-border/40 px-3 pb-safe pt-1.5">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Home */}
            <button onClick={() => navigate("/")} className="flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl text-muted-foreground">
              <div className="p-1.5 rounded-xl"><Home className="w-5 h-5" /></div>
              <span className="text-[10px] font-semibold leading-tight">Home</span>
            </button>

            {/* Studio */}
            <button onClick={() => navigate("/marketplace/dashboard")} className="flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl text-muted-foreground">
              <div className="p-1.5 rounded-xl"><Palette className="w-5 h-5" /></div>
              <span className="text-[10px] font-semibold leading-tight">Studio</span>
            </button>

            {/* Center FAB - Publish */}
            <div className="relative flex items-center justify-center -mt-6">
              <motion.button
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate("/")}
                className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center ring-4 ring-card/90"
              >
                <Plus className="w-7 h-7 stroke-[2.5px]" />
              </motion.button>
            </div>

            {/* Chat */}
            <button onClick={() => navigate("/marketplace/chat")} className="flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl text-muted-foreground relative">
              <div className="p-1.5 rounded-xl">
                <MessagesSquare className="w-5 h-5" />
                {(unreadChatCount || 0) > 0 && (
                  <span className="absolute top-0 right-2 w-4 h-4 bg-destructive rounded-full text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                    {unreadChatCount! > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold leading-tight">Chat</span>
            </button>

            {/* Menu */}
            <button onClick={() => navigate("/menu")} className="flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl text-muted-foreground">
              <div className="p-1.5 rounded-xl"><LayoutGrid className="w-5 h-5" /></div>
              <span className="text-[10px] font-semibold leading-tight">Menu</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
