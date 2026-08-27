import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
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

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      description: args.description,
      ownerId: user._id,
      createdAt: Date.now(),
    });

    return await ctx.db.get(workspaceId);
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

    const ownedWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const memberWorkspaces = [];

    for (const membership of memberships) {
      const workspace = await ctx.db.get(membership.workspaceId);

      if (workspace) {
        memberWorkspaces.push(workspace);
      }
    }

    const allWorkspaces = [...ownedWorkspaces, ...memberWorkspaces];

    return Array.from(
      new Map(
        allWorkspaces.map((workspace) => [workspace._id, workspace]),
      ).values(),
    );
  },
});

export const update = mutation({
  args: {
    id: v.id("workspaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
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

    const workspace = await ctx.db.get(args.id);

    if (!workspace || workspace.ownerId !== user._id) {
      throw new Error("Workspace not found");
    }

    const updates = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.id, updates);

    return await ctx.db.get(args.id);
  },
});
export const remove = mutation({
  args: {
    id: v.id("workspaces"),
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

    const workspace = await ctx.db.get(args.id);

    if (!workspace || workspace.ownerId !== user._id) {
      throw new Error("Workspace not found");
    }

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();

    for (const board of boards) {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();

      for (const task of tasks) {
        await ctx.db.delete(task._id);
      }

      const columns = await ctx.db
        .query("columns")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();

      for (const column of columns) {
        await ctx.db.delete(column._id);
      }

      const boardMembers = await ctx.db
        .query("boardMembers")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();

      for (const member of boardMembers) {
        await ctx.db.delete(member._id);
      }

      await ctx.db.delete(board._id);
    }

    const workspaceMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();

    for (const member of workspaceMembers) {
      await ctx.db.delete(member._id);
    }

    const roles = await ctx.db
      .query("roles")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();

    for (const role of roles) {
      await ctx.db.delete(role._id);
    }

    await ctx.db.delete(args.id);
  },
});
