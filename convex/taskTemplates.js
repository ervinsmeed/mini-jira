import { mutation, query } from "./_generated/server";
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

async function getTaskPermissionAccess(ctx, boardId, permission) {
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

  const board = await ctx.db.get("boards", boardId);

  if (!board) {
    throw new Error("Project not found");
  }

  if (board.userId === user._id) {
    return {
      user,
      board,
    };
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

  return {
    user,
    board,
  };
}

export const list = query({
  args: {
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
    await getTaskPermissionAccess(ctx, args.boardId, "task.view");

    const templates = await ctx.db
      .query("taskTemplates")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return templates.sort((firstTemplate, secondTemplate) =>
      firstTemplate.name.localeCompare(secondTemplate.name),
    );
  },
});

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
      throw new Error("Template name is required");
    }

    const existingTemplates = await ctx.db
      .query("taskTemplates")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const duplicate = existingTemplates.some(
      (template) => template.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      throw new Error("A template with this name already exists");
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

export const update = mutation({
  args: {
    id: v.id("taskTemplates"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    storyPoints: v.optional(storyPointsValidator),
  },

  handler: async (ctx, args) => {
    const template = await ctx.db.get("taskTemplates", args.id);

    if (!template) {
      throw new Error("Template not found");
    }

    await getTaskPermissionAccess(ctx, template.boardId, "task.update");

    const updates = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      const name = args.name.trim();

      if (!name) {
        throw new Error("Template name is required");
      }

      const existingTemplates = await ctx.db
        .query("taskTemplates")
        .withIndex("by_board", (q) => q.eq("boardId", template.boardId))
        .collect();

      const duplicate = existingTemplates.some(
        (currentTemplate) =>
          currentTemplate._id !== template._id &&
          currentTemplate.name.trim().toLowerCase() === name.toLowerCase(),
      );

      if (duplicate) {
        throw new Error("A template with this name already exists");
      }

      updates.name = name;
    }

    if (args.title !== undefined) {
      updates.title = args.title.trim() || undefined;
    }

    if (args.description !== undefined) {
      updates.description = args.description.trim() || undefined;
    }

    if (args.priority !== undefined) {
      updates.priority = args.priority;
    }

    if (args.storyPoints !== undefined) {
      updates.storyPoints = args.storyPoints;
    }

    await ctx.db.patch(args.id, updates);

    return await ctx.db.get("taskTemplates", args.id);
  },
});

export const remove = mutation({
  args: {
    id: v.id("taskTemplates"),
  },

  handler: async (ctx, args) => {
    const template = await ctx.db.get("taskTemplates", args.id);

    if (!template) {
      throw new Error("Template not found");
    }

    await getTaskPermissionAccess(ctx, template.boardId, "task.delete");

    await ctx.db.delete(args.id);

    return args.id;
  },
});
