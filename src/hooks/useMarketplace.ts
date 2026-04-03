import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface MarketplaceListing {
  id: string;
  user_id: string;
  file_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  visibility: string;
  thumbnail_url: string | null;
  download_count: number;
  like_count: number;
  save_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  // Joined
  file?: any;
  category?: any;
  tags?: string[];
  profile?: any;
  user_liked?: boolean;
  user_saved?: boolean;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

const PAGE_SIZE = 20;

export function useMarketplaceCategories() {
  return useQuery({
    queryKey: ["marketplace-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_categories" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data as any[]) as MarketplaceCategory[];
    },
  });
}

export function useMarketplaceListings(options?: {
  category?: string;
  search?: string;
  sort?: string;
  fileType?: string;
  tag?: string;
}) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ["marketplace-listings", options],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("marketplace_listings" as any)
        .select("*, files!inner(name, mime_type, size, cloudinary_url, cloudinary_public_id), marketplace_categories(name, icon)" as any)
        
        .eq("status", "active")
        .eq("visibility", "public");

      if (options?.category) {
        query = query.eq("category_id", options.category);
      }
      if (options?.search) {
        query = query.ilike("title", `%${options.search}%`);
      }
      if (options?.fileType) {
        query = query.ilike("files.mime_type" as any, `${options.fileType}%`);
      }

      // Sort
      const sort = options?.sort || "newest";
      if (sort === "newest") query = query.order("created_at", { ascending: false });
      else if (sort === "most_downloaded") query = query.order("download_count", { ascending: false });
      else if (sort === "most_liked") query = query.order("like_count", { ascending: false });

      query = query.range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;

      // Get tags for listings
      const listingIds = (data as any[]).map((d: any) => d.id);
      let tagsMap: Record<string, string[]> = {};
      if (listingIds.length > 0) {
        const { data: tagsData } = await supabase
          .from("marketplace_listing_tags" as any)
          .select("listing_id, tag_name")
          .in("listing_id", listingIds);
        if (tagsData) {
          (tagsData as any[]).forEach((t: any) => {
            if (!tagsMap[t.listing_id]) tagsMap[t.listing_id] = [];
            tagsMap[t.listing_id].push(t.tag_name);
          });
        }
      }

      // Fetch profiles for unique user_ids
      const userIds = [...new Set((data as any[]).map((d: any) => d.user_id))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, email").in("id", userIds);
        profiles?.forEach((p: any) => { profilesMap[p.id] = p; });
      }

      // Check if user liked/saved
      let likesSet = new Set<string>();
      let savesSet = new Set<string>();
      if (user && listingIds.length > 0) {
        const [{ data: likes }, { data: saves }] = await Promise.all([
          supabase.from("marketplace_likes" as any).select("listing_id").eq("user_id", user.id).in("listing_id", listingIds),
          supabase.from("marketplace_saves" as any).select("listing_id").eq("user_id", user.id).in("listing_id", listingIds),
        ]);
        likes?.forEach((l: any) => likesSet.add(l.listing_id));
        saves?.forEach((s: any) => savesSet.add(s.listing_id));
      }

      return (data as any[]).map((item: any) => ({
        ...item,
        file: item.files,
        category: item.marketplace_categories,
        profile: profilesMap[item.user_id] || null,
        tags: tagsMap[item.id] || [],
        user_liked: likesSet.has(item.id),
        user_saved: savesSet.has(item.id),
      })) as MarketplaceListing[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
  });
}

export function useMarketplaceListing(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["marketplace-listing", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings" as any)
        .select("*, files!inner(name, mime_type, size, cloudinary_url, cloudinary_public_id), marketplace_categories(name, icon)" as any)
        .eq("id", id!)
        .single();
      if (error) throw error;

      // Fetch profile
      const { data: profileData } = await supabase.from("profiles").select("id, display_name, avatar_url, email").eq("id", (data as any).user_id).single();

      // Tags
      const { data: tags } = await supabase
        .from("marketplace_listing_tags" as any)
        .select("tag_name")
        .eq("listing_id", id!);

      // User interactions
      let user_liked = false, user_saved = false;
      if (user) {
        const [{ data: like }, { data: save }] = await Promise.all([
          supabase.from("marketplace_likes" as any).select("id").eq("listing_id", id!).eq("user_id", user.id).maybeSingle(),
          supabase.from("marketplace_saves" as any).select("id").eq("listing_id", id!).eq("user_id", user.id).maybeSingle(),
        ]);
        user_liked = !!like;
        user_saved = !!save;
      }

      return {
        ...(data as any),
        file: (data as any).files,
        category: (data as any).marketplace_categories,
        profile: profileData,
        tags: (tags as any[] || []).map((t: any) => t.tag_name),
        user_liked,
        user_saved,
      } as MarketplaceListing;
    },
  });
}

