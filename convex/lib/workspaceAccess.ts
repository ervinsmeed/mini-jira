import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

export async function getParentWorkspaceAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  board: Doc<"boards">,
) {
  if (!board.workspaceId) return { workspace: null, isWorkspaceOwner: false };

  const workspace = await ctx.db.get("workspaces", board.workspaceId);
  if (!workspace) return null;
  if (workspace.ownerId === userId) {
    return { workspace, isWorkspaceOwner: true };
  }

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspace._id).eq("userId", userId),
    )
    .unique();
  return membership ? { workspace, isWorkspaceOwner: false } : null;
}

export async function requireParentWorkspaceAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  board: Doc<"boards">,
) {
  const access = await getParentWorkspaceAccess(ctx, userId, board);
  if (!access) throw new ConvexError({ code: "ACCESS_DENIED" });
  return access;
}
