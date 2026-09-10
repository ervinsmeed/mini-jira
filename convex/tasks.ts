import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { applyTaskChanges } from "./lib/taskChanges";
import { deleteTask, detachEpic } from "./lib/cascade";
import { getTaskPermissionAccess } from "./lib/taskAccess";
export {
  page,
  get,
  epics,
  commentsPage,
  activityPage,
  templatesPage,
} from "./lib/taskQueries";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
async function validateAssignee(
  ctx: QueryCtx | MutationCtx,
  board: Doc<"boards">,
  assigneeId?: Id<"users"> | null,
) {
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
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }
}

async function validateEpic(
  ctx: QueryCtx | MutationCtx,
  boardId: Id<"boards">,
  epicId?: Id<"tasks"> | null,
) {
  if (!epicId) {
    return;
  }

  const epic = await ctx.db.get("tasks", epicId);

  if (!epic || epic.boardId !== boardId || epic.taskType !== "epic") {
    throw new ConvexError({ code: "NOT_FOUND" });
  }
}

async function addActivityLog(
  ctx: MutationCtx,
  {
    boardId,
    taskId,
    userId,
    action,
    details,
  }: Omit<Doc<"activityLogs">, "_id" | "_creationTime" | "createdAt">,
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
      throw new ConvexError({ code: "VALIDATION_FAILED" });
    }

    await validateEpic(ctx, args.boardId, args.epicId);

    const column = await ctx.db.get("columns", args.columnId);

    if (!column || column.boardId !== args.boardId) {
      throw new ConvexError({ code: "NOT_FOUND" });
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
      assigneeId: args.assigneeId ?? undefined,
      taskType: args.taskType ?? "task",
      timerStatus: "stopped",
      timerElapsedMs: 0,
      timerSessionElapsedMs: 0,
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
    const priorityOrder: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    if (args.boardId) {
      await getTaskPermissionAccess(ctx, args.boardId, "task.view");

      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_board", (q) => q.eq("boardId", args.boardId!))
        .collect();

      const sortedTasks = tasks.sort((a, b) => {
        const aPriority = priorityOrder[a.priority || "medium"];
        const bPriority = priorityOrder[b.priority || "medium"];

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        return a.order - b.order;
      });
      const userIds = [
        ...new Set(
          tasks
            .flatMap((task) => [task.userId, task.assigneeId])
            .filter((value) => value !== undefined && value !== null),
        ),
      ];
      const users = await Promise.all(
        userIds.map((id) => ctx.db.get("users", id)),
      );
      const searchUsers = new Map(
        users
          .filter((value) => value !== undefined && value !== null)
          .map((user) => [user._id, `${user.name} ${user.email}`]),
      );
      return sortedTasks.map((task) => ({
        ...task,
        searchUserText: [
          searchUsers.get(task.userId),
          task.assigneeId ? searchUsers.get(task.assigneeId) : undefined,
        ]
          .filter((value) => value !== undefined && value !== null)
          .join(" "),
      }));
    }

    if (args.columnId) {
      const column = await ctx.db.get("columns", args.columnId);

      if (!column) {
        return [];
      }

      await getTaskPermissionAccess(ctx, column.boardId, "task.view");

      const tasks = await ctx.db
        .query("tasks")
        .filter((q) =>
          q.and(
            q.eq(q.field("columnId"), args.columnId),
            q.eq(q.field("boardId"), column.boardId),
          ),
        )
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

export const listPaginated = query({
  args: {
    boardId: v.id("boards"),
    paginationOpts: paginationOptsValidator,
  },

  handler: async (ctx, args) => {
    await getTaskPermissionAccess(ctx, args.boardId, "task.view");

    return await ctx.db
      .query("tasks")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .paginate(args.paginationOpts);
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

    deadline: v.optional(v.union(v.number(), v.null())),

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
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const { user, board } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    await validateAssignee(ctx, board, args.assigneeId);

    const nextTaskType = args.taskType ?? task.taskType ?? "task";

    if (args.epicId === args.id) {
      throw new ConvexError({ code: "VALIDATION_FAILED" });
    }

    if (
      nextTaskType === "epic" &&
      args.epicId !== undefined &&
      args.epicId !== null
    ) {
      throw new ConvexError({ code: "VALIDATION_FAILED" });
    }

    if (
      nextTaskType !== "epic" &&
      args.epicId !== undefined &&
      args.epicId !== null
    ) {
      await validateEpic(ctx, task.boardId, args.epicId);
    }

    if (task.taskType === "epic" && args.taskType === "task")
      await detachEpic(ctx, task);

    const updates: Partial<Doc<"tasks">> = {};

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
      updates.deadline = args.deadline ?? undefined;
    }

    if (args.columnId !== undefined) {
      const column = await ctx.db.get("columns", args.columnId);

      if (!column) {
        throw new ConvexError({ code: "NOT_FOUND" });
      }

      if (column.boardId !== task.boardId) {
        throw new ConvexError({ code: "VALIDATION_FAILED" });
      }

      updates.columnId = args.columnId;
    }

    if (args.order !== undefined) {
      updates.order = args.order;
    }

    if (args.subtasks !== undefined) {
      updates.subtasks = args.subtasks;
    }

    await applyTaskChanges(ctx, task, updates, user._id);

    return await ctx.db.get("tasks", args.id);
  },
});

export const updateOrder = mutation({
  args: {
    taskId: v.id("tasks"),
    newColumnId: v.id("columns"),
    newOrder: v.number(),
    beforeTaskId: v.optional(v.id("tasks")),
    append: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.taskId);

    if (!task) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const { user } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    const newColumn = await ctx.db.get("columns", args.newColumnId);

    if (!newColumn || newColumn.boardId !== task.boardId) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    let order = args.newOrder;
    if (args.beforeTaskId) {
      const target = await ctx.db.get("tasks", args.beforeTaskId);
      if (
        !target ||
        target.boardId !== task.boardId ||
        target.columnId !== args.newColumnId
      )
        throw new ConvexError({ code: "NOT_FOUND" });
      const previous = await ctx.db
        .query("tasks")
        .withIndex("by_board_column_order", (q) =>
          q
            .eq("boardId", task.boardId)
            .eq("columnId", args.newColumnId)
            .lt("order", target.order),
        )
        .order("desc")
        .filter((q) => q.neq(q.field("_id"), task._id))
        .first();
      order = previous ? (previous.order + target.order) / 2 : target.order - 1;
    } else if (args.append) {
      const last = await ctx.db
        .query("tasks")
        .withIndex("by_board_column_order", (q) =>
          q.eq("boardId", task.boardId).eq("columnId", args.newColumnId),
        )
        .order("desc")
        .first();
      order = (last?.order ?? -1) + 1;
    }
    await applyTaskChanges(
      ctx,
      task,
      { columnId: args.newColumnId, order },
      user._id,
    );

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
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    await getTaskPermissionAccess(ctx, task.boardId, "task.delete");

    await deleteTask(ctx, task);

    return {
      deletedTaskId: args.id,
    };
  },
});
export const startTimer = mutation({
  args: {
    id: v.id("tasks"),
  },

  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.id);

    if (!task) {
      throw new ConvexError({ code: "NOT_FOUND" });
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
      timerElapsedMs: task.timerElapsedMs ?? 0,
      timerSessionElapsedMs:
        task.timerStatus === "paused" ? task.timerSessionElapsedMs : 0,
      updatedAt: Date.now(),
    });

    await addActivityLog(ctx, {
      boardId: task.boardId,
      taskId: task._id,
      userId: user._id,
      action: "task.timer_started",
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
      throw new ConvexError({ code: "NOT_FOUND" });
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
      timerSessionElapsedMs:
        task.timerSessionElapsedMs === undefined
          ? undefined
          : task.timerSessionElapsedMs +
            (task.timerStatus === "running" && task.timerStartedAt !== undefined
              ? Date.now() - task.timerStartedAt
              : 0),
      updatedAt: Date.now(),
    });
    await addActivityLog(ctx, {
      boardId: task.boardId,
      taskId: task._id,
      userId: user._id,
      action: "task.timer_paused",
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
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const { user } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    if (task.timerStatus === "stopped") return task;
    let elapsed = task.timerElapsedMs ?? 0;

    if (task.timerStatus === "running" && task.timerStartedAt !== undefined) {
      elapsed += Date.now() - task.timerStartedAt;
    }

    await ctx.db.patch("tasks", args.id, {
      timerStatus: "stopped",
      timerStartedAt: undefined,
      timerElapsedMs: elapsed,
      timerSessionElapsedMs:
        task.timerSessionElapsedMs === undefined
          ? undefined
          : task.timerSessionElapsedMs +
            (task.timerStatus === "running" && task.timerStartedAt !== undefined
              ? Date.now() - task.timerStartedAt
              : 0),
      updatedAt: Date.now(),
    });

    await addActivityLog(ctx, {
      boardId: task.boardId,
      taskId: task._id,
      userId: user._id,
      action: "task.timer_stopped",
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
      throw new ConvexError({ code: "NOT_FOUND" });
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
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    if (!args.text.trim()) {
      throw new ConvexError({ code: "VALIDATION_FAILED" });
    }

    const { user } = await getTaskPermissionAccess(
      ctx,
      task.boardId,
      "task.update",
    );

    await ctx.db.patch("tasks", task._id, { updatedAt: Date.now() });
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
      throw new ConvexError({ code: "NOT_FOUND" });
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
        throw new ConvexError({ code: "NOT_FOUND" });
      }

      const { user, board } = await getTaskPermissionAccess(
        ctx,
        task.boardId,
        "task.update",
      );

      if (args.assigneeId !== undefined) {
        await validateAssignee(ctx, board, args.assigneeId);
      }

      if (args.columnId !== undefined) {
        const newColumn = await ctx.db.get("columns", args.columnId);

        if (!newColumn || newColumn.boardId !== task.boardId) {
          throw new ConvexError({ code: "NOT_FOUND" });
        }
      }

      const updates: Partial<Doc<"tasks">> = {};
      if (args.columnId !== undefined) updates.columnId = args.columnId;
      if (args.assigneeId !== undefined)
        updates.assigneeId = args.assigneeId ?? undefined;
      if (args.priority !== undefined) updates.priority = args.priority;
      await applyTaskChanges(ctx, task, updates, user._id);

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
    const uniqueTaskIds = [...new Set(args.taskIds)];
    const tasksToDelete = [];

    for (const taskId of uniqueTaskIds) {
      const task = await ctx.db.get("tasks", taskId);

      if (!task) {
        throw new ConvexError({ code: "NOT_FOUND" });
      }

      await getTaskPermissionAccess(ctx, task.boardId, "task.delete");

      tasksToDelete.push(task);
    }

    for (const task of tasksToDelete) await deleteTask(ctx, task);

    return {
      deletedCount: tasksToDelete.length,
    };
  },
});
