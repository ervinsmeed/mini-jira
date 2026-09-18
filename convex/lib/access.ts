import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;
type Permission = Doc<"roles">["permissions"][number];

export async function getCurrentUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "NOT_AUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND" });
  return user;
}

export async function getWorkspacePermissionAccess(
  ctx: Ctx,
  workspaceId: Id<"workspaces">,
  permission: Permission,
) {
  const user = await getCurrentUser(ctx);
  const workspace = await ctx.db.get("workspaces", workspaceId);
  if (!workspace) throw new ConvexError({ code: "NOT_FOUND" });
  if (workspace.ownerId === user._id) {
    return { user, workspace, isOwner: true, currentRole: null };
  }
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", user._id),
    )
    .unique();
  const currentRole = membership?.roleId
    ? await ctx.db.get("roles", membership.roleId)
    : null;
  if (
    !currentRole ||
    currentRole.workspaceId !== workspaceId ||
    !currentRole.permissions.includes(permission)
  ) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }
  return { user, workspace, isOwner: false, currentRole };
}
