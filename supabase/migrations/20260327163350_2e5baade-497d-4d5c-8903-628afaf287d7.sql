CREATE OR REPLACE FUNCTION public.is_workspace_owner(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE id = _workspace_id
      AND owner_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Users can join workspaces" ON public.workspace_members;

CREATE POLICY "Users can join workspaces"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  is_workspace_admin_or_owner(auth.uid(), workspace_id)
  OR (
    user_id = auth.uid()
    AND role = 'owner'
    AND public.is_workspace_owner(auth.uid(), workspace_id)
  )
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.workspace_invites wi
      WHERE wi.workspace_id = workspace_members.workspace_id
        AND wi.email = public.current_user_email()
        AND wi.status = 'accepted'
        AND wi.role::text = workspace_members.role::text
    )
  )
);