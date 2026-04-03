import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FileComment {
  id: string;
  file_id: string;
  user_id: string;
  user_email: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useFileComments(fileId: string | null) {
  return useQuery({
    queryKey: ["file_comments", fileId],
    queryFn: async () => {
      if (!fileId) return [];
      const { data, error } = await supabase
        .from("file_comments")
        .select("*")
        .eq("file_id", fileId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as FileComment[];
    },
    enabled: !!fileId,
  });
}

export function useAddComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, content, parentCommentId }: { fileId: string; content: string; parentCommentId?: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("file_comments").insert([{
        file_id: fileId,
        user_id: user.id,
        user_email: user.email ?? "Unknown",
        content: content.trim(),
        parent_comment_id: parentCommentId ?? null,
      }]);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["file_comments", vars.fileId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, fileId }: { commentId: string; fileId: string }) => {
      const { error } = await supabase.from("file_comments").delete().eq("id", commentId);
      if (error) throw error;
      return fileId;
    },
    onSuccess: (fileId) => {
      queryClient.invalidateQueries({ queryKey: ["file_comments", fileId] });
    },
  });
}
