import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

// Internal helpers: callers must authorize the root operation before deleting.
export async function detachEpic(ctx: MutationCtx, epic: Doc<"tasks">) {
  const children = await ctx.db
    .query("tasks")
    .withIndex("by_board_epic", (q) =>
      q.eq("boardId", epic.boardId).eq("epicId", epic._id),
    )
    .collect();
  for (const child of children) {
    if (child.epicId === epic._id) {
      await ctx.db.patch("tasks", child._id, {
        epicId: undefined,
        updatedAt: Date.now(),
      });
    }
  }
}

export async function deleteTask(
  ctx: MutationCtx,
  task: Doc<"tasks">,
  detach = true,
) {
  if (detach) await detachEpic(ctx, task);
  const comments = await ctx.db
    .query("comments")
    .withIndex("by_task", (q) => q.eq("taskId", task._id))
    .collect();
  const logs = await ctx.db
    .query("activityLogs")
    .withIndex("by_task", (q) => q.eq("taskId", task._id))
    .collect();
  const favorites = await ctx.db
    .query("favorites")
    .withIndex("by_task", (q) => q.eq("taskId", task._id))
    .collect();
  const recent = await ctx.db
    .query("recentTasks")
    .withIndex("by_task", (q) => q.eq("taskId", task._id))
    .collect();
  for (const row of [...comments, ...logs, ...favorites, ...recent])
    await ctx.db.delete(row._id);
  await ctx.db.delete("tasks", task._id);
}

export async function deleteBoard(ctx: MutationCtx, boardId: Id<"boards">) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_board", (q) => q.eq("boardId", boardId))
    .collect();
  for (const task of tasks) await deleteTask(ctx, task, false);
  const columns = await ctx.db
    .query("columns")
    .withIndex("by_board", (q) => q.eq("boardId", boardId))
    .collect();
  const members = await ctx.db
    .query("boardMembers")
    .withIndex("by_board", (q) => q.eq("boardId", boardId))
    .collect();
  const templates = await ctx.db
    .query("taskTemplates")
    .withIndex("by_board", (q) => q.eq("boardId", boardId))
    .collect();
  const favorites = await ctx.db
    .query("favorites")
    .withIndex("by_board", (q) => q.eq("boardId", boardId))
    .collect();
  const recent = await ctx.db
    .query("recentTasks")
    .withIndex("by_board", (q) => q.eq("boardId", boardId))
    .collect();
  const logs = await ctx.db
    .query("activityLogs")
    .withIndex("by_board", (q) => q.eq("boardId", boardId))
    .collect();
  for (const row of [
    ...columns,
    ...members,
    ...templates,
    ...favorites,
    ...recent,
    ...logs,
  ])
    await ctx.db.delete(row._id);
  await ctx.db.delete("boards", boardId);
}
