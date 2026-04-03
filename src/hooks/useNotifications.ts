import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  is_pinned: boolean;
  read_at: string | null;
  related_file_id: string | null;
  related_user_email: string | null;
  created_at: string;
}

// Notification sound
const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgkKasg1Y0NF2Rq66MYDgxW5Cor5FjOzFbkamvk2Q+M1uRqa+VZkEzW5GosJdpQzRckaivm2tFNVySp6+dbUc2XJGmr6BuSDhckKWvo29JOl2Qpa+kcEo7XY+kr6VxSztej6OvpnJMPF6OoK+nc009Xo6gr6hzTj5ejp+vqXRPP1+Onq+qdVBAX46dr6t2UUFgjayvq3dSQmGNq6+seVNDYYyqr615VERii6mvrnpVRWOLqK+uelZGZIqnr697V0dliqavrntYSGaKpa+ve1lJZ4mkr7B8WkpoiaSvsH1bS2iIo6+xfl1MaYeir7F/XU1qh6GvsYBeTmuGoK+xgF9PbIafr7GBYU9thyBIbYYfSG2GH0hthh9IbYYfSG2GIEhuiCFJb4ojSm+KJUtwjChMcY4rTnKQLE9ykC5Qc5EwUnWTMlN1lTRUd5Y3VniYOFd4mTpZepo9W3ubPl18nD9efJ1BYH6eQ2F/n0RjgKBFZIGiR2aCo0logKRKa4GlTG2Cpk5ugqdRcIOpU3GDq1Vzha1Xd4evV3eIsVl4i7JbeY20XHuPtl58kblgfZK7Yn+VvWOAl8BlgprCZoOcxGiEnsVqhqDHbYejyW+JpctxiqfOc4ypz3WOq9B3kK3SeZKv03uUsdR9lrLVf5i01oCatdeBm7bYg5231oSeuNiGn7nZh6C62Yihu9qJorzciqO83Iykv9yNpcDcjqbB3Y+nwd2QqMLdjqjD3Y6pxN2OqsXdjqrG3Y6rx92Oq8jejqzJ3o6ty96Ors3ej6/O3pCw0N6QsdHekLLS3pGz0t6Ss9PelLTT3pW11N6WttXel7fV3pi41t6ZudfemrrY3pu72d6cvNrenb3b3p6+3N6fv93eoMDe3qHB396iwt/eosLf";

let audioContext: AudioContext | null = null;

function playNotificationSound() {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.warn("Could not play notification sound", e);
  }
}

function vibrateDevice() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {
    console.warn("Vibration not supported", e);
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function showBrowserNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const options: any = {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      vibrate: [100, 50, 100],
      tag: "yocloud-notification",
      renotify: true,
    };
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn("Browser notification failed", e);
  }
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Request permission on mount
  useEffect(() => {
    if (user) {
      requestNotificationPermission();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
          // Sound + vibrate on new notification
          playNotificationSound();
          vibrateDevice();
          // Browser push notification
          const newNotif = payload.new as any;
          if (newNotif?.title) {
            showBrowserNotification(newNotif.title, newNotif.message || "");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]).map(n => ({
        ...n,
        is_pinned: n.is_pinned ?? false,
        read_at: n.read_at ?? null,
      })) as Notification[];
    },
    enabled: !!user,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });
  return data ?? 0;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() } as any)
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useClearNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_pinned: !is_pinned } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useBatchDeleteNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useBatchMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() } as any)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  relatedFileId?: string | null,
  relatedUserEmail?: string | null
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    related_file_id: relatedFileId ?? null,
    related_user_email: relatedUserEmail ?? null,
  });
}
