import { ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import { getTaskPermissionAccess } from "./taskAccess";

function decodeCursor(value: string): { phase: number; cursor: string | null } {
  const parsed: unknown = JSON.parse(value);
  if (
    typeof parsed !== "object" ||
    !parsed ||
    !("phase" in parsed) ||
    !("cursor" in parsed) ||
    typeof parsed.phase !== "number" ||
    !Number.isInteger(parsed.phase) ||
    parsed.phase < 0 ||
    parsed.phase > 4 ||
    !(parsed.cursor === null || typeof parsed.cursor === "string")
  )
    throw new ConvexError({ code: "VALIDATION_FAILED" });
  return { phase: parsed.phase, cursor: parsed.cursor };
}

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const task = await ctx.db.get("tasks", id);
    if (!task) return null;
    await getTaskPermissionAccess(ctx, task.boardId, "task.view");
    const assignee = task.assigneeId
      ? await ctx.db.get("users", task.assigneeId)
      : null;
    return { ...task, assigneeName: assignee?.name ?? "" };
  },
});
export const commentsPage = query({
  args: { taskId: v.id("tasks"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) return { page: [], isDone: true, continueCursor: "" };
    await getTaskPermissionAccess(ctx, task.boardId, "task.view");
    const result = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (row) => ({
          ...row,
          userName: (await ctx.db.get("users", row.userId))?.name ?? "",
        })),
      ),
    };
  },
});
export const activityPage = query({
  args: { taskId: v.id("tasks"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const task = await ctx.db.get("tasks", args.taskId);
    if (!task) return { page: [], isDone: true, continueCursor: "" };
    await getTaskPermissionAccess(ctx, task.boardId, "task.view");
    const result = await ctx.db
      .query("activityLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (row) => ({
          ...row,
          userName: (await ctx.db.get("users", row.userId))?.name ?? "",
        })),
      ),
    };
  },
});
export const templatesPage = query({
  args: { boardId: v.id("boards"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await getTaskPermissionAccess(ctx, args.boardId, "task.view");
    return ctx.db
      .query("taskTemplates")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
  },
});
export const epics = query({
  args: { boardId: v.id("boards"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await getTaskPermissionAccess(ctx, args.boardId, "task.view");
    return ctx.db
      .query("tasks")
      .withIndex("by_board_type", (q) =>
        q.eq("boardId", args.boardId).eq("taskType", "epic"),
      )
      .paginate(args.paginationOpts);
  },
});

export const page = query({
  args: {
    boardId: v.id("boards"),
    paginationOpts: paginationOptsValidator,
    search: v.string(),
    sort: v.union(
      v.literal("manual"),
      v.literal("title"),
      v.literal("created"),
      v.literal("deadline"),
      v.literal("storyPoints"),
      v.literal("priority"),
    ),
    columnId: v.optional(v.id("columns")),
    assigneeId: v.optional(v.union(v.id("users"), v.null())),
    priority: v.optional(v.string()),
    storyPoints: v.optional(v.number()),
    deadline: v.union(
      v.literal("all"),
      v.literal("none"),
      v.literal("today"),
      v.literal("overdue"),
      v.literal("upcoming"),
    ),
    today: v.number(),
    tomorrow: v.number(),
  },
  handler: async (ctx, args) => {
    const { user: currentUser } = await getTaskPermissionAccess(
      ctx,
      args.boardId,
      "task.view",
    );
    let phase = 0;
    let cursor: string | null = null;
    if (args.paginationOpts.cursor) {
      const parsed = decodeCursor(args.paginationOpts.cursor);
      phase = parsed.phase;
      cursor = parsed.cursor;
    }
    const priorities = ["high", "medium", undefined, "low"];
    const base = ctx.db.query("tasks");
    let ordered =
      args.sort === "title"
        ? base
            .withIndex("by_board_title", (q) => q.eq("boardId", args.boardId))
            .order("asc")
        : args.sort === "created"
          ? base
              .withIndex("by_board_created", (q) =>
                q.eq("boardId", args.boardId),
              )
              .order("desc")
          : args.sort === "storyPoints"
            ? base
                .withIndex("by_board_sp", (q) => q.eq("boardId", args.boardId))
                .order("desc")
            : args.sort === "priority"
              ? phase === 4
                ? base
                    .withIndex("by_board_order", (q) =>
                      q.eq("boardId", args.boardId),
                    )
                    .filter((q) =>
                      q.and(
                        q.neq(q.field("priority"), "high"),
                        q.neq(q.field("priority"), "medium"),
                        q.neq(q.field("priority"), "low"),
                        q.neq(q.field("priority"), undefined),
                      ),
                    )
                    .order("asc")
                : base
                    .withIndex("by_board_priority", (q) =>
                      q
                        .eq("boardId", args.boardId)
                        .eq("priority", priorities[phase]),
                    )
                    .order("asc")
              : args.sort === "deadline"
                ? (phase === 0
                    ? base.withIndex("by_board_deadline", (q) =>
                        q.eq("boardId", args.boardId).gt("deadline", undefined),
                      )
                    : base.withIndex("by_board_deadline", (q) =>
                        q.eq("boardId", args.boardId).eq("deadline", undefined),
                      )
                  ).order("asc")
                : base
                    .withIndex("by_board_order", (q) =>
                      q.eq("boardId", args.boardId),
                    )
                    .order("asc");
    ordered = ordered.filter((q) =>
      q.and(
        args.columnId === undefined
          ? true
          : q.eq(q.field("columnId"), args.columnId),
        args.assigneeId === undefined
          ? true
          : q.eq(q.field("assigneeId"), args.assigneeId ?? undefined),
        args.priority === undefined
          ? true
          : args.priority === "medium"
            ? q.or(
                q.eq(q.field("priority"), "medium"),
                q.eq(q.field("priority"), undefined),
              )
            : q.eq(q.field("priority"), args.priority),
        args.storyPoints === undefined
          ? true
          : q.eq(q.field("storyPoints"), args.storyPoints),
        args.deadline === "all"
          ? true
          : args.deadline === "none"
            ? q.eq(q.field("deadline"), undefined)
            : q.and(
                q.neq(q.field("deadline"), undefined),
                args.deadline === "overdue"
                  ? q.lt(q.field("deadline"), args.today)
                  : args.deadline === "today"
                    ? q.and(
                        q.gte(q.field("deadline"), args.today),
                        q.lt(q.field("deadline"), args.tomorrow),
                      )
                    : q.gte(q.field("deadline"), args.tomorrow),
              ),
      ),
    );
    const end = args.paginationOpts.endCursor
      ? decodeCursor(args.paginationOpts.endCursor)
      : null;
    const result = await ordered.paginate({
      ...args.paginationOpts,
      cursor,
      endCursor: end?.phase === phase ? end.cursor : undefined,
      numItems: Math.min(50, Math.max(1, args.paginationOpts.numItems)),
      maximumRowsRead: 500,
      maximumBytesRead: 1024 * 1024,
    });
    const users = new Map<string, Doc<"users"> | null>();
    const search = args.search.trim().toLowerCase();
    const matches: (Doc<"tasks"> & { isFavorite: boolean })[] = [];
    for (const task of result.page) {
      let text = `${task.title} ${task.description ?? ""}`;
      if (search)
        for (const id of [task.userId, task.assigneeId]) {
          if (!id) continue;
          if (!users.has(id)) users.set(id, await ctx.db.get("users", id));
          const user = users.get(id);
          text += ` ${user?.name ?? ""} ${user?.email ?? ""}`;
        }
      if (!search || text.toLowerCase().includes(search)) {
        const favorite = await ctx.db
          .query("favorites")
          .withIndex("by_user_task", (q) =>
            q.eq("userId", currentUser._id).eq("taskId", task._id),
          )
          .unique();
        matches.push({ ...task, isFavorite: Boolean(favorite) });
      }
    }
    const lastPhase =
      args.sort === "priority" ? 4 : args.sort === "deadline" ? 1 : 0;
    const isDone = result.isDone && phase >= lastPhase;
    return {
      page: matches,
      isDone,
      pageStatus: result.pageStatus,
      splitCursor: result.splitCursor
        ? JSON.stringify({ phase, cursor: result.splitCursor })
        : null,
      continueCursor: JSON.stringify({
        phase: result.isDone && !isDone ? phase + 1 : phase,
        cursor: result.isDone && !isDone ? null : result.continueCursor,
      }),
    };
  },
});
