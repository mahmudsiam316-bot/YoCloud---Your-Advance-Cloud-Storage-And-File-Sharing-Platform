import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "yoc_";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function hashKey(key: string): Promise<string> {
  try {
    if (crypto?.subtle?.digest) {
      const encoded = new TextEncoder().encode(key);
      const hash = await crypto.subtle.digest("SHA-256", encoded);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // fallback below
  }
  // Simple fallback hash when crypto.subtle is unavailable
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return (hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64);
}

export function useApiKeys() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["api-keys", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, scopes }: { name: string; scopes: string[] }) => {
      const rawKey = generateApiKey();
      const keyHash = await hashKey(rawKey);
      const keyPrefix = rawKey.substring(0, 8);

      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user!.id,
          name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          scopes,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, raw_key: rawKey };
    },
    onSuccess: (data) => {
      if (data.raw_key) {
        sessionStorage.setItem('yocloud_last_api_key', data.raw_key);
        sessionStorage.setItem(`yocloud_api_key_${data.id}`, data.raw_key);
      }
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", keyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    },
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", keyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deleted");
    },
  });
}

// Fetch full log detail with all columns (request/response bodies, etc.)
export function useApiLogDetail(logId: string | null) {
  return useQuery({
    queryKey: ["api-log-detail", logId],
    queryFn: async () => {
      if (!logId) return null;
      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("*")
        .eq("id", logId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
    enabled: !!logId,
    staleTime: 30_000,
    retry: 1,
  });
}
export function useApiUsageStats(days = 30, keyId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["api-usage-stats", user?.id, days, keyId],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      let query = supabase
        .from("api_usage_logs")
        .select("id, endpoint, method, status_code, response_time_ms, created_at, request_size, response_size, api_key_id, ip_address, user_agent, error_message, error_type")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (keyId) {
        query = query.eq("api_key_id", keyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalCalls = data?.length || 0;
      const successCount = data?.filter(l => l.status_code < 400).length || 0;
      const avgResponseTime = totalCalls > 0
        ? Math.round(data!.reduce((s, l) => s + (l.response_time_ms || 0), 0) / totalCalls)
        : 0;
      const errorCount = data?.filter((l) => l.status_code >= 400).length || 0;
      const totalBandwidth = data?.reduce((s, l) => s + (l.request_size || 0) + (l.response_size || 0), 0) || 0;

      // Per-day breakdown
      const dailyMap: Record<string, { calls: number; errors: number; success: number; avgTime: number; times: number[] }> = {};
      data?.forEach((l) => {
        const day = l.created_at.substring(0, 10);
        if (!dailyMap[day]) dailyMap[day] = { calls: 0, errors: 0, success: 0, avgTime: 0, times: [] };
        dailyMap[day].calls++;
        dailyMap[day].times.push(l.response_time_ms || 0);
        if (l.status_code >= 400) dailyMap[day].errors++;
        else dailyMap[day].success++;
      });

      const daily = Object.entries(dailyMap)
        .map(([date, v]) => ({
          date,
          calls: v.calls,
          errors: v.errors,
          success: v.success,
          avgTime: v.times.length > 0 ? Math.round(v.times.reduce((a, b) => a + b, 0) / v.times.length) : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top endpoints
      const endpointMap: Record<string, { count: number; errors: number; avgTime: number; times: number[] }> = {};
      data?.forEach((l) => {
        const key = l.endpoint;
        if (!endpointMap[key]) endpointMap[key] = { count: 0, errors: 0, avgTime: 0, times: [] };
        endpointMap[key].count++;
        endpointMap[key].times.push(l.response_time_ms || 0);
        if (l.status_code >= 400) endpointMap[key].errors++;
      });
      const topEndpoints = Object.entries(endpointMap)
        .map(([endpoint, v]) => ({
          endpoint,
          count: v.count,
          errors: v.errors,
          avgTime: v.times.length > 0 ? Math.round(v.times.reduce((a, b) => a + b, 0) / v.times.length) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Method distribution
      const methodMap: Record<string, number> = {};
      data?.forEach(l => { methodMap[l.method] = (methodMap[l.method] || 0) + 1; });
      const methodDist = Object.entries(methodMap).map(([method, count]) => ({ method, count }));

      // Status distribution
      const statusMap: Record<string, number> = {};
      data?.forEach(l => {
        const group = l.status_code < 300 ? "2xx" : l.status_code < 400 ? "3xx" : l.status_code < 500 ? "4xx" : "5xx";
        statusMap[group] = (statusMap[group] || 0) + 1;
      });
      const statusDist = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

      // Peak hour
      const hourMap: Record<number, number> = {};
      data?.forEach(l => {
        const hour = new Date(l.created_at).getHours();
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      });
      const peakHour = Object.entries(hourMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0];

      return {
        totalCalls,
        successCount,
        avgResponseTime,
        errorCount,
        errorRate: totalCalls > 0 ? ((errorCount / totalCalls) * 100).toFixed(2) : "0",
        totalBandwidth,
        daily,
        topEndpoints,
        methodDist,
        statusDist,
        peakHour: peakHour ? `${peakHour[0]}:00` : "N/A",
        peakHourCalls: peakHour ? Number(peakHour[1]) : 0,
        recentLogs: data?.slice(0, 100) || [],
      };
    },
    enabled: !!user,
  });
}

export function useApiWebhooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["api-webhooks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_webhooks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ url, events }: { url: string; events: string[] }) => {
      const secret = "whsec_" + Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data, error } = await supabase.from("api_webhooks").insert({
        user_id: user!.id,
        url,
        events,
        secret,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-webhooks"] });
      toast.success("Webhook created!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-webhooks"] });
      toast.success("Webhook deleted");
    },
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("api_webhooks").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-webhooks"] }),
  });
}
