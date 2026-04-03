import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type FileShare = {
  id: string;
  file_id: string;
  user_id: string;
  token: string;
  access_type: "public" | "private";
  permission: "viewer" | "editor";
  password_hash: string | null;
  expires_at: string | null;
  view_count: number;
  last_accessed_at: string | null;
  download_limit: number | null;
  download_count: number;
  custom_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type ShareAccessLog = {
  id: string;
  share_id: string;
  accessed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  device_type: string | null;
  referrer: string | null;
};

export type ShareInvite = {
  id: string;
  share_id: string;
  email: string;
  invited_by: string;
  accepted: boolean;
  created_at: string;
};

// Detect device type from user agent
function detectDeviceType(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

export function useFileShares(fileId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["file_shares", fileId],
    queryFn: async () => {
      if (!fileId) return [];
      const { data, error } = await supabase
        .from("file_shares")
        .select("*")
        .eq("file_id", fileId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FileShare[];
    },
    enabled: !!user && !!fileId,
  });
}

export function useShareAccessLog(shareId: string | null) {
  return useQuery({
    queryKey: ["share_access_log", shareId],
    queryFn: async () => {
      if (!shareId) return [];
      const { data, error } = await supabase
        .from("share_access_log")
        .select("*")
        .eq("share_id", shareId)
        .order("accessed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as ShareAccessLog[];
    },
    enabled: !!shareId,
  });
}

export function useShareInvites(shareId: string | null) {
  return useQuery({
    queryKey: ["share_invites", shareId],
    queryFn: async () => {
      if (!shareId) return [];
      const { data, error } = await supabase
        .from("share_invites")
        .select("*")
        .eq("share_id", shareId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ShareInvite[];
    },
    enabled: !!shareId,
  });
}

export function useCreateShare() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      accessType = "public",
      permission = "viewer",
      password,
      expiresAt,
      downloadLimit,
      customSlug,
    }: {
      fileId: string;
      accessType?: "public" | "private";
      permission?: "viewer" | "editor";
      password?: string;
      expiresAt?: string | null;
      downloadLimit?: number | null;
      customSlug?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      let passwordHash: string | null = null;
      if (password) {
        // Use bcrypt edge function
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/share-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "hash", password }),
          }
        );
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        passwordHash = result.hash;
      }

      const insertData: Record<string, unknown> = {
        file_id: fileId,
        user_id: user.id,
        access_type: accessType,
        permission,
        expires_at: expiresAt || null,
        password_hash: passwordHash,
        download_limit: downloadLimit || null,
        custom_slug: customSlug?.trim() || null,
      };

      const { data, error } = await supabase
        .from("file_shares")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data as FileShare;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["file_shares", data.file_id] });
      toast.success("Share link created");
    },
    onError: (err: Error) => {
      toast.error(`Failed to create share: ${err.message}`);
    },
  });
}

export function useUpdateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      fileId,
      ...updates
    }: Partial<FileShare> & { id: string; fileId: string }) => {
      const { error } = await supabase
        .from("file_shares")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      return fileId;
    },
    onSuccess: (fileId) => {
      queryClient.invalidateQueries({ queryKey: ["file_shares", fileId] });
    },
  });
}

export function useDeleteShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fileId }: { id: string; fileId: string }) => {
      const { error } = await supabase
        .from("file_shares")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return fileId;
    },
    onSuccess: (fileId) => {
      queryClient.invalidateQueries({ queryKey: ["file_shares", fileId] });
      toast.success("Share link removed");
    },
  });
}

export function useSendShareInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      emails,
      shareId,
      shareUrl,
      fileName,
    }: {
      emails: string[];
      shareId: string;
      shareUrl: string;
      fileName: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-share-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ emails, shareId, shareUrl, fileName }),
        }
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["share_invites", vars.shareId] });
      toast.success(`Invite sent to ${vars.emails.length} email(s)`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// For public share page
export type ShareFetchResult =
  | { status: "ok"; share: FileShare; file: { id: string; name: string; mime_type: string; size: number; storage_path: string; cloudinary_url?: string | null; is_folder: boolean } }
  | { status: "expired"; share: FileShare }
  | { status: "download_limit_reached"; share: FileShare }
  | { status: "not_found" };

export async function fetchShareByToken(token: string): Promise<ShareFetchResult> {
  // Try token first, then custom_slug, then share_code
  let { data: share, error } = await supabase.from("file_shares").select("*").eq("token", token).single();

  if (error || !share) {
    const slugQuery = await supabase
      .from("file_shares")
      .select("*")
      .eq("custom_slug", token)
      .single();
    if (!slugQuery.error && slugQuery.data) {
      share = slugQuery.data;
    } else {
      // Try share_code
      const codeQuery = await supabase
        .from("file_shares")
        .select("*")
        .eq("share_code", token.toUpperCase())
        .single();
      if (!codeQuery.error && codeQuery.data) {
        share = codeQuery.data;
      } else {
        return { status: "not_found" };
      }
    }
  }

  const s = share as FileShare;

  // Check expiry
  if (s.expires_at && new Date(s.expires_at) < new Date()) {
    return { status: "expired", share: s };
  }

  // Check download limit
  if (s.download_limit && s.download_count >= s.download_limit) {
    return { status: "download_limit_reached", share: s };
  }

  // Fetch file info
  const { data: file, error: fileErr } = await supabase
    .from("files")
    .select("id, name, mime_type, size, storage_path, cloudinary_url, is_folder")
    .eq("id", s.file_id)
    .single();

  if (fileErr || !file) return { status: "not_found" };

  // Log access with enhanced analytics
  const deviceType = detectDeviceType(navigator.userAgent);
  await supabase.from("share_access_log").insert({
    share_id: s.id,
    user_agent: navigator.userAgent,
    device_type: deviceType,
    referrer: document.referrer || null,
  } as any);

  await supabase
    .from("file_shares")
    .update({
      view_count: s.view_count + 1,
      last_accessed_at: new Date().toISOString(),
    } as any)
    .eq("id", s.id);

  return { status: "ok", share: s, file: file as any };
}

// Increment download count
export async function incrementDownloadCount(shareId: string, currentCount: number) {
  await supabase
    .from("file_shares")
    .update({ download_count: currentCount + 1 } as any)
    .eq("id", shareId);
}

// Verify share password via bcrypt edge function
export async function verifySharePassword(shareId: string, password: string): Promise<boolean> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/share-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", password, shareId }),
    }
  );
  const result = await res.json();
  return result.valid === true;
}

export function getShareUrl(token: string, customSlug?: string | null): string {
  const slug = customSlug || token;
  return `${window.location.origin}/share/${slug}`;
}
