import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useWorkspaceContext } from "./useWorkspaces";
import { toast } from "sonner";

export type DbFile = {
  id: string;
  name: string;
  storage_path: string;
  cloudinary_url: string | null;
  cloudinary_public_id: string | null;
  size: number | null;
  mime_type: string | null;
  is_starred: boolean | null;
  is_trashed: boolean | null;
  is_folder: boolean;
  parent_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export function useFiles() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery({
    queryKey: ["files", user?.id, currentWorkspace?.id],
    queryFn: async () => {
      let query = supabase
        .from("files")
        .select("*")
        .order("is_folder", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (currentWorkspace) {
        query = query.eq("workspace_id", currentWorkspace.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DbFile[];
    },
    enabled: !!user,
  });
}

export function useActivityLog() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity_log", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Array<{
        id: string;
        user_id: string;
        action: string;
        file_id: string | null;
        file_name: string;
        details: Record<string, unknown>;
        created_at: string;
      }>;
    },
    enabled: !!user,
  });
}

async function logActivity(userId: string, action: string, fileName: string, fileId?: string | null, details?: Record<string, unknown>) {
  await supabase.from("activity_log").insert([{
    user_id: userId,
    action,
    file_name: fileName,
    file_id: fileId ?? null,
    details: (details ?? {}) as any,
  }]);
}

export function useCreateFolder() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      if (!name.trim()) throw new Error("Folder name cannot be empty");

      let query = supabase
        .from("files")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_folder", true)
        .eq("name", name.trim())
        .eq("is_trashed", false);
      
      if (parentId) {
        query = query.eq("parent_id", parentId);
      } else {
        query = query.is("parent_id", null);
      }
      
      const { data: existing } = await query;
      
      if (existing && existing.length > 0) {
        throw new Error(`A folder named "${name}" already exists here`);
      }

      const insertData: any = {
        name: name.trim(),
        storage_path: `${user.id}/folders/${Date.now()}-${name.trim()}`,
        user_id: user.id,
        is_folder: true,
        parent_id: parentId,
        mime_type: "application/x-folder",
        size: 0,
      };

      if (currentWorkspace) {
        insertData.workspace_id = currentWorkspace.id;
      }

      const { data: inserted, error } = await supabase.from("files").insert(insertData).select("id").single();
      if (error) throw error;

      await logActivity(user.id, "create_folder", name.trim(), inserted?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      toast.success("Folder created");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateFile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, _actionType, _fileName, ...updates }: Partial<DbFile> & { id: string; _actionType?: string; _fileName?: string }) => {
      const { error } = await supabase.from("files").update(updates).eq("id", id);
      if (error) throw error;

      if (user && _actionType && _fileName) {
        await logActivity(user.id, _actionType, _fileName, id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    },
  });
}

export function useDeleteFile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, allFiles }: { file: DbFile; allFiles?: DbFile[] }) => {
      if (!user) throw new Error("Not authenticated");

      const toDelete: DbFile[] = [file];
      if (file.is_folder && allFiles) {
        const collectChildren = (parentId: string) => {
          const children = allFiles.filter((f) => f.parent_id === parentId);
          children.forEach((child) => {
            toDelete.push(child);
            if (child.is_folder) collectChildren(child.id);
          });
        };
        collectChildren(file.id);
      }

      // Delete from Cloudinary via edge function for files with cloudinary_public_id
      const cloudinaryIds = toDelete
        .filter((f) => !f.is_folder && f.cloudinary_public_id)
        .map((f) => f.cloudinary_public_id!);

      if (cloudinaryIds.length > 0) {
        try {
          const session = (await supabase.auth.getSession()).data.session;
          if (session) {
            const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/cloudinary-delete`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ publicIds: cloudinaryIds, resourceType: "auto" }),
              }
            );
          }
        } catch {
          // Continue with DB deletion even if Cloudinary delete fails
        }
      }

      // Also delete from Supabase storage for legacy files
      const storagePaths = toDelete
        .filter((f) => !f.is_folder && !f.cloudinary_public_id)
        .map((f) => f.storage_path);
      if (storagePaths.length > 0) {
        await supabase.storage.from("user-files").remove(storagePaths);
      }

      for (const f of toDelete.reverse()) {
        await supabase.from("files").delete().eq("id", f.id);
      }

      await logActivity(user.id, "delete", file.name, null, { count: toDelete.length });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      toast.success("Deleted permanently");
    },
  });
}

// Helper: check if moving a folder into itself or its descendants
export function wouldCreateCycle(fileId: string, targetFolderId: string | null, allFiles: DbFile[]): boolean {
  if (!targetFolderId) return false;
  if (fileId === targetFolderId) return true;
  let current = allFiles.find((f) => f.id === targetFolderId);
  while (current) {
    if (current.id === fileId) return true;
    current = current.parent_id ? allFiles.find((f) => f.id === current!.parent_id) : undefined;
  }
  return false;
}

// Helper: check duplicate name in target folder
export function hasDuplicateName(name: string, targetFolderId: string | null, fileId: string, allFiles: DbFile[]): boolean {
  return allFiles.some(
    (f) => f.parent_id === targetFolderId && f.name === name && f.id !== fileId && !f.is_trashed
  );
}
