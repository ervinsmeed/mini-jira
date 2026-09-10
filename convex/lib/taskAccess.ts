import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireParentWorkspaceAccess } from "./workspaceAccess";
export async function getTaskPermissionAccess(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<"boards">,
  permission: string,
) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError({ code: "NOT_AUTHENTICATED" });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError({ code: "NOT_FOUND" });
  }

  const board = await ctx.db.get("boards", boardId);

  if (!board) {
    throw new ConvexError({ code: "NOT_FOUND" });
  }

  const parentAccess = await requireParentWorkspaceAccess(ctx, user._id, board);

  if (parentAccess.isWorkspaceOwner || board.userId === user._id) {
    return {
      user,
      board,
      isOwner: true,
      currentRole: null,
    };
  }

  if (!board.workspaceId) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  const membership = await ctx.db
    .query("boardMembers")
    .withIndex("by_board_user", (q) =>
      q.eq("boardId", boardId).eq("userId", user._id),
    )
    .unique();

  if (!membership || !membership.roleId) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  const currentRole = await ctx.db.get("roles", membership.roleId);

  if (!currentRole || currentRole.workspaceId !== board.workspaceId) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  if (!currentRole.permissions.some((value) => value === permission)) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  const workspace = await ctx.db.get("workspaces", board.workspaceId);

  if (!workspace) {
    throw new ConvexError({ code: "NOT_FOUND" });
  }

  return {
    user,
    board,
    workspace,
    isOwner: false,
    currentRole,
  };
}
