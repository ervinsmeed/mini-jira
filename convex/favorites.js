import { getCurrentUser } from "./lib/access";
import { ConvexError } from "convex/values";
import { requireParentWorkspaceAccess } from "./lib/workspaceAccess";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireBoardPermission(ctx, user, boardId, permission) {
  const board = await ctx.db.get("boards", boardId);

  if (!board) {
    throw new ConvexError({ code: "NOT_FOUND" });
  }

  const parentAccess = await requireParentWorkspaceAccess(ctx, user._id, board);
  if (parentAccess.isWorkspaceOwner || board.userId === user._id) {
    return board;
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

  const role = await ctx.db.get("roles", membership.roleId);

  if (!role || role.workspaceId !== board.workspaceId) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  if (!role.permissions.includes(permission)) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  return board;
}

export const toggleProject = mutation({
  args: {
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    await requireBoardPermission(ctx, user, args.boardId, "project.view");

    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_board", (q) =>
        q
          .eq("userId", user._id)
          .eq("boardId", args.boardId)
          .eq("itemType", "project"),
      )
      .unique();

    if (existingFavorite) {
      await ctx.db.delete(existingFavorite._id);

      return {
        isFavorite: false,
        boardId: args.boardId,
      };
    }

    await ctx.db.insert("favorites", {
      userId: user._id,
      boardId: args.boardId,
      itemType: "project",
      createdAt: Date.now(),
    });

    return {
      isFavorite: true,
      boardId: args.boardId,
    };
  },
});

export const toggleTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const task = await ctx.db.get("tasks", args.taskId);

    if (!task) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    await requireBoardPermission(ctx, user, task.boardId, "task.view");

    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_task", (q) =>
        q.eq("userId", user._id).eq("taskId", args.taskId),
      )
      .unique();

    if (existingFavorite) {
      await ctx.db.delete(existingFavorite._id);

      return {
        isFavorite: false,
        taskId: args.taskId,
      };
    }

    await ctx.db.insert("favorites", {
      userId: user._id,
      boardId: task.boardId,
      taskId: task._id,
      itemType: "task",
      createdAt: Date.now(),
    });

    return {
      isFavorite: true,
      taskId: args.taskId,
    };
  },
});
