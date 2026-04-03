import { ExternalLink, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ChatProductCardProps {
  product: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    description: string | null;
  };
}

export function ChatProductCard({ product }: ChatProductCardProps) {
  const navigate = useNavigate();

  return (
    <div className="w-64 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {product.thumbnail_url ? (
        <img src={product.thumbnail_url} alt={product.title} className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-28 bg-secondary/30 flex items-center justify-center">
          <Package className="w-10 h-10 text-muted-foreground/20" />
        </div>
      )}
      <div className="p-2.5">
        <h4 className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">{product.title}</h4>
        {product.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="w-full h-7 text-[10px] gap-1"
          onClick={() => navigate(`/marketplace/${product.id}`)}
        >
          <ExternalLink className="w-3 h-3" /> View Product
        </Button>
      </div>
    </div>
  );
}
