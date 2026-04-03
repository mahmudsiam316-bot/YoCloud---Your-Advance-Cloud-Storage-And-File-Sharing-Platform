import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useAllUsers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAllFiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin_files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAllActivity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin_activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAdminDeleteFile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ fileId, storagePath }: { fileId: string; storagePath: string }) => {
      await supabase.storage.from("user-files").remove([storagePath]);
      const { error } = await supabase.from("files").delete().eq("id", fileId);
      if (error) throw error;
      // Log admin action
      if (user) {
        await supabase.from("admin_action_logs").insert({
          admin_id: user.id,
          action: "delete_file",
          target_file_id: fileId,
          details: { storage_path: storagePath },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_files"] });
      toast.success("File deleted by admin");
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: string; action: "add" | "remove" }) => {
      if (action === "add") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
        if (error) throw error;
      }
      // Log admin action
      if (user) {
        await supabase.from("admin_action_logs").insert({
          admin_id: user.id,
          action: `${action}_role`,
          target_user_id: userId,
          details: { role },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success("Role updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAdminActionLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin_action_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_action_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useAllTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSystemConfig() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["system_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("*");
      if (error) throw error;
      const config: Record<string, string> = {};
      data.forEach((row: any) => { config[row.key] = row.value; });
      return config;
    },
    enabled: !!user,
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("system_config")
        .update({ value, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("key", key);
      if (error) throw error;
      // Log
      if (user) {
        await supabase.from("admin_action_logs").insert({
          admin_id: user.id,
          action: "update_config",
          details: { key, value },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_config"] });
      toast.success("Config updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateUserStorageLimit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, storageLimit }: { userId: string; storageLimit: number }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ storage_limit: storageLimit })
        .eq("id", userId);
      if (error) throw error;
      if (user) {
        await supabase.from("admin_action_logs").insert({
          admin_id: user.id,
          action: "update_storage_limit",
          target_user_id: userId,
          details: { storage_limit: storageLimit },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success("Storage limit updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
