import { getCurrentUser, getWorkspacePermissionAccess } from "./lib/access";
import { getTaskPermissionAccess } from "./lib/taskAccess";
import { projectOrder } from "./lib/projectOrder";
export { projectsPage } from "./lib/directoryQueries";
import { ConvexError } from "convex/values";
import { deleteBoard } from "./lib/cascade";
import { getParentWorkspaceAccess } from "./lib/workspaceAccess";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (args.workspaceId) {
      await getWorkspacePermissionAccess(ctx, args.workspaceId, "project.create");
    }

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const maxOrder = Math.max(...boards.map((b) => b.order || 0), -1);

    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      description: args.description,
      userId: user._id,
      workspaceId: args.workspaceId,
      status: "active",
      favorite: false,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    return await ctx.db.get(boardId);
  },
});

export const update = mutation({
  args: {
    id: v.id("boards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived"),
      ),
    ),
    favorite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);

    if (!board) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    await getTaskPermissionAccess(ctx, args.id, "project.update");

    const updates = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    if (args.favorite !== undefined) {
      updates.favorite = args.favorite;
    }

    await ctx.db.patch(args.id, updates);

    return await ctx.db.get(args.id);
  },
});
export const updateOrder = mutation({
  args: {
    boardId: v.id("boards"),
    newOrder: v.number(),
    anchorId: v.optional(v.id("boards")),
    after: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    const { board } = await getTaskPermissionAccess(
      ctx,
      args.boardId,
      "project.update",
    );

    await ctx.db.patch(args.boardId, {
      order: args.anchorId
        ? await projectOrder(ctx, board, args.anchorId, args.after ?? false)
        : args.newOrder,
    });

    return await ctx.db.get(args.boardId);
  },
});
export const remove = mutation({
  args: {
    id: v.id("boards"),
  },

  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);

    if (!board) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    await getTaskPermissionAccess(ctx, args.id, "project.delete");

    await deleteBoard(ctx, args.id);
  },
});
export const getCurrentAccess = query({
  args: {
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return null;
    }

    const board = await ctx.db.get(args.boardId);

    if (!board) {
      return null;
    }

    const parentAccess = await getParentWorkspaceAccess(
      ctx,
      currentUser._id,
      board,
    );
    if (!parentAccess) return null;

    if (parentAccess.isWorkspaceOwner || board.userId === currentUser._id) {
      return {
        isOwner: true,
        roleId: null,
        roleName: "Owner",
        level: null,
        permissions: [],
      };
    }

    const membership = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", currentUser._id),
      )
      .unique();

    if (!membership) {
      return null;
    }

    if (!membership.roleId) {
      return {
        isOwner: false,
        roleId: null,
        roleName: null,
        level: null,
        permissions: [],
      };
    }

    const role = await ctx.db.get(membership.roleId);

    if (!role || !board.workspaceId || role.workspaceId !== board.workspaceId) {
      return null;
    }

    return {
      isOwner: false,
      roleId: role._id,
      roleName: role.name,
      level: role.level,
      permissions: role.permissions,
    };
  },
});
