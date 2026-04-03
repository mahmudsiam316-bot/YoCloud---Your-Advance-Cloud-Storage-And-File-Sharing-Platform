import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useWorkspaceContext } from "./useWorkspaces";

export function useCrossWorkspaceSearch(query: string, enabled: boolean = false) {
  const { user } = useAuth();
  const { workspaces } = useWorkspaceContext();

  return useQuery({
    queryKey: ["cross_workspace_search", query],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) return [];

      const { data, error } = await supabase
        .from("files")
        .select("*, workspaces!files_workspace_id_fkey(name)")
        .ilike("name", `%${query}%`)
        .eq("is_trashed", false)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data.map((f: any) => ({
        ...f,
        workspace_name: f.workspaces?.name || "Unknown",
      }));
    },
    enabled: !!user && enabled && query.length >= 2,
  });
}
