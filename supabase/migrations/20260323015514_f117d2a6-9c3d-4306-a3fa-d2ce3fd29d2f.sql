CREATE POLICY "Anon can read directly shared files"
ON public.files FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM file_shares fs
    WHERE fs.file_id = files.id
      AND fs.access_type = 'public'
      AND (fs.expires_at IS NULL OR fs.expires_at > now())
  )
);