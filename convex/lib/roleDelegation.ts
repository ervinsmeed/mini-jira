import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";

type RoleAccess = {
  isOwner: boolean;
  currentRole: Doc<"roles"> | null;
};

type DelegatedRole = Pick<
  Doc<"roles">,
  "workspaceId" | "level" | "permissions"
>;

// Access must come from a server-side access helper, never mutation arguments.
export function assertRoleDelegation(
  access: RoleAccess,
  workspaceId: Id<"workspaces">,
  role: DelegatedRole,
) {
  if (role.workspaceId !== workspaceId) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  if (!Number.isFinite(role.level)) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  if (access.isOwner) return;

  const currentRole = access.currentRole;
  if (!currentRole || currentRole.workspaceId !== workspaceId) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  if (!Number.isFinite(currentRole.level) || role.level >= currentRole.level) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  if (
    !role.permissions.every((permission) =>
      currentRole.permissions.includes(permission),
    )
  ) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }
}
