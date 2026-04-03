
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- Share defaults
  default_access_type text NOT NULL DEFAULT 'public',
  default_expiry text NOT NULL DEFAULT 'never',
  require_password boolean NOT NULL DEFAULT false,
  allow_download boolean NOT NULL DEFAULT true,
  show_view_count boolean NOT NULL DEFAULT true,
  -- File settings
  auto_rename_duplicates boolean NOT NULL DEFAULT true,
  file_preview_enabled boolean NOT NULL DEFAULT true,
  auto_trash_days integer NOT NULL DEFAULT 30,
  -- Privacy
  analytics_enabled boolean NOT NULL DEFAULT false,
  activity_visible boolean NOT NULL DEFAULT true,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
