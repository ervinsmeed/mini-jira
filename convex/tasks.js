import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    columnId: v.id("columns"),
    priority: v.optional(v.string()),

    storyPoints: v.optional(
      v.union(
        v.literal(1),
        v.literal(2),
        v.literal(3),
        v.literal(5),
        v.literal(8),
        v.literal(13),
        v.literal(21),
      ),
    ),

    deadline: v.optional(v.number()),

    subtasks: v.optional(
      v.array(
        v.object({
          text: v.string(),
          completed: v.boolean(),
        }),
      ),
    ),

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

    const board = await ctx.db.get("boards", args.boardId);

    if (!board || board.userId !== user._id) {
      throw new Error("Board not found");
    }

    const column = await ctx.db.get("columns", args.columnId);

    if (
      !column ||
      column.boardId !== args.boardId ||
      column.userId !== user._id
    ) {
      throw new Error("Column not found");
    }

    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("columnId"), args.columnId))
      .collect();

    const maxOrder = Math.max(...tasks.map((task) => task.order), -1);

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      priority: args.priority || "medium",
      storyPoints: args.storyPoints,
      deadline: args.deadline,
      subtasks: args.subtasks || [],
      columnId: args.columnId,
      order: maxOrder + 1,
      boardId: args.boardId,
      userId: user._id,
      createdAt: Date.now(),
    });

    return await ctx.db.get("tasks", taskId);
  },
});

export const list = query({
  args: {
    boardId: v.optional(v.id("boards")),
    columnId: v.optional(v.id("columns")),
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

    const priorityOrder = {
      high: 0,
      medium: 1,
      low: 2,
    };

    if (args.boardId) {
      const board = await ctx.db.get("boards", args.boardId);

      if (!board || board.userId !== user._id) {
        return [];
      }

      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
        .collect();

      return tasks.sort((a, b) => {
        const aPriority = priorityOrder[a.priority || "medium"];
        const bPriority = priorityOrder[b.priority || "medium"];

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        return a.order - b.order;
      });
    }

    if (args.columnId) {
      const column = await ctx.db.get("columns", args.columnId);

      if (!column || column.userId !== user._id) {
        return [];
      }

      const tasks = await ctx.db
        .query("tasks")
        .filter((q) => q.eq(q.field("columnId"), args.columnId))
        .collect();

      return tasks.sort((a, b) => {
        const aPriority = priorityOrder[a.priority || "medium"];
        const bPriority = priorityOrder[b.priority || "medium"];

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        return a.order - b.order;
      });
    }

    return [];
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),

    storyPoints: v.optional(
      v.union(
        v.literal(1),
        v.literal(2),
        v.literal(3),
        v.literal(5),
        v.literal(8),
        v.literal(13),
        v.literal(21),
      ),
    ),

    deadline: v.optional(v.number()),

    columnId: v.optional(v.id("columns")),
    order: v.optional(v.number()),

    subtasks: v.optional(
      v.array(
        v.object({
          text: v.string(),
          completed: v.boolean(),
        }),
      ),
    ),
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

    const task = await ctx.db.get("tasks", args.id);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    const updates = {};

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.priority !== undefined) {
      updates.priority = args.priority;
    }

    if (args.storyPoints !== undefined) {
      updates.storyPoints = args.storyPoints;
    }

    if (args.deadline !== undefined) {
      updates.deadline = args.deadline;
    }

    if (args.columnId !== undefined) {
      updates.columnId = args.columnId;
    }

    if (args.order !== undefined) {
      updates.order = args.order;
    }

    if (args.subtasks !== undefined) {
      updates.subtasks = args.subtasks;
    }

    await ctx.db.patch("tasks", args.id, updates);

    return await ctx.db.get("tasks", args.id);
  },
});

export const updateOrder = mutation({
  args: {
    taskId: v.id("tasks"),
    newColumnId: v.id("columns"),
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

    const task = await ctx.db.get("tasks", args.taskId);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    const newColumn = await ctx.db.get("columns", args.newColumnId);

    if (
      !newColumn ||
      newColumn.userId !== user._id ||
      newColumn.boardId !== task.boardId
    ) {
      throw new Error("Column not found");
    }

    await ctx.db.patch("tasks", args.taskId, {
      columnId: args.newColumnId,
      order: args.newOrder,
    });

    return await ctx.db.get("tasks", args.taskId);
  },
});

export const remove = mutation({
  args: {
    id: v.id("tasks"),
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

    const task = await ctx.db.get("tasks", args.id);

    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    await ctx.db.delete("tasks", args.id);
  },
});
