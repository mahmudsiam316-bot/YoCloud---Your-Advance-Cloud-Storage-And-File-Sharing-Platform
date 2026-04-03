
-- API Subscriptions table for tracking API billing plans
CREATE TABLE public.api_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  auto_renew boolean NOT NULL DEFAULT true,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.api_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view own subscription
CREATE POLICY "Users can view own subscription"
  ON public.api_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert own subscription
CREATE POLICY "Users can insert own subscription"
  ON public.api_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own subscription
CREATE POLICY "Users can update own subscription"
  ON public.api_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins can manage all subscriptions"
  ON public.api_subscriptions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add api_plan column to transactions to distinguish API billing from storage billing
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_api_plan boolean NOT NULL DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER update_api_subscriptions_updated_at
  BEFORE UPDATE ON public.api_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
