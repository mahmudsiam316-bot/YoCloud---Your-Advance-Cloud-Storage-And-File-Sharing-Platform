
-- Create workspace member permissions table for granular per-user controls
CREATE TABLE public.workspace_member_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  can_upload boolean NOT NULL DEFAULT true,
  can_delete boolean NOT NULL DEFAULT false,
  can_share boolean NOT NULL DEFAULT false,
  can_invite boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT true,
  can_manage_folders boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE public.workspace_member_permissions ENABLE ROW LEVEL SECURITY;

-- Admin/Owner can manage all member permissions
CREATE POLICY "Admin/Owner can manage member permissions"
ON public.workspace_member_permissions
FOR ALL TO authenticated
USING (is_workspace_admin_or_owner(auth.uid(), workspace_id))
WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Members can view their own permissions
CREATE POLICY "Members can view own permissions"
ON public.workspace_member_permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid());
