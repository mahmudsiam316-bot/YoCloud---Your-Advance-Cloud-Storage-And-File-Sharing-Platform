import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useWorkspaceContext } from "./useWorkspaces";
import { toast } from "sonner";

export function useCloudinaryUpload() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, parentId, onProgress }: { file: File; parentId: string | null; onProgress?: (percent: number) => void }) => {
      if (!user) throw new Error("Not authenticated");
      if (file.size > 100 * 1024 * 1024) throw new Error(`File "${file.name}" exceeds 100MB limit`);

      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("No session");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      if (parentId) formData.append("parentId", parentId);
      if (currentWorkspace?.id) formData.append("workspaceId", currentWorkspace.id);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/cloudinary-upload`;

      return new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const percent = Math.round((e.loaded / e.total) * 95);
            onProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              onProgress?.(100);
              resolve(JSON.parse(xhr.responseText));
            } catch { resolve({}); }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || "Upload failed"));
            } catch { reject(new Error("Upload failed")); }
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    },
    onError: (err: Error) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });
}

export function useCloudinaryDelete() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ publicIds, resourceType = "image" }: { publicIds: string[]; resourceType?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("No session");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/cloudinary-delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ publicIds, resourceType }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }

      return await res.json();
    },
  });
}

/**
 * Get optimized Cloudinary URL with transformations
 */
export function getCloudinaryUrl(
  url: string | null | undefined,
  options?: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
  }
): string | null {
  if (!url) return null;
  if (!url.includes("cloudinary.com")) return url;

  const { width, height, quality = "auto", format = "auto", crop = "limit" } = options || {};
  
  // Insert transformations into Cloudinary URL
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;

  const transforms: string[] = [`q_${quality}`, `f_${format}`];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  return `${parts[0]}/upload/${transforms.join(",")}/${parts[1]}`;
}
