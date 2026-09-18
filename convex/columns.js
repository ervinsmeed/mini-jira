import { getCurrentUser } from "./lib/access";
import { ConvexError } from "convex/values";
import { deleteTask } from "./lib/cascade";
import {
  getParentWorkspaceAccess,
  requireParentWorkspaceAccess,
} from "./lib/workspaceAccess";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireColumnManager(ctx, boardId) {
  const user = await getCurrentUser(ctx);
  const board = await ctx.db.get(boardId);
  if (!board) throw new ConvexError({ code: "NOT_FOUND" });
  const parentAccess = await requireParentWorkspaceAccess(ctx, user._id, board);
  if (!parentAccess.isWorkspaceOwner && board.userId !== user._id) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }
  return { user, board };
}

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
    const { user } = await requireColumnManager(ctx, args.boardId);

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const maxOrder = Math.max(...columns.map((column) => column.order), -1);

    const columnId = await ctx.db.insert("columns", {
      name: args.name,
      color: args.color,
      boardId: args.boardId,
      userId: user._id,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    return await ctx.db.get(columnId);
  },
});
export const list = query({
  args: {
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const board = await ctx.db.get(args.boardId);

    if (!board) {
      return [];
    }

    const parentAccess = await getParentWorkspaceAccess(ctx, user._id, board);
    if (!parentAccess) return [];

    if (!parentAccess.isWorkspaceOwner && board.userId !== user._id) {
      if (!board.workspaceId) {
        return [];
      }

      const membership = await ctx.db
        .query("boardMembers")
        .withIndex("by_board_user", (q) =>
          q.eq("boardId", args.boardId).eq("userId", user._id),
        )
        .unique();

      if (!membership || !membership.roleId) {
        return [];
      }

      const role = await ctx.db.get(membership.roleId);

      if (
        !role ||
        role.workspaceId !== board.workspaceId ||
        !role.permissions.includes("task.view")
      ) {
        return [];
      }
    }

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return columns.sort((a, b) => a.order - b.order);
  },
});

export const update = mutation({
  args: {
    id: v.id("columns"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.id);
    if (!column) throw new ConvexError({ code: "NOT_FOUND" });
    await requireColumnManager(ctx, column.boardId);

    const updates = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("columns") },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.id);
    if (!column) throw new ConvexError({ code: "NOT_FOUND" });
    await requireColumnManager(ctx, column.boardId);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_board_column_order", (q) =>
        q.eq("boardId", column.boardId).eq("columnId", args.id),
      )
      .collect();

    for (const task of tasks) {
      await deleteTask(ctx, task);
    }

    await ctx.db.delete(args.id);
  },
});
