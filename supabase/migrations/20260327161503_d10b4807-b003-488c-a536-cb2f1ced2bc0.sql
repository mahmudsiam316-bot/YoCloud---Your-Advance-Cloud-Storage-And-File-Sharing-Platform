
-- Drop and recreate the INSERT policy for workspaces with correct WITH CHECK
DROP POLICY IF EXISTS "Authenticated can create workspaces" ON public.workspaces;

CREATE POLICY "Authenticated can create workspaces"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());
