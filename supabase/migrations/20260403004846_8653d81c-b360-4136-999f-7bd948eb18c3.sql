
CREATE TABLE public.user_terms_acceptance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMP WITH TIME ZONE,
  version TEXT NOT NULL DEFAULT '1.0',
  scroll_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, version)
);

ALTER TABLE public.user_terms_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acceptance" ON public.user_terms_acceptance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own acceptance" ON public.user_terms_acceptance
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own acceptance" ON public.user_terms_acceptance
  FOR UPDATE USING (user_id = auth.uid());

CREATE TRIGGER update_terms_acceptance_updated_at
  BEFORE UPDATE ON public.user_terms_acceptance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
