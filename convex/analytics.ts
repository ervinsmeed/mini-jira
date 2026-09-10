import { ConvexError } from "convex/values";
import { getTaskPermissionAccess } from "./lib/taskAccess";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getProjectAnalytics = query({
  args: {
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
    const { board } = await getTaskPermissionAccess(
      ctx,
      args.boardId,
      "analytics.view",
    );

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const doneColumnIds = new Set(
      columns
        .filter((column) => {
          const name = column.name.trim().toLowerCase();

          return name === "done" || name === "готово";
        })
        .map((column) => column._id),
    );

    const total = tasks.length;

    const completed = tasks.filter((task) =>
      doneColumnIds.has(task.columnId),
    ).length;

    const active = total - completed;

    const overdue = tasks.filter(
      (task) =>
        task.deadline !== undefined &&
        task.deadline < Date.now() &&
        !doneColumnIds.has(task.columnId),
    ).length;

    const byStatus = columns.map((column) => ({
      columnId: column._id,
      name: column.name,
      count: tasks.filter((task) => task.columnId === column._id).length,
    }));

    const assigneeCounts = new Map<Id<"users"> | "unassigned", number>();

    for (const task of tasks) {
      const key = task.assigneeId ?? "unassigned";

      assigneeCounts.set(key, (assigneeCounts.get(key) ?? 0) + 1);
    }

    const byAssignee = [];

    for (const [assigneeId, count] of assigneeCounts.entries()) {
      if (assigneeId === "unassigned") {
        byAssignee.push({
          assigneeId: null,
          name: "Unassigned",
          count,
        });

        continue;
      }

      const assignee = await ctx.db.get("users", assigneeId);

      byAssignee.push({
        assigneeId,
        name: assignee?.name ?? assignee?.email ?? "Unknown user",
        count,
      });
    }

    const byPriority = [
      {
        priority: "high",
        name: "High",
        count: tasks.filter((task) => task.priority === "high").length,
      },
      {
        priority: "medium",
        name: "Medium",
        count: tasks.filter(
          (task) => !task.priority || task.priority === "medium",
        ).length,
      },
      {
        priority: "low",
        name: "Low",
        count: tasks.filter((task) => task.priority === "low").length,
      },
    ];

    return {
      project: {
        boardId: board._id,
        name: board.name,
        taskCount: total,
      },

      total,
      completed,
      active,
      overdue,
      byStatus,
      byAssignee,
      byPriority,
    };
  },
});

export const getWorkspaceAnalytics = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    const result = [];
    for (const board of boards) {
      try {
        await getTaskPermissionAccess(ctx, board._id, "project.view");
        await getTaskPermissionAccess(ctx, board._id, "analytics.view");
      } catch (error) {
        if (error instanceof ConvexError) continue;
        throw error;
      }
      const tasks = await ctx.db
        .query("tasks")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      result.push({
        boardId: board._id,
        name: board.name,
        count: tasks.length,
      });
    }
    return result;
  },
});
