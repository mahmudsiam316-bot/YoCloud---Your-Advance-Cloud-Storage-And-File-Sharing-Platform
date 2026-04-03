import { useState } from "react";
import { Send, Trash2, Reply, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplaceComments, useAddMarketplaceComment, useDeleteMarketplaceComment } from "@/hooks/useMarketplace";
import { formatDistanceToNow } from "date-fns";

interface Props {
  listingId: string;
}

export function MarketplaceComments({ listingId }: Props) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useMarketplaceComments(listingId);
  const addComment = useAddMarketplaceComment();
  const deleteComment = useDeleteMarketplaceComment();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const rootComments = comments.filter(c => !c.parent_comment_id);
  const replies = (parentId: string) => comments.filter(c => c.parent_comment_id === parentId);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await addComment.mutateAsync({ listingId, content, parentId: replyTo || undefined });
    setContent("");
    setReplyTo(null);
  };

  const renderComment = (comment: any, depth = 0) => (
    <div key={comment.id} className={depth > 0 ? "ml-6 pl-3 border-l-2 border-border/50" : ""}>
      <div className="py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
            {(comment.user_email || "?")[0]?.toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-foreground">{comment.user_email?.split("@")[0]}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground/80 ml-8">{comment.content}</p>
        <div className="flex items-center gap-2 ml-8 mt-1">
          <button onClick={() => setReplyTo(comment.id)} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
            <Reply className="w-3 h-3" /> Reply
          </button>
          {user?.id === comment.user_id && (
            <button onClick={() => deleteComment.mutate({ commentId: comment.id, listingId })} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      </div>
      {replies(comment.id).map(r => renderComment(r, depth + 1))}
    </div>
  );

  return (
    <div>
      <h4 className="text-sm font-bold text-foreground mb-3">
        Comments ({comments.length})
      </h4>

      {/* Input */}
      {user && (
        <div className="mb-4">
          {replyTo && (
            <div className="flex items-center gap-1.5 mb-1.5 text-xs text-muted-foreground">
              <CornerDownRight className="w-3 h-3" />
              Replying to comment
              <button onClick={() => setReplyTo(null)} className="text-destructive hover:underline">Cancel</button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
              className="min-h-[60px]"
              maxLength={1000}
            />
            <Button size="icon" onClick={handleSubmit} disabled={!content.trim() || addComment.isPending} className="shrink-0 self-end">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex gap-2">
              <div className="w-6 h-6 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : rootComments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
      ) : (
        <div className="divide-y divide-border/50">
          {rootComments.map(c => renderComment(c))}
        </div>
      )}
    </div>
  );
}
