import { ConvexError } from "convex/values";
import { getParentWorkspaceAccess } from "./lib/workspaceAccess";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getCurrentUser(ctx) {
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

  return user;
}

async function canViewBoard(ctx, user, board) {
  const parentAccess = await getParentWorkspaceAccess(ctx, user._id, board);
  if (!parentAccess) return false;
  if (parentAccess.isWorkspaceOwner || board.userId === user._id) {
    return true;
  }

  if (!board.workspaceId) {
    return false;
  }

  const membership = await ctx.db
    .query("boardMembers")
    .withIndex("by_board_user", (q) =>
      q.eq("boardId", board._id).eq("userId", user._id),
    )
    .unique();

  if (!membership?.roleId) {
    return false;
  }

  const role = await ctx.db.get("roles", membership.roleId);

  return Boolean(
    role &&
    role.workspaceId === board.workspaceId &&
    role.permissions.includes("task.view"),
  );
}

export const recordView = mutation({
  args: {
    taskId: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const task = await ctx.db.get("tasks", args.taskId);

    if (!task) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const board = await ctx.db.get("boards", task.boardId);

    if (!board) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const hasAccess = await canViewBoard(ctx, user, board);

    if (!hasAccess) {
      throw new ConvexError({ code: "ACCESS_DENIED" });
    }

    const existingRecentTask = await ctx.db
      .query("recentTasks")
      .withIndex("by_user_task", (q) =>
        q.eq("userId", user._id).eq("taskId", task._id),
      )
      .unique();

    const viewedAt = Date.now();

    if (existingRecentTask) {
      await ctx.db.patch(existingRecentTask._id, {
        boardId: task.boardId,
        viewedAt,
      });

      return existingRecentTask._id;
    }

    return await ctx.db.insert("recentTasks", {
      userId: user._id,
      taskId: task._id,
      boardId: task.boardId,
      viewedAt,
    });
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const requestedLimit = Math.floor(args.limit ?? 8);
    const limit = Math.min(Math.max(requestedLimit, 1), 20);

    const recentEntries = await ctx.db
      .query("recentTasks")
      .withIndex("by_user_viewed_at", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    const result = [];

    for (const entry of recentEntries) {
      if (result.length >= limit) {
        break;
      }

      const task = await ctx.db.get("tasks", entry.taskId);
      const board = await ctx.db.get("boards", entry.boardId);

      if (!task || !board || task.boardId !== board._id) {
        continue;
      }

      const hasAccess = await canViewBoard(ctx, user, board);

      if (!hasAccess) {
        continue;
      }

      result.push({
        recentTaskId: entry._id,
        viewedAt: entry.viewedAt,
        task,
        board: {
          _id: board._id,
          name: board.name,
        },
      });
    }

    return result;
  },
});

export const clear = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const recentEntries = await ctx.db
      .query("recentTasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const entry of recentEntries) {
      await ctx.db.delete(entry._id);
    }

    return {
      deletedCount: recentEntries.length,
    };
  },
});
