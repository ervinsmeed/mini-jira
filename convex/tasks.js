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

async function validateEpic(ctx, boardId, epicId) {
  if (!epicId) {
    return;
  }

  const epic = await ctx.db.get("tasks", epicId);

  if (!epic || epic.boardId !== boardId || epic.taskType !== "epic") {
    throw new Error("Epic not found");
  }
}

async function addActivityLog(
  ctx,
  { boardId, taskId, userId, action, details },
) {
  await ctx.db.insert("activityLogs", {
    boardId,
    taskId,
    userId,
    action,
    details,
    createdAt: Date.now(),
  });
}

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    columnId: v.id("columns"),
    priority: v.optional(v.string()),
    assigneeId: v.optional(v.union(v.id("users"), v.null())),

    taskType: v.optional(v.union(v.literal("epic"), v.literal("task"))),

    epicId: v.optional(v.id("tasks")),

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
    if (args.taskType === "epic" && args.epicId) {
      throw new Error("Epic cannot belong to another epic");
    }

    await validateEpic(ctx, args.boardId, args.epicId);

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
      taskType: args.taskType ?? "task",
      epicId: args.taskType === "epic" ? undefined : args.epicId,
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
    await addActivityLog(ctx, {
      boardId: args.boardId,
      taskId,
      userId: user._id,
      action: "task.created",
      details: `Created task "${args.title}"`,
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

    taskType: v.optional(v.union(v.literal("epic"), v.literal("task"))),

    epicId: v.optional(v.union(v.id("tasks"), v.null())),

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

    const { user, board } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    await validateAssignee(ctx, board, args.assigneeId);

    const nextTaskType = args.taskType ?? task.taskType ?? "task";

    if (args.epicId === args.id) {
      throw new Error("Task cannot use itself as an epic");
    }

    if (
      nextTaskType === "epic" &&
      args.epicId !== undefined &&
      args.epicId !== null
    ) {
      throw new Error("Epic cannot belong to another epic");
    }

    if (
      nextTaskType !== "epic" &&
      args.epicId !== undefined &&
      args.epicId !== null
    ) {
      await validateEpic(ctx, task.boardId, args.epicId);
    }

    const updates = {};

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    if (args.assigneeId !== undefined) {
      updates.assigneeId = args.assigneeId ?? undefined;
    }

    if (args.taskType !== undefined) {
      updates.taskType = args.taskType;

      if (args.taskType === "epic") {
        updates.epicId = undefined;
      }
    }

    if (args.epicId !== undefined) {
      updates.epicId = args.epicId ?? undefined;
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
    if (
      args.assigneeId !== undefined &&
      (args.assigneeId ?? undefined) !== task.assigneeId
    ) {
      await addActivityLog(ctx, {
        boardId: task.boardId,
        taskId: task._id,
        userId: user._id,
        action: "task.assignee_changed",
        details: "Assignee changed",
      });
    }

    if (
      args.storyPoints !== undefined &&
      args.storyPoints !== task.storyPoints
    ) {
      await addActivityLog(ctx, {
        boardId: task.boardId,
        taskId: task._id,
        userId: user._id,
        action: "task.story_points_changed",
        details: `Story Points changed from ${task.storyPoints ?? "none"} to ${args.storyPoints}`,
      });
    }

    if (args.deadline !== undefined && args.deadline !== task.deadline) {
      await addActivityLog(ctx, {
        boardId: task.boardId,
        taskId: task._id,
        userId: user._id,
        action: "task.deadline_changed",
        details: "Deadline changed",
      });
    }

    if (args.columnId !== undefined && args.columnId !== task.columnId) {
      const oldColumn = await ctx.db.get("columns", task.columnId);
      const newColumn = await ctx.db.get("columns", args.columnId);

      await addActivityLog(ctx, {
        boardId: task.boardId,
        taskId: task._id,
        userId: user._id,
        action: "task.status_changed",
        details: `Status changed from "${oldColumn?.name ?? "Unknown"}" to "${newColumn?.name ?? "Unknown"}"`,
      });
    }

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

    const { user } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    const newColumn = await ctx.db.get("columns", args.newColumnId);

    if (!newColumn || newColumn.boardId !== task.boardId) {
      throw new Error("Column not found");
    }
    await ctx.db.patch("tasks", args.taskId, {
      columnId: args.newColumnId,
      order: args.newOrder,
      updatedAt: Date.now(),
    });
    if (args.newColumnId !== task.columnId) {
      const oldColumn = await ctx.db.get("columns", task.columnId);

      await addActivityLog(ctx, {
        boardId: task.boardId,
        taskId: task._id,
        userId: user._id,
        action: "task.status_changed",
        details: `Status changed from "${oldColumn?.name ?? "Unknown"}" to "${newColumn.name}"`,
      });
    }

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

    if (task.taskType === "epic") {
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_board", (q) => q.eq("boardId", task.boardId))
        .collect();

      for (const childTask of tasks) {
        if (childTask.epicId === task._id) {
          await ctx.db.patch("tasks", childTask._id, {
            epicId: undefined,
            updatedAt: Date.now(),
          });
        }
      }
    }
  },
});
export const startTimer = mutation({
  args: {
    id: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    const { user } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    if (task.timerStatus === "running") {
      return task;
    }

    await ctx.db.patch("tasks", args.id, {
      timerStatus: "running",
      timerStartedAt: Date.now(),
      timerElapsedMs:
        task.timerStatus === "stopped" ? 0 : (task.timerElapsedMs ?? 0),
      updatedAt: Date.now(),
    });

    await addActivityLog(ctx, {
      boardId: task.boardId,
      taskId: task._id,
      userId: user._id,
      action: "task.timer_started",
      details: "Timer started",
    });

    return await ctx.db.get("tasks", args.id);
  },
});

