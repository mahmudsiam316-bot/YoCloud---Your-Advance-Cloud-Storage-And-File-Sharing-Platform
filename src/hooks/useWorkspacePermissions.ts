import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface WorkspaceMemberPermission {
  id: string;
  workspace_id: string;
  user_id: string;
  can_upload: boolean;
  can_delete: boolean;
  can_share: boolean;
  can_invite: boolean;
  can_edit: boolean;
  can_manage_folders: boolean;
  created_at: string;
  updated_at: string;
}

export function useWorkspaceMemberPermissions(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace_member_permissions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("workspace_member_permissions" as any)
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return (data || []) as unknown as WorkspaceMemberPermission[];
    },
    enabled: !!workspaceId,
  });
}

export function useMyWorkspacePermissions(workspaceId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_workspace_permissions", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return null;
      const { data, error } = await supabase
        .from("workspace_member_permissions" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WorkspaceMemberPermission | null;
    },
    enabled: !!workspaceId && !!user?.id,
  });
}

export function useSetMemberPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workspace_id: string;
      user_id: string;
      can_upload: boolean;
      can_delete: boolean;
      can_share: boolean;
      can_invite: boolean;
      can_edit: boolean;
      can_manage_folders: boolean;
    }) => {
      const { data, error } = await supabase
        .from("workspace_member_permissions" as any)
        .upsert(
          {
            workspace_id: params.workspace_id,
            user_id: params.user_id,
            can_upload: params.can_upload,
            can_delete: params.can_delete,
            can_share: params.can_share,
            can_invite: params.can_invite,
            can_edit: params.can_edit,
            can_manage_folders: params.can_manage_folders,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workspace_member_permissions", vars.workspace_id] });
      toast.success("Permission updated");
    },
    onError: (err: any) => {
      toast.error("Failed to update permission: " + err.message);
    },
  });
}
