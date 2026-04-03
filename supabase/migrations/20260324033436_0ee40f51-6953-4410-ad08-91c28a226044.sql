-- Add share_code column to file_shares
ALTER TABLE public.file_shares ADD COLUMN IF NOT EXISTS share_code text UNIQUE;

-- Function to generate a random 6-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM file_shares WHERE share_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.share_code := new_code;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate share_code on insert
CREATE TRIGGER trg_generate_share_code
  BEFORE INSERT ON public.file_shares
  FOR EACH ROW
  WHEN (NEW.share_code IS NULL)
  EXECUTE FUNCTION public.generate_share_code();

-- Backfill existing rows
UPDATE public.file_shares SET share_code = upper(substr(md5(random()::text || id::text), 1, 6)) WHERE share_code IS NULL;