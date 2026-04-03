import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Package, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Chat } from "@/hooks/useChat";

interface ChatInboxProps {
  chats: Chat[];
  loading: boolean;
  activeChatId: string | null;
  onSelect: (id: string) => void;
  currentUserId: string;
}

export function ChatInbox({ chats, loading, activeChatId, onSelect, currentUserId }: ChatInboxProps) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? chats.filter(c => {
        const name = c.other_user?.display_name || c.other_user?.email || "";
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : chats;

  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-11 h-11 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 h-9 rounded-full bg-secondary/50 border-border/40 text-xs"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center min-h-[200px]">
            <div>
              <MessageCircle className="w-10 h-10 text-muted-foreground/15 mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground mb-0.5">
                {search ? "No results found" : "No conversations yet"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {search ? "Try a different search term" : "Start chatting from the marketplace"}
              </p>
            </div>
          </div>
        ) : (
          filtered.map((chat) => {
            const other = chat.other_user;
            const initial = (other?.display_name || other?.email || "?")[0]?.toUpperCase();
            const isActive = chat.id === activeChatId;
            const hasUnread = (chat.unread_count || 0) > 0;

            return (
              <button
                key={chat.id}
                onClick={() => onSelect(chat.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left",
                  isActive && "bg-primary/5",
                  hasUnread && !isActive && "bg-secondary/20"
                )}
              >
                <div className="relative">
                  <Avatar className="w-11 h-11">
                    {other?.avatar_url && <AvatarImage src={other.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initial}</AvatarFallback>
                  </Avatar>
                  {/* Online dot */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn("text-sm truncate", hasUnread ? "font-bold text-foreground" : "font-medium text-foreground")}>
                      {other?.display_name || other?.email || "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {chat.last_message_at ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: false }) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {chat.product && <Package className="w-3 h-3 text-primary shrink-0" />}
                    <p className={cn(
                      "text-xs truncate flex-1",
                      hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {chat.last_message || "No messages yet"}
                    </p>
                    {hasUnread && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
