import { query } from "./_generated/server";
import { v } from "convex/values";

async function getAnalyticsAccess(ctx, boardId) {
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
    return { user, board };
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

  if (!role || !role.permissions.includes("analytics.view")) {
    throw new Error("Missing permission: analytics.view");
  }

  return { user, board };
}

export const getProjectAnalytics = query({
  args: {
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
    const { board } = await getAnalyticsAccess(ctx, args.boardId);

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

    const assigneeCounts = new Map();

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
    };
  },
});
