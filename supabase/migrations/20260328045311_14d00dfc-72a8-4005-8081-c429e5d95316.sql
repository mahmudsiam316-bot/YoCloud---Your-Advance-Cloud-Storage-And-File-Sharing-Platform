
-- Fix: Remove overly permissive policy and replace with proper ones
DROP POLICY "System can upsert analytics" ON public.marketplace_daily_analytics;

-- The SECURITY DEFINER functions handle inserts/updates, so no direct user access needed for writes
-- Only SELECT policies remain (already created above)