export const pauseTimer = mutation({
  args: {
    id: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    const { user } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    if (task.timerStatus !== "running" || task.timerStartedAt === undefined) {
      return task;
    }

    const elapsed =
      (task.timerElapsedMs ?? 0) + (Date.now() - task.timerStartedAt);

    await ctx.db.patch("tasks", args.id, {
      timerStatus: "paused",
      timerStartedAt: undefined,
      timerElapsedMs: elapsed,
      updatedAt: Date.now(),
    });
    await addActivityLog(ctx, {
      boardId: task.boardId,
      taskId: task._id,
      userId: user._id,
      action: "task.timer_paused",
      details: "Timer paused",
    });

    return await ctx.db.get("tasks", args.id);
  },
});

export const stopTimer = mutation({
  args: {
    id: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.id);

    if (!task) {
      throw new Error("Task not found");
    }

    const { user } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    let elapsed = task.timerElapsedMs ?? 0;

    if (task.timerStatus === "running" && task.timerStartedAt !== undefined) {
      elapsed += Date.now() - task.timerStartedAt;
    }

    await ctx.db.patch("tasks", args.id, {
      timerStatus: "stopped",
      timerStartedAt: undefined,
      timerElapsedMs: elapsed,
      updatedAt: Date.now(),
    });

    await addActivityLog(ctx, {
      boardId: task.boardId,
      taskId: task._id,
      userId: user._id,
      action: "task.timer_stopped",
      details: "Timer stopped",
    });

    return await ctx.db.get("tasks", args.id);
  },
});
export const listActivity = query({
  args: {
    taskId: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    await getTaskPermissionAccess(ctx, task.boardId, "task.view");

    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const result = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get("users", log.userId);

        return {
          ...log,
          userName: user?.name ?? user?.email ?? "Unknown user",
        };
      }),
    );

    return result.sort((a, b) => b.createdAt - a.createdAt);
  },
});
export const addComment = mutation({
  args: {
    taskId: v.id("tasks"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    if (!args.text.trim()) {
      throw new Error("Comment cannot be empty");
    }

    const { user } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    const commentId = await ctx.db.insert("comments", {
      taskId: task._id,
      boardId: task.boardId,
      userId: user._id,
      text: args.text.trim(),
      createdAt: Date.now(),
    });

    await addActivityLog(ctx, {
      boardId: task.boardId,
      taskId: task._id,
      userId: user._id,
      action: "task.comment_added",
      details: "Comment added",
    });

    return await ctx.db.get("comments", commentId);
  },
});
export const listComments = query({
  args: {
    taskId: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    await getTaskPermissionAccess(ctx, task.boardId, "task.view");

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const result = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get("users", comment.userId);

        return {
          ...comment,
          userName: user?.name ?? user?.email ?? "Unknown user",
        };
      }),
    );

    return result.sort((a, b) => a.createdAt - b.createdAt);
  },
});
export const bulkUpdate = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    columnId: v.optional(v.id("columns")),
    assigneeId: v.optional(v.union(v.id("users"), v.null())),
    priority: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const updatedTasks = [];

    for (const taskId of args.taskIds) {
      const task = await ctx.db.get("tasks", taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      const { user, board } = await getTaskPermissionAccess(
        ctx,
        task.boardId,
        "task.update",
      );

      if (args.assigneeId !== undefined) {
        await validateAssignee(ctx, board, args.assigneeId);
      }

      let newColumn = null;

      if (args.columnId !== undefined) {
        newColumn = await ctx.db.get("columns", args.columnId);

        if (!newColumn || newColumn.boardId !== task.boardId) {
          throw new Error("Column not found");
        }
      }

      const updates = {
        updatedAt: Date.now(),
      };

      const changes = [];

      if (args.columnId !== undefined && args.columnId !== task.columnId) {
        const oldColumn = await ctx.db.get("columns", task.columnId);

        updates.columnId = args.columnId;

        changes.push(
          `Status changed from "${oldColumn?.name ?? "Unknown"}" to "${
            newColumn?.name ?? "Unknown"
          }"`,
        );
      }

      if (
        args.assigneeId !== undefined &&
        args.assigneeId !== task.assigneeId
      ) {
        updates.assigneeId = args.assigneeId ?? undefined;
        changes.push("Assignee changed");
      }

      if (args.priority !== undefined && args.priority !== task.priority) {
        updates.priority = args.priority;
        changes.push(
          `Priority changed from "${task.priority ?? "none"}" to "${
            args.priority
          }"`,
        );
      }

      await ctx.db.patch("tasks", taskId, updates);

      if (changes.length > 0) {
        await addActivityLog(ctx, {
          boardId: task.boardId,
          taskId: task._id,
          userId: user._id,
          action: "task.bulk_updated",
          details: changes.join("; "),
        });
      }

      updatedTasks.push(await ctx.db.get("tasks", taskId));
    }

    return updatedTasks;
  },
});

export const bulkRemove = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
  },

  handler: async (ctx, args) => {
    const tasksToDelete = [];

    for (const taskId of args.taskIds) {
      const task = await ctx.db.get("tasks", taskId);

      if (!task) {
        throw new Error("Task not found");
      }

      await getTaskPermissionAccess(ctx, task.boardId, "task.delete");

      tasksToDelete.push(task);
    }

    for (const task of tasksToDelete) {
      await ctx.db.delete("tasks", task._id);
    }

    for (const task of tasksToDelete) {
      if (task.taskType !== "epic") {
        continue;
      }

      const remainingTasks = await ctx.db
        .query("tasks")
        .withIndex("by_board", (q) => q.eq("boardId", task.boardId))
        .collect();

      for (const childTask of remainingTasks) {
        if (childTask.epicId === task._id) {
          await ctx.db.patch("tasks", childTask._id, {
            epicId: undefined,
            updatedAt: Date.now(),
          });
        }
      }
    }

    return {
      deletedCount: tasksToDelete.length,
    };
  },
});
