import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string | null;
  folder_structure: string[];
  is_system: boolean;
  created_at: string;
}

export function useWorkspaceTemplates() {
  return useQuery({
    queryKey: ["workspace_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_templates" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return data as unknown as WorkspaceTemplate[];
    },
  });
}

export async function applyTemplate(
  workspaceId: string,
  userId: string,
  folders: string[]
) {
  for (const folderName of folders) {
    await supabase.from("files").insert({
      name: folderName,
      storage_path: `ws_${workspaceId}/${folderName}`,
      is_folder: true,
      user_id: userId,
      workspace_id: workspaceId,
    });
  }
}
