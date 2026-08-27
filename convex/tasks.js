import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
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
      isOwner: true,
      currentRole: null,
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

  const currentRole = await ctx.db.get("roles", membership.roleId);

  if (!currentRole || currentRole.workspaceId !== board.workspaceId) {
    throw new Error("Access denied");
  }

  if (!currentRole.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }

  const workspace = await ctx.db.get("workspaces", board.workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  return {
    user,
    board,
    workspace,
    isOwner: false,
    currentRole,
  };
}
async function validateAssignee(ctx, board, assigneeId) {
  if (!assigneeId) {
    return;
  }

  if (assigneeId === board.userId) {
    return;
  }

  const membership = await ctx.db
    .query("boardMembers")
    .withIndex("by_board_user", (q) =>
      q.eq("boardId", board._id).eq("userId", assigneeId),
    )
    .unique();

  if (!membership) {
    throw new Error("Assignee must be a project member");
  }
}

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    columnId: v.id("columns"),
    priority: v.optional(v.string()),
    assigneeId: v.optional(v.union(v.id("users"), v.null())),

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
    const { user, board } = await getTaskPermissionAccess(
      ctx,
      args.boardId,
      "task.create",
    );
    await validateAssignee(ctx, board, args.assigneeId);

    const column = await ctx.db.get("columns", args.columnId);

    if (!column || column.boardId !== args.boardId) {
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
      assigneeId: args.assigneeId,
      storyPoints: args.storyPoints,
      deadline: args.deadline,
      subtasks: args.subtasks || [],
      columnId: args.columnId,
      order: maxOrder + 1,
      boardId: args.boardId,
      userId: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
    const priorityOrder = {
      high: 0,
      medium: 1,
      low: 2,
    };

    if (args.boardId) {
      await getTaskPermissionAccess(ctx, args.boardId, "task.view");

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

      if (!column) {
        return [];
      }

      await getTaskPermissionAccess(ctx, column.boardId, "task.view");

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
    assigneeId: v.optional(v.union(v.id("users"), v.null())),

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
    const task = await ctx.db.get("tasks", args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    const { board } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    await validateAssignee(ctx, board, args.assigneeId);

    const updates = {};

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    if (args.assigneeId !== undefined) {
      updates.assigneeId = args.assigneeId ?? undefined;
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

    updates.updatedAt = Date.now();

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
    const task = await ctx.db.get("tasks", args.taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    await getTaskPermissionAccess(ctx, task.boardId, "task.update");

    const newColumn = await ctx.db.get("columns", args.newColumnId);

    if (!newColumn || newColumn.boardId !== task.boardId) {
      throw new Error("Column not found");
    }
    await ctx.db.patch("tasks", args.taskId, {
      columnId: args.newColumnId,
      order: args.newOrder,
      updatedAt: Date.now(),
    });

    return await ctx.db.get("tasks", args.taskId);
  },
});

export const remove = mutation({
  args: {
    id: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    await getTaskPermissionAccess(ctx, task.boardId, "task.delete");

    await ctx.db.delete("tasks", args.id);
  },
});
