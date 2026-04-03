
-- Add is_pinned and read_at to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Add notification preferences to user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notification_sound boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notification_vibrate boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notification_dnd boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notification_muted_types text[] NOT NULL DEFAULT '{}';
