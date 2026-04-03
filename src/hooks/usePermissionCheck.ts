import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { useWorkspaceContext, useWorkspaceMembers } from "./useWorkspaces";
import { useMyWorkspacePermissions } from "./useWorkspacePermissions";

/**
 * Returns a permissions object for the current user in the current workspace.
 * Owners/admins always get full access. Members get custom permissions if set,
 * otherwise default (can_upload + can_edit only).
 */
export function usePermissionCheck() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { data: members = [] } = useWorkspaceMembers(currentWorkspace?.id ?? null);
  const { data: myPerms } = useMyWorkspacePermissions(currentWorkspace?.id ?? null);

  return useMemo(() => {
    const fullAccess = {
      canUpload: true,
      canDelete: true,
      canShare: true,
      canInvite: true,
      canEdit: true,
      canManageFolders: true,
      isOwnerOrAdmin: true,
      role: "owner" as string,
    };

    if (!user || !currentWorkspace) return fullAccess;

    // Personal workspace = full access
    if (currentWorkspace.type === "personal") return fullAccess;

    const myMembership = members.find((m) => m.user_id === user.id);
    if (!myMembership) return fullAccess;

    // Owner/Admin = full access
    if (myMembership.role === "owner" || myMembership.role === "admin") {
      return { ...fullAccess, role: myMembership.role };
    }

    // Member = use custom permissions or defaults
    const perms = myPerms || {
      can_upload: true,
      can_delete: false,
      can_share: false,
      can_invite: false,
      can_edit: true,
      can_manage_folders: false,
    };

    return {
      canUpload: perms.can_upload,
      canDelete: perms.can_delete,
      canShare: perms.can_share,
      canInvite: perms.can_invite,
      canEdit: perms.can_edit,
      canManageFolders: perms.can_manage_folders,
      isOwnerOrAdmin: false,
      role: myMembership.role,
    };
  }, [user, currentWorkspace, members, myPerms]);
}
