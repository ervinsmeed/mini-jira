import type { Doc, Id } from "../_generated/dataModel";

type RoleAccess = {
  isOwner: boolean;
  currentRole: Doc<"roles"> | null;
};

type DelegatedRole = Pick<Doc<"roles">, "workspaceId" | "level" | "permissions">;

// Access must come from a server-side access helper, never mutation arguments.
export function assertRoleDelegation(
  access: RoleAccess,
  workspaceId: Id<"workspaces">,
  role: DelegatedRole,
) {
  if (role.workspaceId !== workspaceId) {
    throw new Error("Role does not belong to this workspace");
  }

  if (!Number.isFinite(role.level)) {
    throw new Error("Role level must be finite");
  }

  if (access.isOwner) return;

  const currentRole = access.currentRole;
  if (!currentRole || currentRole.workspaceId !== workspaceId) {
    throw new Error("Access denied");
  }

  if (!Number.isFinite(currentRole.level) || role.level >= currentRole.level) {
    throw new Error("You can only delegate roles below your own level");
  }

  if (
    !role.permissions.every((permission) => currentRole.permissions.includes(permission))
  ) {
    throw new Error("You cannot delegate permissions you do not have");
  }
}
