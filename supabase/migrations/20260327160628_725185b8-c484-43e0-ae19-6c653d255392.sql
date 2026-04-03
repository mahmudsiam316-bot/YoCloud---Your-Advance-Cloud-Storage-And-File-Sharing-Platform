
-- 1. Create workspace_role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member');

-- 2. Create workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'team')),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text,
  avatar_url text,
  storage_limit bigint NOT NULL DEFAULT 5368709120,
  storage_plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create workspace_members table
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- 4. Create workspace_invites table
CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  UNIQUE(workspace_id, email)
);

-- 5. Add workspace_id to files table (nullable for migration)
ALTER TABLE public.files ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 6. Add workspace_id to activity_log table
ALTER TABLE public.activity_log ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 7. Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- 8. Security definer functions for workspace role checks
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id uuid, _workspace_id uuid, _role workspace_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role IN ('owner', 'admin')
  )
$$;

-- 9. RLS policies for workspaces
CREATE POLICY "Members can view their workspaces"
  ON public.workspaces FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), id));

CREATE POLICY "Authenticated can create workspaces"
  ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner can update workspace"
  ON public.workspaces FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete workspace"
  ON public.workspaces FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND type != 'personal');

-- 10. RLS policies for workspace_members
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admin/Owner can add members"
  ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admin/Owner can update members"
  ON public.workspace_members FOR UPDATE TO authenticated
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admin/Owner can remove members"
  ON public.workspace_members FOR DELETE TO authenticated
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Members can leave workspace"
  ON public.workspace_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 11. RLS policies for workspace_invites
CREATE POLICY "Admin/Owner can manage invites"
  ON public.workspace_invites FOR ALL TO authenticated
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Invited users can view their invites"
  ON public.workspace_invites FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

CREATE POLICY "Invited users can update their invites"
  ON public.workspace_invites FOR UPDATE TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

-- 12. Auto-create personal workspace on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ws_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  IF NEW.email = 'mahmudsiam316@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  
  -- Create personal workspace
  INSERT INTO public.workspaces (name, type, owner_id)
  VALUES ('Personal', 'personal', NEW.id)
  RETURNING id INTO ws_id;
  
  -- Add as owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$function$;

-- 13. Updated_at trigger for workspaces
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
