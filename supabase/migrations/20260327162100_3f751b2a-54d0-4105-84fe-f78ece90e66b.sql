
-- Fix workspace_members INSERT policy to allow:
-- 1. Admin/Owner adding members
-- 2. Self-insert as owner when creating workspace
-- 3. Self-insert when accepting an invite (any role)
DROP POLICY IF EXISTS "Admin/Owner can add members" ON public.workspace_members;

CREATE POLICY "Users can join workspaces"
ON public.workspace_members FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin/Owner can add anyone
  is_workspace_admin_or_owner(auth.uid(), workspace_id)
  OR (
    -- Self-insert as owner when creating own workspace
    user_id = auth.uid() 
    AND role = 'owner' 
    AND EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  )
  OR (
    -- Self-insert when accepting a pending invite
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspace_invites wi
      WHERE wi.workspace_id = workspace_members.workspace_id
        AND wi.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND wi.status = 'accepted'
        AND wi.role::text = workspace_members.role::text
    )
  )
);
