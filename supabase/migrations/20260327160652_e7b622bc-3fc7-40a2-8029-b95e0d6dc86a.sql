
-- Create personal workspaces for existing users who don't have one
DO $$
DECLARE
  r RECORD;
  ws_id uuid;
BEGIN
  FOR r IN SELECT id FROM auth.users WHERE id NOT IN (SELECT owner_id FROM public.workspaces WHERE type = 'personal')
  LOOP
    INSERT INTO public.workspaces (name, type, owner_id)
    VALUES ('Personal', 'personal', r.id)
    RETURNING id INTO ws_id;
    
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (ws_id, r.id, 'owner');
    
    -- Assign existing files to personal workspace
    UPDATE public.files SET workspace_id = ws_id WHERE user_id = r.id AND workspace_id IS NULL;
    UPDATE public.activity_log SET workspace_id = ws_id WHERE user_id = r.id AND workspace_id IS NULL;
  END LOOP;
END $$;
