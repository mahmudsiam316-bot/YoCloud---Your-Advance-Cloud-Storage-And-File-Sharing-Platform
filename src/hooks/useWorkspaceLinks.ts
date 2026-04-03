import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface InviteLink {
  id: string;
  workspace_id: string;
  created_by: string;
  token: string;
  role: string;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function useWorkspaceInviteLinks(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace_invite_links", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_invite_links" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as InviteLink[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateInviteLink() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, role, maxUses, expiresInDays }: {
      workspaceId: string;
      role: string;
      maxUses?: number;
      expiresInDays?: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const expires_at = expiresInDays
        ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("workspace_invite_links" as any)
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          role,
          max_uses: maxUses || null,
          expires_at,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as InviteLink;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace_invite_links"] });
      toast.success("Invite link created!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useJoinViaLink() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      if (!user) throw new Error("Not authenticated");

      // Find the link
      const { data: link, error: findErr } = await supabase
        .from("workspace_invite_links" as any)
        .select("*")
        .eq("token", token)
        .eq("is_active", true)
        .single();
      if (findErr || !link) throw new Error("Invalid or expired invite link");

      const l = link as unknown as InviteLink;

      // Check expiry
      if (l.expires_at && new Date(l.expires_at) < new Date()) {
        throw new Error("This invite link has expired");
      }

      // Check max uses
      if (l.max_uses && l.use_count >= l.max_uses) {
        throw new Error("This invite link has reached its usage limit");
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", l.workspace_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) throw new Error("You are already a member of this workspace");

      // Create an accepted invite first (needed for RLS)
      const { error: invErr } = await supabase
        .from("workspace_invites")
        .insert({
          workspace_id: l.workspace_id,
          email: user.email!,
          invited_by: l.created_by,
          role: l.role as any,
          status: "accepted",
        });
      if (invErr) throw invErr;

      // Join workspace
      const { error: memErr } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: l.workspace_id, user_id: user.id, role: l.role as any });
      if (memErr) throw memErr;

      // Increment use count
      await supabase
        .from("workspace_invite_links" as any)
        .update({ use_count: l.use_count + 1 } as any)
        .eq("id", l.id);

      return l;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Joined workspace!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeactivateInviteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workspace_invite_links" as any)
        .update({ is_active: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace_invite_links"] });
      toast.success("Link deactivated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
