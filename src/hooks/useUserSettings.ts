import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserSettings {
  default_access_type: string;
  default_expiry: string;
  require_password: boolean;
  allow_download: boolean;
  show_view_count: boolean;
  auto_rename_duplicates: boolean;
  file_preview_enabled: boolean;
  auto_trash_days: number;
  analytics_enabled: boolean;
  activity_visible: boolean;
}

const DEFAULTS: UserSettings = {
  default_access_type: "public",
  default_expiry: "never",
  require_password: false,
  allow_download: true,
  show_view_count: true,
  auto_rename_duplicates: true,
  file_preview_enabled: true,
  auto_trash_days: 30,
  analytics_enabled: false,
  activity_visible: true,
};

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-settings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULTS;
      return {
        default_access_type: (data as any).default_access_type ?? DEFAULTS.default_access_type,
        default_expiry: (data as any).default_expiry ?? DEFAULTS.default_expiry,
        require_password: (data as any).require_password ?? DEFAULTS.require_password,
        allow_download: (data as any).allow_download ?? DEFAULTS.allow_download,
        show_view_count: (data as any).show_view_count ?? DEFAULTS.show_view_count,
        auto_rename_duplicates: (data as any).auto_rename_duplicates ?? DEFAULTS.auto_rename_duplicates,
        file_preview_enabled: (data as any).file_preview_enabled ?? DEFAULTS.file_preview_enabled,
        auto_trash_days: (data as any).auto_trash_days ?? DEFAULTS.auto_trash_days,
        analytics_enabled: (data as any).analytics_enabled ?? DEFAULTS.analytics_enabled,
        activity_visible: (data as any).activity_visible ?? DEFAULTS.activity_visible,
      } as UserSettings;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!user?.id) throw new Error("Not authenticated");
      // Upsert
      const { error } = await supabase
        .from("user_settings" as any)
        .upsert(
          { user_id: user.id, ...updates, updated_at: new Date().toISOString() } as any,
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings", user?.id] });
    },
  });

  return {
    settings: query.data ?? DEFAULTS,
    isLoading: query.isLoading,
    updateSettings: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
