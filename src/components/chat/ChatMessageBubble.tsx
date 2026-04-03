import { useState, useRef } from "react";
import { Check, CheckCheck, Reply, Copy, X, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/hooks/useChat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onReply?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newText: string) => void;
  replyToMessage?: ChatMessage | null;
}

export function ChatMessageBubble({ message, isOwn, onReply, onDelete, onEdit, replyToMessage }: ChatMessageBubbleProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowOptions(true), 400);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setShowOptions(false);
  };
  const handleDelete = () => {
    onDelete?.(message.id);
    setShowOptions(false);
  };
  const handleStartEdit = () => {
    setEditText(message.text);
    setIsEditing(true);
    setShowOptions(false);
  };
  const handleSaveEdit = () => {
    if (editText.trim() && editText.trim() !== message.text) {
      onEdit?.(message.id, editText.trim());
    }
    setIsEditing(false);
  };
  const handleCancelEdit = () => {
    setEditText(message.text);
    setIsEditing(false);
  };

  const isEmojiOnly = /^[\p{Emoji}\u200d\ufe0f]{1,5}$/u.test(message.text.trim());
  const time = format(new Date(message.created_at), "h:mm a");

  // Editing mode
  if (isEditing) {
    return (
      <div className={cn("flex flex-col mb-1.5", isOwn ? "items-end" : "items-start")}>
        <div className="max-w-[80%] w-full">
          <div className="flex items-center gap-1.5 mb-1">
            <Pencil className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium text-primary">Editing message</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") handleCancelEdit();
              }}
              className="flex-1 h-8 text-xs rounded-lg"
              autoFocus
            />
            <button onClick={handleSaveEdit} className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancelEdit} className="p-1.5 rounded-md bg-secondary text-muted-foreground hover:bg-secondary/80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col group relative mb-1", isOwn ? "items-end" : "items-start")}>
      {/* Desktop hover actions — compact pill */}
      <div className={cn(
        "hidden md:flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 bg-card border border-border rounded-full shadow-sm overflow-hidden",
        isOwn ? "right-2" : "left-2"
      )}>
        <button onClick={() => onReply?.(message)} className="p-1.5 hover:bg-secondary text-muted-foreground transition-colors" title="Reply">
          <Reply className="w-3 h-3" />
        </button>
        <button onClick={handleCopy} className="p-1.5 hover:bg-secondary text-muted-foreground transition-colors" title="Copy">
          <Copy className="w-3 h-3" />
        </button>
        {isOwn && (
          <>
            <button onClick={handleStartEdit} className="p-1.5 hover:bg-secondary text-muted-foreground transition-colors" title="Edit">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={handleDelete} className="p-1.5 hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Bubble */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={(e) => { e.preventDefault(); setShowOptions(true); }}
        className={cn(
          "max-w-[75%] relative select-none",
          isEmojiOnly
            ? "text-3xl px-1 py-0.5"
            : cn(
                "rounded-2xl px-3.5 py-2 text-sm",
                isOwn
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              )
        )}
      >
        {/* ─── Messenger-style reply reference ─── */}
        {replyToMessage && (
          <div className={cn(
            "mb-1.5 -mx-1 -mt-0.5 rounded-lg overflow-hidden",
            isOwn ? "bg-primary-foreground/10" : "bg-foreground/[0.04]"
          )}>
            <div className="flex items-stretch gap-0">
              <div className={cn(
                "w-[3px] shrink-0 rounded-full",
                isOwn ? "bg-primary-foreground/40" : "bg-primary/60"
              )} />
              <div className="px-2.5 py-1.5 min-w-0">
                <p className={cn(
                  "text-[10px] font-semibold mb-0.5 truncate",
                  isOwn ? "text-primary-foreground/70" : "text-primary"
                )}>
                  {replyToMessage.sender_id === message.sender_id ? "You" : "Them"}
                </p>
                <p className={cn(
                  "text-[11px] truncate leading-tight",
                  isOwn ? "text-primary-foreground/55" : "text-muted-foreground"
                )}>
                  {replyToMessage.text.startsWith("📷 [Image]") ? "📷 Photo" : replyToMessage.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isEmojiOnly && <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>}
        {isEmojiOnly && <span>{message.text}</span>}

        {!isEmojiOnly && (
          <div className={cn("flex items-center gap-1 mt-0.5", isOwn ? "justify-end" : "justify-start")}>
            <span className={cn("text-[10px]", isOwn ? "text-primary-foreground/50" : "text-muted-foreground/70")}>
              {time}
            </span>
            {isOwn && (
              message.is_seen
                ? <CheckCheck className="w-3 h-3 text-primary-foreground/50" />
                : <Check className="w-3 h-3 text-primary-foreground/30" />
            )}
          </div>
        )}
      </div>

      {/* ─── Context Menu (mobile long-press / right-click) ─── */}
      {showOptions && (
        <>
          <div className="fixed inset-0 z-50 bg-background/20 backdrop-blur-[2px]" onClick={() => setShowOptions(false)} />
          <div className={cn(
            "absolute z-50 bg-card border border-border rounded-2xl shadow-2xl p-1 min-w-[160px] animate-scale-in",
            isOwn ? "right-0" : "left-0",
            "top-full mt-1"
          )}>
            <button
              onClick={() => { onReply?.(message); setShowOptions(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Reply className="w-4 h-4 text-muted-foreground" /> Reply
            </button>
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Copy className="w-4 h-4 text-muted-foreground" /> Copy Text
            </button>
            {isOwn && (
              <>
                <button
                  onClick={handleStartEdit}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" /> Edit
                </button>
                <div className="h-px bg-border/40 mx-2 my-0.5" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
