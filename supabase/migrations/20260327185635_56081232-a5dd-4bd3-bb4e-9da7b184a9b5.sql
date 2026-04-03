
-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram index on files.name
CREATE INDEX IF NOT EXISTS idx_files_name_trgm ON public.files USING gin (name gin_trgm_ops);

-- Create advanced search function
CREATE OR REPLACE FUNCTION public.search_files_advanced(
  _user_id uuid,
  _query text,
  _workspace_scope text DEFAULT 'all',
  _file_type text DEFAULT NULL,
  _size_min bigint DEFAULT NULL,
  _size_max bigint DEFAULT NULL,
  _date_from timestamptz DEFAULT NULL,
  _date_to timestamptz DEFAULT NULL,
  _sort_by text DEFAULT 'relevance',
  _limit_count int DEFAULT 30,
  _offset_count int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  name text,
  mime_type text,
  size bigint,
  is_folder boolean,
  cloudinary_url text,
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  workspace_id uuid,
  workspace_name text,
  workspace_type text,
  is_starred boolean,
  parent_id uuid,
  relevance_score real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.mime_type,
    f.size,
    f.is_folder,
    f.cloudinary_url,
    f.created_at,
    f.updated_at,
    f.user_id,
    f.workspace_id,
    w.name AS workspace_name,
    w.type AS workspace_type,
    f.is_starred,
    f.parent_id,
    similarity(f.name, _query)::real AS relevance_score
  FROM public.files f
  JOIN public.workspace_members wm ON wm.workspace_id = f.workspace_id AND wm.user_id = _user_id
  JOIN public.workspaces w ON w.id = f.workspace_id
  WHERE
    f.is_trashed = false
    AND (f.name ILIKE '%' || _query || '%' OR similarity(f.name, _query) > 0.1)
    AND (
      _workspace_scope = 'all'
      OR (_workspace_scope = 'personal' AND w.type = 'personal')
      OR (_workspace_scope = 'team' AND w.type = 'team')
      OR (f.workspace_id::text = _workspace_scope)
    )
    AND (
      _file_type IS NULL
      OR (_file_type = 'image' AND f.mime_type LIKE 'image/%')
      OR (_file_type = 'video' AND f.mime_type LIKE 'video/%')
      OR (_file_type = 'audio' AND f.mime_type LIKE 'audio/%')
      OR (_file_type = 'document' AND (f.mime_type LIKE '%document%' OR f.mime_type LIKE '%word%' OR f.mime_type LIKE 'text/%'))
      OR (_file_type = 'pdf' AND f.mime_type LIKE '%pdf%')
      OR (_file_type = 'archive' AND (f.mime_type LIKE '%zip%' OR f.mime_type LIKE '%archive%' OR f.mime_type LIKE '%compressed%'))
      OR (_file_type = 'spreadsheet' AND (f.mime_type LIKE '%sheet%' OR f.mime_type LIKE '%excel%' OR f.mime_type LIKE '%csv%'))
      OR (_file_type = 'folder' AND f.is_folder = true)
    )
    AND (_size_min IS NULL OR f.size >= _size_min)
    AND (_size_max IS NULL OR f.size <= _size_max)
    AND (_date_from IS NULL OR f.updated_at >= _date_from)
    AND (_date_to IS NULL OR f.updated_at <= _date_to)
  ORDER BY
    CASE WHEN _sort_by = 'relevance' THEN similarity(f.name, _query) END DESC NULLS LAST,
    CASE WHEN _sort_by = 'newest' THEN f.updated_at END DESC NULLS LAST,
    CASE WHEN _sort_by = 'oldest' THEN f.updated_at END ASC NULLS LAST,
    CASE WHEN _sort_by = 'largest' THEN f.size END DESC NULLS LAST,
    CASE WHEN _sort_by = 'smallest' THEN f.size END ASC NULLS LAST,
    f.updated_at DESC
  LIMIT _limit_count
  OFFSET _offset_count;
END;
$$;
