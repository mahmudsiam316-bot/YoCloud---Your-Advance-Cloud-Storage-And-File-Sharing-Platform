
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  theme text NOT NULL DEFAULT 'system',
  country text DEFAULT NULL,
  profession text[] NOT NULL DEFAULT '{}',
  usage_intent text[] NOT NULL DEFAULT '{}',
  notifications_enabled boolean NOT NULL DEFAULT true,
  email_updates_enabled boolean NOT NULL DEFAULT false,
  ai_enabled boolean NOT NULL DEFAULT true,
  experience_level text NOT NULL DEFAULT 'beginner',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
ON public.user_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
ON public.user_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
ON public.user_preferences FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
