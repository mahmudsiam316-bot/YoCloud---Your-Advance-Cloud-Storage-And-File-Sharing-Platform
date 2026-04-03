
-- Verify columns exist (no-op if already added)
ALTER TABLE public.api_usage_logs ADD COLUMN IF NOT EXISTS request_headers jsonb DEFAULT NULL;
ALTER TABLE public.api_usage_logs ADD COLUMN IF NOT EXISTS request_body jsonb DEFAULT NULL;
ALTER TABLE public.api_usage_logs ADD COLUMN IF NOT EXISTS response_body text DEFAULT NULL;
ALTER TABLE public.api_usage_logs ADD COLUMN IF NOT EXISTS file_metadata jsonb DEFAULT NULL;
ALTER TABLE public.api_usage_logs ADD COLUMN IF NOT EXISTS error_message text DEFAULT NULL;
ALTER TABLE public.api_usage_logs ADD COLUMN IF NOT EXISTS error_type text DEFAULT NULL;
ALTER TABLE public.api_usage_logs ADD COLUMN IF NOT EXISTS error_stack text DEFAULT NULL;
ALTER TABLE public.api_usage_logs ADD COLUMN IF NOT EXISTS ai_metadata jsonb DEFAULT NULL;
ALTER TABLE public.api_usage_logs ALTER COLUMN api_key_id DROP NOT NULL;
