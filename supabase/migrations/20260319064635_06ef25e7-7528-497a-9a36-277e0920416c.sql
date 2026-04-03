
-- Allow reading files that belong to a shared folder (for public share pages)
CREATE OR REPLACE FUNCTION public.is_shared_child(file_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_id FROM files WHERE id = file_parent_id
    UNION ALL
    SELECT f.id, f.parent_id FROM files f JOIN ancestors a ON f.id = a.parent_id
  )
  SELECT EXISTS (
    SELECT 1 FROM file_shares fs
    JOIN ancestors a ON fs.file_id = a.id
    WHERE fs.access_type = 'public'
    AND (fs.expires_at IS NULL OR fs.expires_at > now())
  )
$$;

-- Policy: allow reading files under a publicly shared folder
CREATE POLICY "Public share folder children readable"
ON public.files FOR SELECT TO anon
USING (public.is_shared_child(parent_id));
