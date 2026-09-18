import { getCurrentUser } from "./lib/access";
export { workspacesPage } from "./lib/directoryQueries";
import { ConvexError } from "convex/values";
import { deleteBoard } from "./lib/cascade";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      description: args.description,
      ownerId: user._id,
      createdAt: Date.now(),
    });

    return await ctx.db.get(workspaceId);
  },
});

export const update = mutation({
  args: {
    id: v.id("workspaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const workspace = await ctx.db.get(args.id);

    if (!workspace || workspace.ownerId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND" });
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
    const user = await getCurrentUser(ctx);

    const workspace = await ctx.db.get(args.id);

    if (!workspace || workspace.ownerId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.id))
      .collect();

    for (const board of boards) await deleteBoard(ctx, board._id);

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
