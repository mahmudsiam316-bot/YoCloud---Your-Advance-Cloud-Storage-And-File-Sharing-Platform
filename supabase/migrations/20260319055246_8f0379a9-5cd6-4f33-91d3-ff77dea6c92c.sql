
-- File shares table
CREATE TABLE public.file_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_type TEXT NOT NULL DEFAULT 'public' CHECK (access_type IN ('public', 'private')),
  permission TEXT NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor')),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage their shares
CREATE POLICY "Users can manage their own shares"
  ON public.file_shares
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can read public shares by token (for the public share page)
CREATE POLICY "Anyone can read public shares by token"
  ON public.file_shares
  FOR SELECT
  TO anon, authenticated
  USING (access_type = 'public');

-- Share access log
CREATE TABLE public.share_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES public.file_shares(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE public.share_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Share owners can view access logs"
  ON public.share_access_log
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.file_shares fs
    WHERE fs.id = share_access_log.share_id AND fs.user_id = auth.uid()
  ));

-- Allow anonymous inserts to access log (for tracking)
CREATE POLICY "Anyone can log access"
  ON public.share_access_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Index for fast token lookups
CREATE INDEX idx_file_shares_token ON public.file_shares(token);

-- Trigger for updated_at
CREATE TRIGGER update_file_shares_updated_at
  BEFORE UPDATE ON public.file_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
