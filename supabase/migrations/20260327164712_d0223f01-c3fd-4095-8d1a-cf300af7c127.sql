
-- Workspace folder permissions table
CREATE TABLE public.workspace_folder_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_upload boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(folder_id, user_id)
);

ALTER TABLE public.workspace_folder_permissions ENABLE ROW LEVEL SECURITY;

-- Admin/Owner can manage folder permissions
CREATE POLICY "Admin/Owner can manage folder permissions"
ON public.workspace_folder_permissions FOR ALL TO authenticated
USING (is_workspace_admin_or_owner(auth.uid(), workspace_id))
WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Members can view their own permissions
CREATE POLICY "Members can view own folder permissions"
ON public.workspace_folder_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Add last_active_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();
