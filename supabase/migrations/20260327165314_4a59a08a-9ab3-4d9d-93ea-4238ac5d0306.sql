
-- Workspace invite links for shareable join links
CREATE TABLE public.workspace_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  role text NOT NULL DEFAULT 'member',
  max_uses integer DEFAULT NULL,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(token)
);

ALTER TABLE public.workspace_invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Owner can manage invite links"
ON public.workspace_invite_links FOR ALL TO authenticated
USING (is_workspace_admin_or_owner(auth.uid(), workspace_id))
WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Anyone can read active links by token"
ON public.workspace_invite_links FOR SELECT TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Add color_theme to workspaces for branding
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS color_theme text DEFAULT 'default';

-- Workspace templates table
CREATE TABLE public.workspace_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  folder_structure jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_system boolean NOT NULL DEFAULT false
);

ALTER TABLE public.workspace_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read templates"
ON public.workspace_templates FOR SELECT TO authenticated
USING (true);

-- Insert default system templates
INSERT INTO public.workspace_templates (name, description, folder_structure, is_system) VALUES
('Engineering', 'Standard engineering team setup', '["Documents", "Design Assets", "Releases", "Meeting Notes", "Research"]'::jsonb, true),
('Marketing', 'Marketing team folder structure', '["Campaigns", "Brand Assets", "Social Media", "Analytics", "Content Calendar"]'::jsonb, true),
('Design', 'Design team workspace', '["UI Mockups", "Brand Guidelines", "Icons & Assets", "Presentations", "Inspiration"]'::jsonb, true),
('General', 'Simple general-purpose workspace', '["Shared", "Archives", "Resources"]'::jsonb, true);
