
-- Activity log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
ON public.activity_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
ON public.activity_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_activity_log_user_created ON public.activity_log(user_id, created_at DESC);
