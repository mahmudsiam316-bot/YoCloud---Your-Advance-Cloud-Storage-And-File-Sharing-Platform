
-- Allow shared editors to update files they have editor permission on
CREATE OR REPLACE FUNCTION public.is_shared_editor(file_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM file_shares fs
    WHERE fs.file_id = file_id_param
      AND fs.permission = 'editor'
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
      AND (
        -- Check if current user is the owner
        fs.user_id = auth.uid()
        OR
        -- Check if current user is invited
        EXISTS (
          SELECT 1 FROM share_invites si
          WHERE si.share_id = fs.id
            AND si.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
      )
  )
$$;

-- Allow shared editors to update shared files (rename, etc.)
CREATE POLICY "Shared editors can update files"
ON public.files
FOR UPDATE
TO authenticated
USING (public.is_shared_editor(id));

-- Allow shared editors to read shared files
CREATE POLICY "Shared users can read shared files"
ON public.files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM file_shares fs
    WHERE fs.file_id = files.id
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
  )
);

-- Allow shared editors to insert file_versions
CREATE POLICY "Shared editors can insert versions"
ON public.file_versions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_shared_editor(file_id)
);

-- Allow shared editors to read versions of shared files
CREATE POLICY "Shared users can read shared file versions"
ON public.file_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM file_shares fs
    WHERE fs.file_id = file_versions.file_id
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
  )
);

-- Allow shared users (both editor and viewer) to insert comments
CREATE POLICY "Shared users can insert comments"
ON public.file_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM file_shares fs
    WHERE fs.file_id = file_comments.file_id
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
  )
);

-- Allow shared users to read comments on shared files
CREATE POLICY "Shared users can read shared file comments"
ON public.file_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM file_shares fs
    WHERE fs.file_id = file_comments.file_id
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
  )
);

-- Allow shared users to delete their own comments on shared files
CREATE POLICY "Shared users can delete own comments on shared files"
ON public.file_comments
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM file_shares fs
    WHERE fs.file_id = file_comments.file_id
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
  )
);

-- Allow authenticated users to insert files (for Copy to My Drive)
-- Already exists: "Users can insert their own files" policy
