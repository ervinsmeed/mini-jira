import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, type QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getTaskPermissionAccess } from "./taskAccess";

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "NOT_AUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND" });
  return user;
}
function workspaceCursor(value: string | null | undefined) {
  if (!value) return { phase: 0, cursor: null };
  const parsed: unknown = JSON.parse(value);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("phase" in parsed) ||
    !("cursor" in parsed) ||
    (parsed.phase !== 0 && parsed.phase !== 1) ||
    !(parsed.cursor === null || typeof parsed.cursor === "string")
  )
    throw new ConvexError({ code: "VALIDATION_FAILED" });
  return { phase: parsed.phase, cursor: parsed.cursor };
}
export const workspacesPage = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "NOT_AUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { page: [], isDone: true, continueCursor: "" };
    const { phase, cursor } = workspaceCursor(args.paginationOpts.cursor);
    const end = args.paginationOpts.endCursor
      ? workspaceCursor(args.paginationOpts.endCursor)
      : null;
    const options = {
      ...args.paginationOpts,
      cursor,
      endCursor: end?.phase === phase ? end.cursor : undefined,
      numItems: Math.min(50, args.paginationOpts.numItems),
    };
    if (phase === 0) {
      const result = await ctx.db
        .query("workspaces")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .paginate(options);
      return {
        ...result,
        isDone: false,
        continueCursor: JSON.stringify({
          phase: result.isDone ? 1 : 0,
          cursor: result.isDone ? null : result.continueCursor,
        }),
        splitCursor: result.splitCursor
          ? JSON.stringify({ phase, cursor: result.splitCursor })
          : null,
      };
    }
    const result = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .paginate(options);
    const page = [];
    for (const member of result.page) {
      const workspace = await ctx.db.get("workspaces", member.workspaceId);
      if (workspace && workspace.ownerId !== user._id) page.push(workspace);
    }
    return {
      ...result,
      page,
      continueCursor: JSON.stringify({
        phase: 1,
        cursor: result.continueCursor,
      }),
      splitCursor: result.splitCursor
        ? JSON.stringify({ phase, cursor: result.splitCursor })
        : null,
    };
  },
});
async function workspaceAccess(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  manage = false,
) {
  const user = await currentUser(ctx);
  const workspace = await ctx.db.get("workspaces", workspaceId);
  if (!workspace) throw new ConvexError({ code: "NOT_FOUND" });
  if (workspace.ownerId !== user._id) {
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", user._id),
      )
      .unique();
    if (!member) throw new ConvexError({ code: "ACCESS_DENIED" });
    if (manage) {
      const role = member.roleId
        ? await ctx.db.get("roles", member.roleId)
        : null;
      if (
        !role ||
        role.workspaceId !== workspaceId ||
        !role.permissions.includes("members.manage")
      )
        throw new ConvexError({ code: "ACCESS_DENIED" });
    }
  }
  return { user, workspace };
}
export const rolesPage = query({
  args: {
    workspaceId: v.id("workspaces"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await workspaceAccess(ctx, args.workspaceId);
    return ctx.db
      .query("roles")
      .withIndex("by_workspace_level", (q) =>
        q.eq("workspaceId", args.workspaceId),
      )
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
  },
});
export const projectsPage = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "NOT_AUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { page: [], isDone: true, continueCursor: "" };
    const workspaceId = args.workspaceId;
    const source = workspaceId
      ? ctx.db
          .query("boards")
          .withIndex("by_workspace_order", (q) =>
            q.eq("workspaceId", workspaceId),
          )
      : ctx.db
          .query("boards")
          .withIndex("by_user_order", (q) => q.eq("userId", user._id));
    const result = await source.paginate({
      ...args.paginationOpts,
      numItems: Math.min(50, args.paginationOpts.numItems),
      maximumRowsRead: 500,
    });
    const page = [];
    for (const board of result.page) {
      try {
        await getTaskPermissionAccess(ctx, board._id, "project.view");
      } catch (error) {
        if (error instanceof ConvexError) continue;
        throw error;
      }
      const favorite = await ctx.db
        .query("favorites")
        .withIndex("by_user_board", (q) =>
          q
            .eq("userId", user._id)
            .eq("boardId", board._id)
            .eq("itemType", "project"),
        )
        .unique();
      page.push({ ...board, isFavorite: Boolean(favorite) });
    }
    return { ...result, page };
  },
});

export const workspaceMembersPage = query({
  args: {
    workspaceId: v.id("workspaces"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { workspace } = await workspaceAccess(ctx, args.workspaceId, true);
    const result = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
    const page = [];
    for (const row of result.page) {
      if (row.userId === workspace.ownerId) continue;
      const user = await ctx.db.get("users", row.userId);
      const role = row.roleId ? await ctx.db.get("roles", row.roleId) : null;
      if (user)
        page.push({
          _id: user._id,
          name: user.name,
          email: user.email,
          roleId: row.roleId ?? null,
          roleName: role?.workspaceId === workspace._id ? role.name : null,
          isOwner: false,
        });
    }
    if (args.paginationOpts.cursor === null) {
      const owner = await ctx.db.get("users", workspace.ownerId);
      if (owner)
        page.unshift({
          _id: owner._id,
          name: owner.name,
          email: owner.email,
          roleId: null,
          roleName: null,
          isOwner: true,
        });
    }
    return { ...result, page };
  },
});

export const projectMembersPage = query({
  args: { boardId: v.id("boards"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    let allowed = false;
    for (const permission of ["project.view", "task.view", "members.manage"]) {
      try {
        await getTaskPermissionAccess(ctx, args.boardId, permission);
        allowed = true;
        break;
      } catch (error) {
        if (!(error instanceof ConvexError)) throw error;
      }
    }
    if (!allowed) throw new ConvexError({ code: "ACCESS_DENIED" });
    const board = await ctx.db.get("boards", args.boardId);
    if (!board) throw new ConvexError({ code: "NOT_FOUND" });
    const result = await ctx.db
      .query("boardMembers")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
    const page = [];
    for (const row of result.page) {
      if (row.userId === board.userId) continue;
      const user = await ctx.db.get("users", row.userId);
      const role = row.roleId ? await ctx.db.get("roles", row.roleId) : null;
      if (user)
        page.push({
          _id: user._id,
          name: user.name,
          email: user.email,
          roleId: row.roleId ?? null,
          roleName:
            role?.workspaceId === board.workspaceId
              ? (role?.name ?? null)
              : null,
          isOwner: false,
        });
    }
    if (args.paginationOpts.cursor === null) {
      const owner = await ctx.db.get("users", board.userId);
      if (owner)
        page.unshift({
          _id: owner._id,
          name: owner.name,
          email: owner.email,
          roleId: null,
          roleName: null,
          isOwner: true,
        });
    }
    return { ...result, page };
  },
});
