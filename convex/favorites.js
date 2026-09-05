import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getCurrentUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function requireBoardPermission(ctx, user, boardId, permission) {
  const board = await ctx.db.get("boards", boardId);

  if (!board) {
    throw new Error("Project not found");
  }

  if (board.userId === user._id) {
    return board;
  }

  if (!board.workspaceId) {
    throw new Error("Access denied");
  }

  const membership = await ctx.db
    .query("boardMembers")
    .withIndex("by_board_user", (q) =>
      q.eq("boardId", boardId).eq("userId", user._id),
    )
    .unique();

  if (!membership || !membership.roleId) {
    throw new Error("Access denied");
  }

  const role = await ctx.db.get("roles", membership.roleId);

  if (!role || role.workspaceId !== board.workspaceId) {
    throw new Error("Access denied");
  }

  if (!role.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }

  return board;
}

export const listProjectIds = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", user._id).eq("itemType", "project"),
      )
      .collect();

    return favorites.map((favorite) => favorite.boardId);
  },
});

export const listTaskIds = query({
  args: {
    boardId: v.optional(v.id("boards")),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", user._id).eq("itemType", "task"),
      )
      .collect();

    return favorites
      .filter(
        (favorite) =>
          favorite.taskId &&
          (!args.boardId || favorite.boardId === args.boardId),
      )
      .map((favorite) => favorite.taskId);
  },
});

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
      throw new Error("Task not found");
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
