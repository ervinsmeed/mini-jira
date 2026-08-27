import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getProjectPermissionAccess(ctx, workspaceId, permission) {
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

  const workspace = await ctx.db.get(workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const isOwner = workspace.ownerId === user._id;

  if (isOwner) {
    return {
      user,
      workspace,
      isOwner: true,
      currentRole: null,
    };
  }

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", user._id),
    )
    .unique();

  if (!membership || !membership.roleId) {
    throw new Error("Access denied");
  }

  const currentRole = await ctx.db.get(membership.roleId);

  if (!currentRole || currentRole.workspaceId !== workspaceId) {
    throw new Error("Access denied");
  }

  if (!currentRole.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }

  return {
    user,
    workspace,
    isOwner: false,
    currentRole,
  };
}

export const create = mutation({
  args: {
    name: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
  },

  handler: async (ctx, args) => {
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

    if (args.workspaceId) {
      await getProjectPermissionAccess(ctx, args.workspaceId, "project.create");
    }

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const maxOrder = Math.max(...boards.map((b) => b.order || 0), -1);

    const boardId = await ctx.db.insert("boards", {
      name: args.name,
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

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("boards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()
      .then((boards) => boards.sort((a, b) => (a.order || 0) - (b.order || 0)));
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },

  handler: async (ctx, args) => {
    await getProjectPermissionAccess(ctx, args.workspaceId, "project.view");

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return boards.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
});
export const update = mutation({
  args: {
    id: v.id("boards"),
    name: v.optional(v.string()),
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
      throw new Error("Project not found");
    }

    if (board.workspaceId) {
      await getProjectPermissionAccess(
        ctx,
        board.workspaceId,
        "project.update",
      );
    } else {
      const identity = await ctx.auth.getUserIdentity();

      if (!identity) {
        throw new Error("Not authenticated");
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();

      if (!user || board.userId !== user._id) {
        throw new Error("Project not found");
      }
    }

    const updates = {};

    if (args.name !== undefined) {
      updates.name = args.name;
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
  },

  handler: async (ctx, args) => {
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

    const board = await ctx.db.get(args.boardId);

    if (!board || board.userId !== user._id) {
      throw new Error("Board not found");
    }

    await ctx.db.patch(args.boardId, {
      order: args.newOrder,
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
      throw new Error("Project not found");
    }

    if (board.workspaceId) {
      await getProjectPermissionAccess(
        ctx,
        board.workspaceId,
        "project.delete",
      );
    } else {
      const identity = await ctx.auth.getUserIdentity();

      if (!identity) {
        throw new Error("Not authenticated");
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();

      if (!user || board.userId !== user._id) {
        throw new Error("Project not found");
      }
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    const columns = await ctx.db
      .query("columns")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();

    for (const column of columns) {
      await ctx.db.delete(column._id);
    }

    await ctx.db.delete(args.id);
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

    if (board.userId === currentUser._id) {
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
