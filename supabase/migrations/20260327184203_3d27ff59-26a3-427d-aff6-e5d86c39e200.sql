
-- Marketplace categories
CREATE TABLE public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT '📁',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.marketplace_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categories" ON public.marketplace_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default categories
INSERT INTO public.marketplace_categories (name, icon, sort_order) VALUES
  ('Documents', '📄', 1),
  ('Images', '🖼️', 2),
  ('Videos', '🎬', 3),
  ('Audio', '🎵', 4),
  ('Design', '🎨', 5),
  ('Development', '💻', 6),
  ('Education', '📚', 7),
  ('Templates', '📋', 8),
  ('Other', '📦', 9);

-- Marketplace listings
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES public.marketplace_categories(id),
  visibility text NOT NULL DEFAULT 'public',
  thumbnail_url text,
  download_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(file_id)
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public listings" ON public.marketplace_listings
  FOR SELECT TO authenticated
  USING (visibility = 'public' AND status = 'active');

CREATE POLICY "Users can view own listings" ON public.marketplace_listings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own listings" ON public.marketplace_listings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own listings" ON public.marketplace_listings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own listings" ON public.marketplace_listings
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all listings" ON public.marketplace_listings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Marketplace listing tags (many-to-many)
CREATE TABLE public.marketplace_listing_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, tag_name)
);

ALTER TABLE public.marketplace_listing_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read listing tags" ON public.marketplace_listing_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Listing owners can manage tags" ON public.marketplace_listing_tags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM marketplace_listings ml WHERE ml.id = listing_id AND ml.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM marketplace_listings ml WHERE ml.id = listing_id AND ml.user_id = auth.uid()));

-- Marketplace likes
CREATE TABLE public.marketplace_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

ALTER TABLE public.marketplace_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes" ON public.marketplace_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own likes" ON public.marketplace_likes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Marketplace comments
CREATE TABLE public.marketplace_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES public.marketplace_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON public.marketplace_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert comments" ON public.marketplace_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON public.marketplace_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.marketplace_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete any comment" ON public.marketplace_comments
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Marketplace saves (save to drive)
CREATE TABLE public.marketplace_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

ALTER TABLE public.marketplace_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read saves count" ON public.marketplace_saves
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own saves" ON public.marketplace_saves
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable realtime for marketplace_listings
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_listings;
