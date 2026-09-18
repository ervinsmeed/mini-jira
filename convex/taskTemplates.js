import { getTaskPermissionAccess } from "./lib/taskAccess";
import { ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

const priorityValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

const storyPointsValidator = v.union(
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(5),
  v.literal(8),
  v.literal(13),
  v.literal(21),
);

export const create = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    storyPoints: v.optional(storyPointsValidator),
  },

  handler: async (ctx, args) => {
    const { user } = await getTaskPermissionAccess(
      ctx,
      args.boardId,
      "task.create",
    );

    const name = args.name.trim();

    if (!name) {
      throw new ConvexError({ code: "VALIDATION_FAILED" });
    }

    const existingTemplates = await ctx.db
      .query("taskTemplates")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const duplicate = existingTemplates.some(
      (template) => template.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      throw new ConvexError({ code: "VALIDATION_FAILED" });
    }

    const templateId = await ctx.db.insert("taskTemplates", {
      name,
      title: args.title?.trim() || undefined,
      description: args.description?.trim() || undefined,
      priority: args.priority,
      storyPoints: args.storyPoints,
      boardId: args.boardId,
      userId: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get("taskTemplates", templateId);
  },
});

export const remove = mutation({
  args: {
    id: v.id("taskTemplates"),
  },

  handler: async (ctx, args) => {
    const template = await ctx.db.get("taskTemplates", args.id);

    if (!template) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    await getTaskPermissionAccess(ctx, template.boardId, "task.delete");

    await ctx.db.delete(args.id);

    return args.id;
  },
});
