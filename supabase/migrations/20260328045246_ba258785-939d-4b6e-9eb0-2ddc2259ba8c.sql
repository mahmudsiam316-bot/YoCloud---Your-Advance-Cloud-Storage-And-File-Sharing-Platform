
-- Daily analytics table for marketplace listings
CREATE TABLE public.marketplace_daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  downloads INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, date)
);

ALTER TABLE public.marketplace_daily_analytics ENABLE ROW LEVEL SECURITY;

-- Owners can view their own listing analytics
CREATE POLICY "Users can view own listing analytics"
ON public.marketplace_daily_analytics FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_listings ml
    WHERE ml.id = marketplace_daily_analytics.listing_id
    AND ml.user_id = auth.uid()
  )
);

-- Admins can view all analytics
CREATE POLICY "Admins can view all analytics"
ON public.marketplace_daily_analytics FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert/update analytics (via trigger)
CREATE POLICY "System can upsert analytics"
ON public.marketplace_daily_analytics FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Function to record a download event
CREATE OR REPLACE FUNCTION public.record_marketplace_download(p_listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Increment listing counter
  UPDATE marketplace_listings SET download_count = download_count + 1 WHERE id = p_listing_id;
  -- Upsert daily analytics
  INSERT INTO marketplace_daily_analytics (listing_id, date, downloads)
  VALUES (p_listing_id, CURRENT_DATE, 1)
  ON CONFLICT (listing_id, date)
  DO UPDATE SET downloads = marketplace_daily_analytics.downloads + 1;
END;
$$;

-- Function to record a like event (+1 or -1)
CREATE OR REPLACE FUNCTION public.record_marketplace_like(p_listing_id UUID, p_delta INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE marketplace_listings SET like_count = GREATEST(0, like_count + p_delta) WHERE id = p_listing_id;
  IF p_delta > 0 THEN
    INSERT INTO marketplace_daily_analytics (listing_id, date, likes)
    VALUES (p_listing_id, CURRENT_DATE, 1)
    ON CONFLICT (listing_id, date)
    DO UPDATE SET likes = marketplace_daily_analytics.likes + 1;
  END IF;
END;
$$;

-- Function to record a save event (+1 or -1)
CREATE OR REPLACE FUNCTION public.record_marketplace_save(p_listing_id UUID, p_delta INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE marketplace_listings SET save_count = GREATEST(0, save_count + p_delta) WHERE id = p_listing_id;
  IF p_delta > 0 THEN
    INSERT INTO marketplace_daily_analytics (listing_id, date, saves)
    VALUES (p_listing_id, CURRENT_DATE, 1)
    ON CONFLICT (listing_id, date)
    DO UPDATE SET saves = marketplace_daily_analytics.saves + 1;
  END IF;
END;
$$;
