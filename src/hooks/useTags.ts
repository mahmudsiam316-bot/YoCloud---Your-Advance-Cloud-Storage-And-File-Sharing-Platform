import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface FileTag {
  id: string;
  file_id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
}

export function useTags() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tags", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!user,
  });
}

export function useFileTags() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["file_tags", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("file_tags")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as FileTag[];
    },
    enabled: !!user,
  });
}

export function useCreateTag() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("tags")
        .insert({ name: name.trim(), color, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag created");
    },
    onError: (err: Error) => {
      toast.error(err.message.includes("duplicate") ? "Tag already exists" : err.message);
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["file_tags"] });
      toast.success("Tag deleted");
    },
  });
}

export function useToggleFileTag() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, tagId }: { fileId: string; tagId: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if already tagged
      const { data: existing } = await supabase
        .from("file_tags")
        .select("id")
        .eq("file_id", fileId)
        .eq("tag_id", tagId)
        .maybeSingle();

      if (existing) {
        await supabase.from("file_tags").delete().eq("id", existing.id);
      } else {
        await supabase.from("file_tags").insert({
          file_id: fileId,
          tag_id: tagId,
          user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file_tags"] });
    },
  });
}

export function useBulkTagFiles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileIds, tagId }: { fileIds: string[]; tagId: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Get existing tags for these files
      const { data: existing } = await supabase
        .from("file_tags")
        .select("file_id")
        .eq("tag_id", tagId)
        .in("file_id", fileIds);

      const existingFileIds = new Set((existing || []).map((e) => e.file_id));
      const newEntries = fileIds
        .filter((fid) => !existingFileIds.has(fid))
        .map((fid) => ({ file_id: fid, tag_id: tagId, user_id: user.id }));

      if (newEntries.length > 0) {
        const { error } = await supabase.from("file_tags").insert(newEntries);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file_tags"] });
      toast.success("Tags applied");
    },
  });
}

export const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
];
