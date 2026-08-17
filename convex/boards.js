import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
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

    if (args.workspaceId) {
      const workspace = await ctx.db.get(args.workspaceId);

      if (!workspace || workspace.ownerId !== user._id) {
        throw new Error("Workspace not found");
      }
    }

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const maxOrder = Math.max(...boards.map((b) => b.order || 0), -1);

    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      userId: user._id,
      workspaceId: args.workspaceId,
      status: "active",
      favorite: false,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    return await ctx.db.get(boardId);
  },
});

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("boards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()
      .then((boards) => boards.sort((a, b) => (a.order || 0) - (b.order || 0)));
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
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
      return [];
    }

    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace || workspace.ownerId !== user._id) {
      return [];
    }

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return boards.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
});

export const updateOrder = mutation({
  args: {
    boardId: v.id("boards"),
    newOrder: v.number(),
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

    await ctx.db.patch(args.boardId, {
      order: args.newOrder,
    });

    return await ctx.db.get(args.boardId);
  },
});

export const remove = mutation({
  args: {
    id: v.id("boards"),
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

    const board = await ctx.db.get(args.id);

    if (!board || board.userId !== user._id) {
      throw new Error("Board not found");
    }

    // Delete all the tasks in the board
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // Delete all the columns
    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();

    for (const column of columns) {
      await ctx.db.delete(column._id);
    }

    // Delete the board
    await ctx.db.delete(args.id);
  },
});