export function usePublishToMarketplace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      fileId: string;
      title: string;
      description?: string;
      categoryId?: string;
      visibility: string;
      thumbnailUrl?: string;
      tags: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if already published
      const { data: existing } = await supabase
        .from("marketplace_listings" as any)
        .select("id")
        .eq("file_id", input.fileId)
        .maybeSingle();
      if (existing) throw new Error("This file is already published to marketplace");

      const { data, error } = await supabase
        .from("marketplace_listings" as any)
        .insert({
          user_id: user.id,
          file_id: input.fileId,
          title: input.title,
          description: input.description || null,
          category_id: input.categoryId || null,
          visibility: input.visibility,
          thumbnail_url: input.thumbnailUrl || null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      // Insert tags
      if (input.tags.length > 0) {
        await supabase.from("marketplace_listing_tags" as any).insert(
          input.tags.map(tag => ({ listing_id: (data as any).id, tag_name: tag })) as any
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      toast.success("Published to marketplace!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useToggleLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, liked }: { listingId: string; liked: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (liked) {
        await supabase.from("marketplace_likes" as any).delete().eq("listing_id", listingId).eq("user_id", user.id);
        await supabase.rpc("record_marketplace_like" as any, { p_listing_id: listingId, p_delta: -1 });
      } else {
        await supabase.from("marketplace_likes" as any).insert({ listing_id: listingId, user_id: user.id } as any);
        await supabase.rpc("record_marketplace_like" as any, { p_listing_id: listingId, p_delta: 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listing"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-analytics"] });
    },
  });
}

export function useToggleSave() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, saved }: { listingId: string; saved: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (saved) {
        await supabase.from("marketplace_saves" as any).delete().eq("listing_id", listingId).eq("user_id", user.id);
        await supabase.rpc("record_marketplace_save" as any, { p_listing_id: listingId, p_delta: -1 });
      } else {
        await supabase.from("marketplace_saves" as any).insert({ listing_id: listingId, user_id: user.id } as any);
        await supabase.rpc("record_marketplace_save" as any, { p_listing_id: listingId, p_delta: 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listing"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-analytics"] });
    },
  });
}

export function useIncrementDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      await supabase.rpc("record_marketplace_download" as any, { p_listing_id: listingId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listing"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-analytics"] });
    },
  });
}

export function useMarketplaceAnalytics(listingIds: string[], days: number = 30) {
  return useQuery({
    queryKey: ["marketplace-analytics", listingIds, days],
    enabled: listingIds.length > 0,
    queryFn: async () => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromStr = fromDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("marketplace_daily_analytics" as any)
        .select("*")
        .in("listing_id", listingIds)
        .gte("date", fromStr)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data as any[]) as { listing_id: string; date: string; downloads: number; likes: number; saves: number }[];
    },
  });
}



export function useMarketplaceComments(listingId: string | null) {
  return useQuery({
    queryKey: ["marketplace-comments", listingId],
    enabled: !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_comments" as any)
        .select("*")
        .eq("listing_id", listingId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useAddMarketplaceComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, content, parentId }: { listingId: string; content: string; parentId?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("marketplace_comments" as any).insert({
        listing_id: listingId,
        user_id: user.id,
        user_email: user.email || "Unknown",
        content: content.trim(),
        parent_comment_id: parentId || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-comments", vars.listingId] });
    },
  });
}

export function useDeleteMarketplaceComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, listingId }: { commentId: string; listingId: string }) => {
      const { error } = await supabase.from("marketplace_comments" as any).delete().eq("id", commentId);
      if (error) throw error;
      return listingId;
    },
    onSuccess: (listingId) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-comments", listingId] });
    },
  });
}

export function useUserMarketplaceProfile(userId: string | null) {
  return useQuery({
    queryKey: ["marketplace-user-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: listings, error } = await supabase
        .from("marketplace_listings" as any)
        .select("*, files(name, mime_type, size, cloudinary_url)")
        .eq("user_id", userId!)
        .eq("status", "active")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const totalDownloads = (listings as any[]).reduce((sum: number, l: any) => sum + (l.download_count || 0), 0);
      const totalLikes = (listings as any[]).reduce((sum: number, l: any) => sum + (l.like_count || 0), 0);

      return {
        listings: listings as any[],
        totalUploads: (listings as any[]).length,
        totalDownloads,
        totalLikes,
      };
    },
  });
}

export function useMyMarketplaceListings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-marketplace-listings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings" as any)
        .select("*, files(name, mime_type, size, cloudinary_url), marketplace_categories(name, icon)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUnpublishListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase
        .from("marketplace_listings" as any)
        .delete()
        .eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-marketplace-listings"] });
      toast.success("Listing removed from marketplace");
    },
  });
}
