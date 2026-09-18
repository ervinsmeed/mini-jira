import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

const DEFAULT_COLUMNS = [
  { name: "Backlog", color: "#64748b" },
  { name: "To Do", color: "#22d3ee" },
  { name: "In Progress", color: "#8b5cf6" },
  { name: "Review", color: "#f59e0b" },
  { name: "Testing", color: "#3b82f6" },
  { name: "Done", color: "#22c55e" },
];

export async function insertDefaultColumns(
  ctx: MutationCtx,
  boardId: Id<"boards">,
  userId: Id<"users">,
) {
  const createdAt = Date.now();
  for (const [order, column] of DEFAULT_COLUMNS.entries()) {
    await ctx.db.insert("columns", { ...column, boardId, userId, order, createdAt });
  }
}
