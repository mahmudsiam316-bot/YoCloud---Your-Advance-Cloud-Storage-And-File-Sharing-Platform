
-- Fix workspace_members INSERT - allow self-insert as owner when creating workspace
DROP POLICY IF EXISTS "Admin/Owner can add members" ON public.workspace_members;

CREATE POLICY "Admin/Owner can add members"
ON public.workspace_members FOR INSERT
TO authenticated
WITH CHECK (
  is_workspace_admin_or_owner(auth.uid(), workspace_id)
  OR (
    user_id = auth.uid() 
    AND role = 'owner' 
    AND EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  )
);
