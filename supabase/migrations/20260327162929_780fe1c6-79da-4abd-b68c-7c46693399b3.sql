
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Invited users can view their invites" ON public.workspace_invites;
CREATE POLICY "Invited users can view their invites"
ON public.workspace_invites
FOR SELECT
TO authenticated
USING (email = public.current_user_email());

DROP POLICY IF EXISTS "Invited users can update their invites" ON public.workspace_invites;
CREATE POLICY "Invited users can update their invites"
ON public.workspace_invites
FOR UPDATE
TO authenticated
USING (email = public.current_user_email())
WITH CHECK (email = public.current_user_email());

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
    AND EXISTS (
      SELECT 1
      FROM public.workspaces
      WHERE id = workspace_id
        AND owner_id = auth.uid()
    )
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
