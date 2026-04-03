import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Eye, ExternalLink, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyMarketplaceListings, useUnpublishListing } from "@/hooks/useMarketplace";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";

export default function MyMarketplaceListings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: listings, isLoading } = useMyMarketplaceListings();
  const unpublish = useUnpublishListing();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 md:px-8 flex items-center gap-3 h-14">
          <button onClick={() => navigate("/marketplace")} className="p-1.5 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">My Listings</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : !listings?.length ? (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-bold text-foreground mb-1">No listings yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Publish files from your storage to the marketplace</p>
            <Button onClick={() => navigate("/")}>Go to My Files</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {listings.map((listing: any) => (
              <div key={listing.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                  {listing.marketplace_categories?.icon || "📁"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{listing.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>↓ {listing.download_count}</span>
                    <span>❤ {listing.like_count}</span>
                    <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <Badge variant={listing.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">{listing.visibility}</Badge>
                <button onClick={() => navigate(`/marketplace/${listing.id}`)} className="p-1.5 rounded-lg hover:bg-secondary shrink-0">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => { if (confirm("Remove from marketplace?")) unpublish.mutate(listing.id); }}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {isMobile && <div className="h-24" />}
      </div>
    </div>
  );
}
