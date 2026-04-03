import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SearchFilters {
  workspaceScope: string; // 'all' | 'personal' | 'team' | workspace_id
  fileType: string | null;
  sizeMin: number | null;
  sizeMax: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: string; // 'relevance' | 'newest' | 'oldest' | 'largest' | 'smallest'
}

export const DEFAULT_FILTERS: SearchFilters = {
  workspaceScope: "all",
  fileType: null,
  sizeMin: null,
  sizeMax: null,
  dateFrom: null,
  dateTo: null,
  sortBy: "relevance",
};

export interface SearchResult {
  id: string;
  name: string;
  mime_type: string | null;
  size: number | null;
  is_folder: boolean;
  cloudinary_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_type: string;
  is_starred: boolean;
  parent_id: string | null;
  relevance_score: number;
}

const PAGE_SIZE = 30;

export function useAdvancedSearch(query: string, filters: SearchFilters) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ["advanced_search", query, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc("search_files_advanced", {
        _user_id: user!.id,
        _query: query,
        _workspace_scope: filters.workspaceScope,
        _file_type: filters.fileType,
        _size_min: filters.sizeMin,
        _size_max: filters.sizeMax,
        _date_from: filters.dateFrom,
        _date_to: filters.dateTo,
        _sort_by: filters.sortBy,
        _limit_count: PAGE_SIZE,
        _offset_count: pageParam * PAGE_SIZE,
      });

      if (error) throw error;
      return (data ?? []) as SearchResult[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: !!user && query.length >= 2,
  });
}
