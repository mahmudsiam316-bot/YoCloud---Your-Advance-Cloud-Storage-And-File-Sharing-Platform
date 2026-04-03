
-- Comments table for file-level comments with threading
CREATE TABLE public.file_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.file_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.file_comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read comments on their own files
CREATE POLICY "Users can view comments on their files"
ON public.file_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.files WHERE files.id = file_comments.file_id AND files.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can insert comments"
ON public.file_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.file_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_file_comments_file ON public.file_comments(file_id, created_at);
