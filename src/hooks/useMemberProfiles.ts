import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MemberProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  last_active_at: string | null;
}

export function useMemberProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ["member_profiles", userIds.sort().join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url, last_active_at")
        .in("id", userIds);
      if (error) throw error;
      return data as MemberProfile[];
    },
    enabled: userIds.length > 0,
  });
}

export function useUpdateLastActive() {
  // Fire-and-forget to update last_active_at
  const update = async (userId: string) => {
    await supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() } as any)
      .eq("id", userId);
  };
  return update;
}
