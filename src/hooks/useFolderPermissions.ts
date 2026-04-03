import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface FolderPermission {
  id: string;
  workspace_id: string;
  folder_id: string;
  user_id: string;
  can_view: boolean;
  can_upload: boolean;
  can_delete: boolean;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
}

export function useFolderPermissions(workspaceId: string | null) {
  return useQuery({
    queryKey: ["folder_permissions", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_folder_permissions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return data as unknown as FolderPermission[];
    },
    enabled: !!workspaceId,
  });
}

export function useSetFolderPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (perm: {
      workspace_id: string;
      folder_id: string;
      user_id: string;
      can_view: boolean;
      can_upload: boolean;
      can_delete: boolean;
      can_edit: boolean;
    }) => {
      const { error } = await supabase
        .from("workspace_folder_permissions" as any)
        .upsert(perm as any, { onConflict: "folder_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folder_permissions"] });
      toast.success("Folder permission updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteFolderPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workspace_folder_permissions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folder_permissions"] });
      toast.success("Permission removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
