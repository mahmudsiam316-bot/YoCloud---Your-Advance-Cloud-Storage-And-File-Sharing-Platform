-- 1. Marketplace reports table for report queue
CREATE TABLE public.marketplace_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  details text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid DEFAULT NULL,
  resolved_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports" ON public.marketplace_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

-- Users can view own reports
CREATE POLICY "Users can view own reports" ON public.marketplace_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

-- Admins can manage all reports
CREATE POLICY "Admins can manage all reports" ON public.marketplace_reports
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add is_featured to marketplace_listings
ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- 3. Add marketplace_banned to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketplace_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketplace_banned_at timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketplace_banned_reason text DEFAULT NULL;