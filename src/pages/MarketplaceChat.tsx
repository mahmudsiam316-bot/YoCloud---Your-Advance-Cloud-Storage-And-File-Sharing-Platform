import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle, Reply, X, ChevronDown, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  useChats,
  useChatMessages,
  useSendMessage,
  useGetOrCreateChat,
  useMarkMessagesSeen,
  useTypingIndicator,
  useUnreadChatCount,
  useDeleteMessage,
  useEditMessage,
  type Chat,
  type ChatMessage,
} from "@/hooks/useChat";
import { ChatInbox } from "@/components/chat/ChatInbox";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ChatProductCard } from "@/components/chat/ChatProductCard";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

export default function MarketplaceChat() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("productId");
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [initialSent, setInitialSent] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: chats, isLoading: chatsLoading } = useChats();
  const { data: messages, isLoading: msgsLoading } = useChatMessages(activeChatId);
  const { data: totalUnread } = useUnreadChatCount();
  const sendMessage = useSendMessage();
  const getOrCreateChat = useGetOrCreateChat();
  const markSeen = useMarkMessagesSeen();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const { typingUsers, setTyping } = useTypingIndicator(activeChatId);

  // Build a message lookup map for reply references
  const messageMap = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    messages?.forEach(m => map.set(m.id, m));
    return map;
  }, [messages]);

  useEffect(() => {
    if (userId && user && userId !== user.id) {
      getOrCreateChat.mutate(
        { otherUserId: userId, productId: productId || undefined },
        { onSuccess: (chatId) => setActiveChatId(chatId) }
      );
    }
  }, [userId, user?.id, productId]);

  useEffect(() => {
    if (activeChatId && productId && !initialSent && messages && messages.length === 0) {
      sendMessage.mutate({ chatId: activeChatId, text: "I want to know more about this", productId });
      setInitialSent(true);
    }
  }, [activeChatId, productId, initialSent, messages]);

  useEffect(() => {
    if (activeChatId && user) {
      markSeen.mutate({ chatId: activeChatId, userId: user.id });
    }
  }, [activeChatId, messages?.length, user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages?.length]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 150);
    }
  }, []);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  const handleSend = () => {
    if (!messageText.trim() || !activeChatId) return;
    // Store reply reference as prefix metadata (parsed in bubble)
    const text = replyTo
      ? `[reply:${replyTo.id}]\n${messageText.trim()}`
      : messageText.trim();
    sendMessage.mutate({ chatId: activeChatId, text });
    setMessageText("");
    setReplyTo(null);
    setTyping(false);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback((messageId: string) => {
    if (!activeChatId) return;
    deleteMessage.mutate({ messageId, chatId: activeChatId }, {
      onSuccess: () => toast.success("Message deleted"),
      onError: () => toast.error("Failed to delete message"),
    });
  }, [activeChatId, deleteMessage]);

  const handleEdit = useCallback((messageId: string, newText: string) => {
    if (!activeChatId) return;
    editMessage.mutate({ messageId, chatId: activeChatId, text: newText }, {
      onSuccess: () => toast.success("Message edited"),
      onError: () => toast.error("Failed to edit message"),
    });
  }, [activeChatId, editMessage]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images are supported"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `chat-images/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("user-files").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("user-files").getPublicUrl(path);
      sendMessage.mutate({ chatId: activeChatId, text: `📷 [Image](${urlData.publicUrl})` });
      toast.success("Image sent");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const activeChat = chats?.find(c => c.id === activeChatId);
  const otherUser = activeChat?.other_user;
  const showInbox = isMobile ? !activeChatId : true;
  const showChat = isMobile ? !!activeChatId : true;

  // Parse reply reference from message text
  const parseMessage = (msg: ChatMessage): { replyToMessage: ChatMessage | null; displayText: string } => {
    const replyMatch = msg.text.match(/^\[reply:([a-f0-9-]+)\]\n([\s\S]*)$/);
    if (replyMatch) {
      const replyMsg = messageMap.get(replyMatch[1]) || null;
      return { replyToMessage: replyMsg, displayText: replyMatch[2] };
    }
    return { replyToMessage: null, displayText: msg.text };
  };

  // Group messages by date
  const groupedMessages: { label: string; messages: ChatMessage[] }[] = [];
  if (messages) {
    let currentLabel = "";
    for (const msg of messages) {
      const label = getDateLabel(new Date(msg.created_at));
      if (label !== currentLabel) {
        currentLabel = label;
        groupedMessages.push({ label, messages: [msg] });
      } else {
        groupedMessages[groupedMessages.length - 1].messages.push(msg);
      }
    }
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col">
      {/* ─── Top Header (inbox view) ─── */}
      {(!isMobile || !activeChatId) && (
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-3 h-14">
            <button onClick={() => navigate("/marketplace")} className="p-1.5 rounded-lg hover:bg-secondary">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="relative">
              <MessageCircle className="w-5 h-5 text-primary" />
              {(totalUnread || 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                  {totalUnread! > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <h1 className="font-bold text-foreground text-base">Messages</h1>
          </div>
        </div>
      )}

      <div className="flex-1 flex max-w-6xl mx-auto w-full overflow-hidden">
        {/* ─── Inbox ─── */}
        {showInbox && (
          <div className={cn("border-r border-border/40 flex flex-col", isMobile ? "w-full" : "w-80 shrink-0")}>
            <ChatInbox
              chats={chats || []}
              loading={chatsLoading}
              activeChatId={activeChatId}
              onSelect={(id) => { setActiveChatId(id); setReplyTo(null); }}
              currentUserId={user?.id || ""}
            />
          </div>
        )}

        {/* ─── Chat Area ─── */}
        {showChat && (
          <div className={cn("flex-1 flex flex-col min-w-0", !activeChatId && !isMobile && "items-center justify-center")}>
            {!activeChatId ? (
              <div className="text-center p-8">
                <MessageCircle className="w-16 h-16 text-muted-foreground/10 mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-1">Select a conversation</h3>
                <p className="text-sm text-muted-foreground">Choose a chat from the sidebar to start messaging</p>
              </div>
            ) : (
              <>
                {/* ─── Chat header (FIXED) ─── */}
                <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5 border-b border-border/40 bg-background/95 backdrop-blur-xl shrink-0">
                  {isMobile && (
                    <button onClick={() => { setActiveChatId(null); setReplyTo(null); }} className="p-1 rounded-lg hover:bg-secondary">
                      <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                  <div className="relative">
                    <Avatar className="w-9 h-9">
                      {otherUser?.avatar_url && <AvatarImage src={otherUser.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {(otherUser?.display_name || otherUser?.email || "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background bg-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {otherUser?.display_name || otherUser?.email || "Chat"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {typingUsers.length > 0 ? (
                        <span className="text-primary font-medium animate-pulse">typing...</span>
                      ) : "Active now"}
                    </p>
                  </div>
                </div>

                {/* ─── Messages ─── */}
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto px-4 py-3 relative"
                  style={{ backgroundImage: "radial-gradient(circle at 50% 50%, hsl(var(--secondary) / 0.3) 0%, transparent 70%)" }}
                >
                  {msgsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                          <Skeleton className="h-10 w-48 rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  ) : messages && messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center min-h-[300px]">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-3">
                          <MessageCircle className="w-8 h-8 text-primary/30" />
                        </div>
                        <h3 className="font-semibold text-foreground text-sm mb-1">No messages yet</h3>
                        <p className="text-xs text-muted-foreground max-w-[200px]">Say hello! Start the conversation.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {groupedMessages.map((group, gi) => (
                        <div key={gi}>
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-border/40" />
                            <span className="text-[10px] font-semibold text-muted-foreground bg-background px-2.5 py-0.5 rounded-full border border-border/40">
                              {group.label}
                            </span>
                            <div className="flex-1 h-px bg-border/40" />
                          </div>
                          {group.messages.map((msg) => {
                            const { replyToMessage, displayText } = parseMessage(msg);
                            const displayMsg = { ...msg, text: displayText };

                            return (
                              <div key={msg.id}>
                                {msg.product && (
                                  <div className={cn("mb-2", msg.sender_id === user?.id ? "flex justify-end" : "flex justify-start")}>
                                    <ChatProductCard product={msg.product} />
                                  </div>
                                )}
                                {displayText.startsWith("📷 [Image](") ? (
                                  <div className={cn("flex mb-1", msg.sender_id === user?.id ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                      "max-w-[75%] rounded-2xl overflow-hidden",
                                      msg.sender_id === user?.id ? "rounded-br-md" : "rounded-bl-md"
                                    )}>
                                      <img
                                        src={displayText.match(/\((.+)\)/)?.[1] || ""}
                                        alt="Shared image"
                                        className="max-w-full max-h-64 object-cover rounded-2xl"
                                        loading="lazy"
                                      />
                                      <div className={cn("flex items-center gap-1 px-2 py-1", msg.sender_id === user?.id ? "justify-end" : "justify-start")}>
                                        <span className="text-[10px] text-muted-foreground">
                                          {format(new Date(msg.created_at), "h:mm a")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <ChatMessageBubble
                                    message={displayMsg}
                                    isOwn={msg.sender_id === user?.id}
                                    onReply={handleReply}
                                    onDelete={handleDelete}
                                    onEdit={handleEdit}
                                    replyToMessage={replyToMessage}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}

                  {typingUsers.length > 0 && (
                    <div className="flex justify-start mt-1">
                      <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-2.5">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scroll to bottom */}
                {showScrollBtn && (
                  <div className="absolute bottom-24 right-6 z-10">
                    <button
                      onClick={scrollToBottom}
                      className="w-9 h-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                )}

                {/* ─── Messenger-style Reply Preview ─── */}
                {replyTo && (
                  <div className="border-t border-border/40 bg-card/80 backdrop-blur-sm shrink-0 animate-fade-in">
                    <div className="flex items-stretch gap-0 mx-4 my-2">
                      <div className="w-[3px] shrink-0 rounded-full bg-primary" />
                      <div className="flex-1 min-w-0 px-3 py-1.5">
                        <p className="text-[10px] font-semibold text-primary mb-0.5">
                          {replyTo.sender_id === user?.id ? "Replying to yourself" : `Replying to ${otherUser?.display_name || otherUser?.email || "them"}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {replyTo.text.startsWith("📷 [Image]") ? "📷 Photo" : replyTo.text.slice(0, 80)}
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="self-center p-1 rounded-full hover:bg-secondary text-muted-foreground shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── Input bar (FIXED) ─── */}
                <div className={cn(
                  "border-t border-border/40 bg-background/95 backdrop-blur-xl p-3 shrink-0",
                  isMobile && "pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
                )}>
                  <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className={cn(
                        "p-2 rounded-full shrink-0 transition-colors text-muted-foreground hover:bg-secondary",
                        uploadingImage && "opacity-50"
                      )}
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <Input
                      ref={inputRef}
                      value={messageText}
                      onChange={(e) => { setMessageText(e.target.value); setTyping(e.target.value.length > 0); }}
                      onKeyDown={handleKeyDown}
                      placeholder={replyTo ? "Type your reply..." : "Aa"}
                      className="flex-1 rounded-full bg-secondary/50 border-border/50 text-sm h-10"
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!messageText.trim() || sendMessage.isPending}
                      className="rounded-full shrink-0 w-10 h-10"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
