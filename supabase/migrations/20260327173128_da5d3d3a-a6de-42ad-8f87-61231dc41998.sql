
-- Fix workspace_invites: Allow users to insert invite records for themselves (via invite link join)
CREATE POLICY "Users can insert own invite records"
ON public.workspace_invites
FOR INSERT
TO authenticated
WITH CHECK (
  email = current_user_email()
);
