
-- Add download limit and custom slug to file_shares
ALTER TABLE public.file_shares 
  ADD COLUMN IF NOT EXISTS download_limit integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_slug text DEFAULT NULL;

-- Unique index on custom_slug (partial - only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_shares_custom_slug ON public.file_shares (custom_slug) WHERE custom_slug IS NOT NULL;

-- Share invites table for email-based sharing
CREATE TABLE public.share_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.file_shares(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(share_id, email)
);

ALTER TABLE public.share_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own invites"
  ON public.share_invites FOR ALL
  TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Invited users can view their invites"
  ON public.share_invites FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Enhance share_access_log with analytics fields
ALTER TABLE public.share_access_log
  ADD COLUMN IF NOT EXISTS country text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS device_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referrer text DEFAULT NULL;
