import { useState, useMemo } from "react";
import { MessageSquare, Send, Reply, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useFileComments, useAddComment, useDeleteComment } from "@/hooks/useComments";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface FileCommentsProps {
  fileId: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getInitials(email: string): string {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

export function FileComments({ fileId, defaultCollapsed = false }: FileCommentsProps & { defaultCollapsed?: boolean }) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useFileComments(fileId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  const rootComments = useMemo(
    () => (comments ?? []).filter((c) => !c.parent_comment_id),
    [comments]
  );

  const getReplies = (parentId: string) =>
    (comments ?? []).filter((c) => c.parent_comment_id === parentId);

  const handleSubmit = () => {
    if (!text.trim()) return;
    addComment.mutate(
      { fileId, content: text, parentCommentId: replyTo },
      { onSuccess: () => { setText(""); setReplyTo(null); } }
    );
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Comments {comments && comments.length > 0 && `(${comments.length})`}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : rootComments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
              {rootComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={getReplies(comment.id)}
                  currentUserId={user?.id}
                  onReply={() => setReplyTo(comment.id)}
                  onDelete={(id) => deleteComment.mutate({ commentId: id, fileId })}
                />
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              {replyTo && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] text-primary">Replying to comment</span>
                  <button onClick={() => setReplyTo(null)} className="text-[10px] text-muted-foreground hover:text-destructive">✕</button>
                </div>
              )}
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                placeholder="Add a comment..."
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!text.trim() || addComment.isPending}
              className="h-9 w-9 p-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  onReply,
  onDelete,
}: {
  comment: any;
  replies: any[];
  currentUserId?: string;
  onReply: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
          {getInitials(comment.user_email)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-foreground">{comment.user_email.split("@")[0]}</span>
            <span className="text-[10px] text-muted-foreground font-mono-data">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-xs text-foreground/80 mt-0.5 break-words">{comment.content}</p>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={onReply} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
              <Reply className="w-3 h-3" /> Reply
            </button>
            {currentUserId === comment.user_id && (
              <button onClick={() => onDelete(comment.id)} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-8 mt-2 space-y-2 border-l-2 border-border pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-secondary text-muted-foreground text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {getInitials(reply.user_email)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-foreground">{reply.user_email.split("@")[0]}</span>
                  <span className="text-[9px] text-muted-foreground font-mono-data">{timeAgo(reply.created_at)}</span>
                </div>
                <p className="text-[11px] text-foreground/80 mt-0.5 break-words">{reply.content}</p>
                {currentUserId === reply.user_id && (
                  <button onClick={() => onDelete(reply.id)} className="text-[9px] text-muted-foreground hover:text-destructive mt-0.5">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
