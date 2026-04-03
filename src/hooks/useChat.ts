import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback, useRef } from "react";

export interface Chat {
  id: string;
  user_1: string;
  user_2: string;
  last_message: string | null;
  last_message_at: string;
  product_id: string | null;
  created_at: string;
  updated_at: string;
  other_user?: { id: string; display_name: string | null; email: string | null; avatar_url: string | null };
  unread_count?: number;
  product?: { id: string; title: string; thumbnail_url: string | null; description: string | null } | null;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  product_id: string | null;
  is_seen: boolean;
  created_at: string;
  product?: { id: string; title: string; thumbnail_url: string | null; description: string | null } | null;
}

export function useChats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chats", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;

      // Fetch other user profiles and product info
      const otherIds = [...new Set((data || []).map(c => c.user_1 === user.id ? c.user_2 : c.user_1))];
      const productIds = [...new Set((data || []).filter(c => c.product_id).map(c => c.product_id!))];

      const [profilesRes, productsRes, unreadRes] = await Promise.all([
        otherIds.length > 0
          ? supabase.from("profiles").select("id, display_name, email, avatar_url").in("id", otherIds)
          : { data: [] },
        productIds.length > 0
          ? supabase.from("marketplace_listings").select("id, title, thumbnail_url, description").in("id", productIds)
          : { data: [] },
        supabase
          .from("chat_messages")
          .select("chat_id", { count: "exact" })
          .eq("is_seen", false)
          .neq("sender_id", user.id),
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      const productMap = new Map((productsRes.data || []).map(p => [p.id, p]));

      // Count unread per chat
      let unreadMap = new Map<string, number>();
      if (unreadRes.data) {
        // Need to count per chat_id
        const { data: unreadData } = await supabase
          .from("chat_messages")
          .select("chat_id")
          .eq("is_seen", false)
          .neq("sender_id", user.id);
        if (unreadData) {
          unreadData.forEach(m => {
            unreadMap.set(m.chat_id, (unreadMap.get(m.chat_id) || 0) + 1);
          });
        }
      }

      return (data || []).map(c => ({
        ...c,
        other_user: profileMap.get(c.user_1 === user.id ? c.user_2 : c.user_1),
        unread_count: unreadMap.get(c.id) || 0,
        product: c.product_id ? productMap.get(c.product_id) : null,
      })) as Chat[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime for chats list
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chats-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chats", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return query;
}

export function useChatMessages(chatId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-messages", chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch product info for messages with product_id
      const pIds = [...new Set((data || []).filter(m => m.product_id).map(m => m.product_id!))];
      let productMap = new Map();
      if (pIds.length > 0) {
        const { data: products } = await supabase
          .from("marketplace_listings")
          .select("id, title, thumbnail_url, description")
          .in("id", pIds);
        if (products) productMap = new Map(products.map(p => [p.id, p]));
      }

      return (data || []).map(m => ({
        ...m,
        product: m.product_id ? productMap.get(m.product_id) : null,
      })) as ChatMessage[];
    },
    enabled: !!chatId,
  });

  // Realtime for messages
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`chat-msgs-${chatId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `chat_id=eq.${chatId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_messages",
        filter: `chat_id=eq.${chatId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ chatId, text, productId }: { chatId: string; text: string; productId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("chat_messages").insert({
        chat_id: chatId,
        sender_id: user.id,
        text,
        product_id: productId || null,
      } as any);
      if (error) throw error;

      // Update chat's last_message
      await supabase.from("chats").update({
        last_message: text,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any).eq("id", chatId);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", vars.chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useMarkMessagesSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ chatId, userId }: { chatId: string; userId: string }) => {
      await supabase
        .from("chat_messages")
        .update({ is_seen: true } as any)
        .eq("chat_id", chatId)
        .neq("sender_id", userId)
        .eq("is_seen", false);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", vars.chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useGetOrCreateChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ otherUserId, productId }: { otherUserId: string; productId?: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Ensure consistent ordering
      const [u1, u2] = [user.id, otherUserId].sort();

      // Check existing chat
      const { data: existing } = await supabase
        .from("chats")
        .select("*")
        .eq("user_1", u1)
        .eq("user_2", u2)
        .maybeSingle();

      if (existing) return existing.id as string;

      // Create new
      const { data, error } = await supabase
        .from("chats")
        .insert({
          user_1: u1,
          user_2: u2,
          product_id: productId || null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useTypingIndicator(chatId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!chatId || !user) return;

    const channel = supabase.channel(`typing-${chatId}`, {
      config: { presence: { key: user.id } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const typing = Object.keys(state).filter(k => k !== user.id);
      setTypingUsers(typing);
    }).subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [chatId, user?.id]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !user) return;
    if (isTyping) {
      channelRef.current.track({ typing: true });
    } else {
      channelRef.current.untrack();
    }
  }, [user?.id]);

  return { typingUsers, setTyping };
}

export function useUnreadChatCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat-unread-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("is_seen", false)
        .neq("sender_id", user.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, chatId }: { messageId: string; chatId: string }) => {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
      return chatId;
    },
    onSuccess: (chatId) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, chatId, text }: { messageId: string; chatId: string; text: string }) => {
      const { error } = await supabase
        .from("chat_messages")
        .update({ text } as any)
        .eq("id", messageId);
      if (error) throw error;
      return chatId;
    },
    onSuccess: (chatId) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
    },
  });
}
