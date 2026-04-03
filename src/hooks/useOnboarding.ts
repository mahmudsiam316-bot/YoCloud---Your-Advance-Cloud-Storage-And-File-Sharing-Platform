import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPreferences {
  theme: string;
  country: string | null;
  profession: string[];
  usage_intent: string[];
  notifications_enabled: boolean;
  email_updates_enabled: boolean;
  ai_enabled: boolean;
  experience_level: string;
  onboarding_completed: boolean;
}

const DEFAULTS: UserPreferences = {
  theme: "system",
  country: null,
  profession: [],
  usage_intent: [],
  notifications_enabled: true,
  email_updates_enabled: false,
  ai_enabled: true,
  experience_level: "beginner",
  onboarding_completed: false,
};

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-preferences", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return data as any as UserPreferences & { user_id: string };
    },
  });

  const upsert = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_preferences" as any)
        .upsert(
          { user_id: user.id, ...updates, updated_at: new Date().toISOString() } as any,
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences", user?.id] });
    },
  });

  const isReady = !user?.id || (!query.isLoading && query.isFetched);
  const needsOnboarding = !!user?.id && !query.isLoading && query.isFetched && (query.data === null || (query.data && !query.data.onboarding_completed));

  return {
    preferences: query.data,
    isLoading: !isReady,
    needsOnboarding: !!needsOnboarding,
    savePreferences: upsert.mutateAsync,
    isSaving: upsert.isPending,
  };
}
