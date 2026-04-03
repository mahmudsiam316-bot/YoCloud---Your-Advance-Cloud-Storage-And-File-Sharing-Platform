import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  cloudinary_url: string | null;
  cloudinary_public_id: string | null;
  size: number;
  uploaded_at: string;
  user_id: string;
}

export function useFileVersions(fileId: string | null) {
  return useQuery({
    queryKey: ["file_versions", fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("file_versions")
        .select("*")
        .eq("file_id", fileId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as FileVersion[];
    },
    enabled: !!fileId,
  });
}

export function useUploadNewVersion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, file }: { fileId: string; file: File }) => {
      if (!user) throw new Error("Not authenticated");

      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("No session");

      // Get current file info
      const { data: currentFile, error: fileErr } = await supabase
        .from("files")
        .select("cloudinary_url, cloudinary_public_id, size")
        .eq("id", fileId)
        .single();
      if (fileErr) throw fileErr;

      // Get max version number
      const { data: versions } = await supabase
        .from("file_versions")
        .select("version_number")
        .eq("file_id", fileId)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = (versions && versions.length > 0 ? versions[0].version_number : 0) + 1;

      // Save current file as a version (if it has content)
      if (currentFile?.cloudinary_url) {
        await supabase.from("file_versions").insert({
          file_id: fileId,
          version_number: nextVersion,
          cloudinary_url: currentFile.cloudinary_url,
          cloudinary_public_id: currentFile.cloudinary_public_id,
          size: currentFile.size || 0,
          user_id: user.id,
        });
      }

      // Upload new file to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("replaceFileId", fileId);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/cloudinary-upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const result = await res.json();

      // Update the file record with new cloudinary info
      await supabase.from("files").update({
        cloudinary_url: result.cloudinary_url || result.url,
        cloudinary_public_id: result.cloudinary_public_id || result.public_id,
        size: file.size,
      }).eq("id", fileId);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["file_versions"] });
      toast.success("New version uploaded");
    },
    onError: (err: Error) => {
      toast.error(`Version upload failed: ${err.message}`);
    },
  });
}

export function useRestoreVersion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, version }: { fileId: string; version: FileVersion }) => {
      if (!user) throw new Error("Not authenticated");

      // Get current file info to save as version first
      const { data: currentFile } = await supabase
        .from("files")
        .select("cloudinary_url, cloudinary_public_id, size")
        .eq("id", fileId)
        .single();

      if (currentFile?.cloudinary_url) {
        const { data: versions } = await supabase
          .from("file_versions")
          .select("version_number")
          .eq("file_id", fileId)
          .order("version_number", { ascending: false })
          .limit(1);

        const nextVersion = (versions && versions.length > 0 ? versions[0].version_number : 0) + 1;

        await supabase.from("file_versions").insert({
          file_id: fileId,
          version_number: nextVersion,
          cloudinary_url: currentFile.cloudinary_url,
          cloudinary_public_id: currentFile.cloudinary_public_id,
          size: currentFile.size || 0,
          user_id: user.id,
        });
      }

      // Restore the selected version
      await supabase.from("files").update({
        cloudinary_url: version.cloudinary_url,
        cloudinary_public_id: version.cloudinary_public_id,
        size: version.size,
      }).eq("id", fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["file_versions"] });
      toast.success("Version restored");
    },
    onError: (err: Error) => {
      toast.error(`Restore failed: ${err.message}`);
    },
  });
}
