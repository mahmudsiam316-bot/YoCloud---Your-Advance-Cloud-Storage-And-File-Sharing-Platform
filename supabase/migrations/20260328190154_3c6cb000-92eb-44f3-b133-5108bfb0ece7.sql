-- Allow authenticated users to upload to their own avatar folder
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-files' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Allow users to update/overwrite their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Public read for all avatars
CREATE POLICY "Public read access for user avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = 'avatars');