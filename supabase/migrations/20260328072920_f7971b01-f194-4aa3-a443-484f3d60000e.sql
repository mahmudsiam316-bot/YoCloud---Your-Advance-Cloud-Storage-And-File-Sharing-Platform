ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS is_frozen boolean NOT NULL DEFAULT false;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS frozen_at timestamptz DEFAULT NULL;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS frozen_by uuid DEFAULT NULL;