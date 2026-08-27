import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
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

    const board = await ctx.db.get(args.boardId);

    if (!board || board.userId !== user._id) {
      throw new Error("Board not found");
    }

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

    if (board.userId !== user._id) {
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

export const initializeDefaultColumns = mutation({
  args: {
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
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

    const board = await ctx.db.get(args.boardId);

    if (!board || board.userId !== user._id) {
      throw new Error("Board not found");
    }

    const existingColumns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    if (existingColumns.length > 0) {
      return existingColumns.sort((a, b) => a.order - b.order);
    }
    const defaultColumns = [
      {
        name: "Backlog",
        color: "#64748b",
        order: 0,
      },
      {
        name: "To Do",
        color: "#22d3ee",
        order: 1,
      },
      {
        name: "In Progress",
        color: "#8b5cf6",
        order: 2,
      },
      {
        name: "Review",
        color: "#f59e0b",
        order: 3,
      },
      {
        name: "Testing",
        color: "#3b82f6",
        order: 4,
      },
      {
        name: "Done",
        color: "#22c55e",
        order: 5,
      },
    ];

    const createdColumns = [];

    for (const column of defaultColumns) {
      const columnId = await ctx.db.insert("columns", {
        name: column.name,
        color: column.color,
        boardId: args.boardId,
        userId: user._id,
        order: column.order,
        createdAt: Date.now(),
      });

      const createdColumn = await ctx.db.get(columnId);

      if (createdColumn) {
        createdColumns.push(createdColumn);
      }
    }

    return createdColumns;
  },
});

export const update = mutation({
  args: {
    id: v.id("columns"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const column = await ctx.db.get(args.id);
    if (!column || column.userId !== user._id)
      throw new Error("Column not found");

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

    const column = await ctx.db.get(args.id);

    if (!column || column.userId !== user._id) {
      throw new Error("Column not found");
    }

    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("columnId"), args.id))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    await ctx.db.delete(args.id);
  },
});
