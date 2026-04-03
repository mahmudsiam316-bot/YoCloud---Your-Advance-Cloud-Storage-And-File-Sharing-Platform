
-- Make user-files bucket public so workspace avatars are visible to everyone
UPDATE storage.buckets SET public = true WHERE id = 'user-files';

-- Add RLS policy for public read access on storage objects
CREATE POLICY "Public read access for workspace avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = 'workspace-avatars');
