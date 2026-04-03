
-- Allow all authenticated users to read basic profile info for marketplace purposes
CREATE POLICY "Authenticated users can view marketplace profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_listings ml
    WHERE ml.user_id = profiles.id
    AND ml.status = 'active'
    AND ml.visibility = 'public'
  )
);
