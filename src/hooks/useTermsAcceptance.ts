import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CURRENT_TERMS_VERSION = "1.0";

export function useTermsAcceptance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["terms-acceptance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_terms_acceptance")
        .select("*")
        .eq("user_id", user!.id)
        .eq("version", CURRENT_TERMS_VERSION)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const acceptTerms = useMutation({
    mutationFn: async (scrollCompleted: boolean) => {
      const { error } = await supabase
        .from("user_terms_acceptance")
        .upsert({
          user_id: user!.id,
          accepted: true,
          accepted_at: new Date().toISOString(),
          version: CURRENT_TERMS_VERSION,
          scroll_completed: scrollCompleted,
        }, { onConflict: "user_id,version" });
      if (error) throw error;
      // Update cache immediately so route guard doesn't redirect back
      queryClient.setQueryData(["terms-acceptance", user!.id], {
        user_id: user!.id,
        accepted: true,
        accepted_at: new Date().toISOString(),
        version: CURRENT_TERMS_VERSION,
        scroll_completed: scrollCompleted,
      });
      await queryClient.invalidateQueries({ queryKey: ["terms-acceptance", user?.id] });
    },
  });

  const isReady = !user?.id || (!query.isLoading && query.isFetched);
  const needsTermsAcceptance =
    !!user?.id && !query.isLoading && query.isFetched && (!query.data || !query.data.accepted);

  return {
    acceptance: query.data,
    isLoading: !isReady,
    needsTermsAcceptance,
    acceptTerms,
    currentVersion: CURRENT_TERMS_VERSION,
  };
}
