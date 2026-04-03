import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useApiSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["api-subscription", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_subscriptions" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });
}

export function useApiPaymentHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["api-payment-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("is_api_plan", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCancelApiSubscription() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("api_subscriptions" as any)
        .update({ 
          auto_renew: false, 
          cancelled_at: new Date().toISOString() 
        } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-subscription"] });
      toast.success("Subscription cancelled. It will remain active until expiry.");
    },
  });
}

export function useToggleAutoRenew() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (autoRenew: boolean) => {
      const { error } = await supabase
        .from("api_subscriptions" as any)
        .update({ auto_renew: autoRenew } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: (_, autoRenew) => {
      qc.invalidateQueries({ queryKey: ["api-subscription"] });
      toast.success(autoRenew ? "Auto-renew enabled" : "Auto-renew disabled");
    },
  });
}
