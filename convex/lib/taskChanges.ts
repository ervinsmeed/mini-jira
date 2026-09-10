import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

function historyValue(value: unknown): string | number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return JSON.stringify(value);
}

type TaskPatch = Partial<Omit<Doc<"tasks">, "_id" | "_creationTime">>;
const fields = [
  "title",
  "description",
  "subtasks",
  "columnId",
  "assigneeId",
  "deadline",
  "storyPoints",
  "priority",
  "taskType",
  "epicId",
] as const;
export async function applyTaskChanges(
  ctx: MutationCtx,
  task: Doc<"tasks">,
  patch: TaskPatch,
  userId: Doc<"users">["_id"],
) {
  const changed = Object.keys(patch).some((key) => {
    const field = key as keyof TaskPatch;
    return (
      field !== "updatedAt" &&
      JSON.stringify(task[field]) !== JSON.stringify(patch[field])
    );
  });
  if (!changed) return;
  const changes = [];
  for (const field of fields) {
    if (
      !(field in patch) ||
      JSON.stringify(task[field]) === JSON.stringify(patch[field])
    )
      continue;
    let before: string | number | null = historyValue(task[field]);
    let after: string | number | null = historyValue(patch[field]);
    if (field === "columnId") {
      before = task.columnId
        ? ((await ctx.db.get("columns", task.columnId))?.name ?? task.columnId)
        : null;
      after = patch.columnId
        ? ((await ctx.db.get("columns", patch.columnId))?.name ??
          patch.columnId)
        : null;
    }
    if (field === "assigneeId") {
      before = task.assigneeId
        ? ((await ctx.db.get("users", task.assigneeId))?.name ??
          task.assigneeId)
        : null;
      after = patch.assigneeId
        ? ((await ctx.db.get("users", patch.assigneeId))?.name ??
          patch.assigneeId)
        : null;
    }
    changes.push({ field, before, after });
  }
  await ctx.db.patch("tasks", task._id, { ...patch, updatedAt: Date.now() });
  if (changes.length)
    await ctx.db.insert("activityLogs", {
      boardId: task.boardId,
      taskId: task._id,
      userId,
      action: "task.updated",
      changes,
      createdAt: Date.now(),
    });
}
