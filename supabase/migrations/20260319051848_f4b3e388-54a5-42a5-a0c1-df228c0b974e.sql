
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.files(id) ON DELETE CASCADE DEFAULT NULL;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS is_folder boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_files_parent_id ON public.files(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
