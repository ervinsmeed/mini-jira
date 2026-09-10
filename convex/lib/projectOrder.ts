import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getTaskPermissionAccess } from "./taskAccess";

export async function projectOrder(
  ctx: MutationCtx,
  board: Doc<"boards">,
  anchorId: Id<"boards">,
  after: boolean,
) {
  const { board: anchor } = await getTaskPermissionAccess(
    ctx,
    anchorId,
    "project.view",
  );
  if (
    anchor.workspaceId !== board.workspaceId ||
    (!board.workspaceId && anchor.userId !== board.userId)
  )
    throw new ConvexError({ code: "VALIDATION_FAILED" });
  const workspaceId = board.workspaceId;
  const neighbors = workspaceId
    ? ctx.db
        .query("boards")
        .withIndex("by_workspace_order", (q) =>
          after
            ? q.eq("workspaceId", workspaceId).gt("order", anchor.order)
            : q.eq("workspaceId", workspaceId).lt("order", anchor.order),
        )
    : ctx.db
        .query("boards")
        .withIndex("by_user_order", (q) =>
          after
            ? q.eq("userId", board.userId).gt("order", anchor.order)
            : q.eq("userId", board.userId).lt("order", anchor.order),
        );
  const neighbor = await neighbors
    .order(after ? "asc" : "desc")
    .filter((q) => q.neq(q.field("_id"), board._id))
    .first();
  return neighbor
    ? (anchor.order + neighbor.order) / 2
    : anchor.order + (after ? 1 : -1);
}
