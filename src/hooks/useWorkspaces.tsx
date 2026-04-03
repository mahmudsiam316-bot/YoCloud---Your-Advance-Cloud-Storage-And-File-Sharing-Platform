import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Workspace {
  id: string;
  name: string;
  type: "personal" | "team";
  owner_id: string;
  description: string | null;
  avatar_url: string | null;
  color_theme: string | null;
  storage_limit: number;
  storage_plan: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  invited_by: string;
  role: "owner" | "admin" | "member";
  token: string;
  status: string;
  created_at: string;
  expires_at: string | null;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  switchWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  currentWorkspace: null,
  workspaces: [],
  isLoading: true,
  switchWorkspace: () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("type", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Auto-create personal workspace for existing users who don't have one
      if (data.length === 0 && user) {
        const workspaceId = crypto.randomUUID();
        const personalWorkspace: Workspace = {
          id: workspaceId,
          name: "Personal",
          type: "personal",
          owner_id: user.id,
          description: null,
          avatar_url: null,
          color_theme: null,
          storage_limit: 5368709120,
          storage_plan: "free",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: createErr } = await supabase
          .from("workspaces")
          .insert({ id: workspaceId, name: "Personal", type: "personal", owner_id: user.id });

        if (!createErr) {
          const { error: memberErr } = await supabase
            .from("workspace_members")
            .insert({ workspace_id: workspaceId, user_id: user.id, role: "owner" });

          if (!memberErr) {
            return [personalWorkspace];
          }
        }
      }

      return data as Workspace[];
    },
    enabled: !!user,
  });

  // Auto-select personal workspace
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspaceId) {
      const saved = localStorage.getItem(`ws_${user?.id}`);
      const found = saved ? workspaces.find((w) => w.id === saved) : null;
      setCurrentWorkspaceId(found?.id ?? workspaces.find((w) => w.type === "personal")?.id ?? workspaces[0].id);
    }
  }, [workspaces, currentWorkspaceId, user?.id]);

  const switchWorkspace = (id: string) => {
    setCurrentWorkspaceId(id);
    if (user?.id) localStorage.setItem(`ws_${user.id}`, id);
  };

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, workspaces, isLoading, switchWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspaceContext = () => useContext(WorkspaceContext);

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace_members", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return data as WorkspaceMember[];
    },
    enabled: !!workspaceId,
  });
}

export function useWorkspaceInvites(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace_invites", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WorkspaceInvite[];
    },
    enabled: !!workspaceId,
  });
}

export function useMyPendingInvites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_workspace_invites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("*, workspaces(*)")
        .eq("email", user!.email!)
        .eq("status", "pending");
      if (error) throw error;
      return data as (WorkspaceInvite & { workspaces: Workspace })[];
    },
    enabled: !!user?.email,
  });
}

export function useCreateWorkspace() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const workspaceId = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimisticWorkspace: Workspace = {
        id: workspaceId,
        name: name.trim(),
        type: "team",
        owner_id: user.id,
        description: description?.trim() || null,
        avatar_url: null,
        color_theme: null,
        storage_limit: 5368709120,
        storage_plan: "free",
        created_at: now,
        updated_at: now,
      };

      const { error } = await supabase
        .from("workspaces")
        .insert({ id: workspaceId, name: name.trim(), type: "team", owner_id: user.id, description: description?.trim() || null });
      if (error) throw error;

      const { error: memErr } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: user.id, role: "owner" });
      if (memErr) throw memErr;

      return optimisticWorkspace;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace created!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useInviteToWorkspace() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, email, role, workspaceName }: { workspaceId: string; email: string; role: "admin" | "member"; workspaceName?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("workspace_invites")
        .insert({ workspace_id: workspaceId, email: email.trim().toLowerCase(), invited_by: user.id, role });
      if (error) throw error;

      // Send invite email notification
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (session) {
          await supabase.functions.invoke("send-workspace-invite", {
            body: {
              email: email.trim().toLowerCase(),
              workspaceName: workspaceName || "Team Workspace",
              role,
            },
          });
        }
      } catch (emailErr) {
        console.warn("Failed to send invite email:", emailErr);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace_invites"] });
      toast.success("Invite sent with email notification!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAcceptInvite() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (invite: WorkspaceInvite) => {
      if (!user) throw new Error("Not authenticated");
      // Update invite status
      const { error: updErr } = await supabase
        .from("workspace_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);
      if (updErr) throw updErr;

      // Add as member
      const { error: memErr } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: invite.workspace_id, user_id: user.id, role: invite.role });
      if (memErr) throw memErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      qc.invalidateQueries({ queryKey: ["my_workspace_invites"] });
      toast.success("Joined workspace!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace_members"] });
      toast.success("Member removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: "admin" | "member" }) => {
      const { error } = await supabase.from("workspace_members").update({ role }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace_members"] });
      toast.success("Role updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
