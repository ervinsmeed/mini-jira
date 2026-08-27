import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getProjectMemberManagementAccess(ctx, boardId) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  const currentUser = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!currentUser) {
    throw new Error("User not found");
  }

  const board = await ctx.db.get(boardId);

  if (!board) {
    throw new Error("Project not found");
  }

  const isOwner = board.userId === currentUser._id;

  if (isOwner) {
    return {
      currentUser,
      board,
      isOwner: true,
      currentRole: null,
    };
  }

  if (!board.workspaceId) {
    throw new Error("Access denied");
  }

  const membership = await ctx.db
    .query("boardMembers")
    .withIndex("by_board_user", (q) =>
      q.eq("boardId", boardId).eq("userId", currentUser._id),
    )
    .unique();

  if (!membership || !membership.roleId) {
    throw new Error("Access denied");
  }

  const currentRole = await ctx.db.get(membership.roleId);

  if (!currentRole || currentRole.workspaceId !== board.workspaceId) {
    throw new Error("Access denied");
  }

  if (!currentRole.permissions.includes("members.manage")) {
    throw new Error("Missing permission: members.manage");
  }

  return {
    currentUser,
    board,
    isOwner: false,
    currentRole,
  };
}
export const list = query({
  args: {
    boardId: v.id("boards"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    const board = await ctx.db.get(args.boardId);

    if (!board) {
      throw new Error("Project not found");
    }

    const currentMembership = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", currentUser._id),
      )
      .unique();

    const isOwner = board.userId === currentUser._id;

    if (!isOwner && !currentMembership) {
      throw new Error("Access denied");
    }

    const memberships = await ctx.db
      .query("boardMembers")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const owner = await ctx.db.get(board.userId);

    const members = [];

    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);

      if (user) {
        members.push({
          ...user,
          membershipId: membership._id,
          roleId: membership.roleId ?? null,
          joinedAt: membership.joinedAt,
          isOwner: false,
        });
      }
    }

    if (owner) {
      return [
        {
          ...owner,
          membershipId: null,
          roleId: null,
          joinedAt: board.createdAt,
          isOwner: true,
        },
        ...members,
      ];
    }

    return members;
  },
});

export const addByEmail = mutation({
  args: {
    boardId: v.id("boards"),
    email: v.string(),
  },

  handler: async (ctx, args) => {
    const { board } = await getProjectMemberManagementAccess(ctx, args.boardId);

    const email = args.email.trim().toLowerCase();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user._id === board.userId) {
      throw new Error("Owner is already in project");
    }

    const existingMember = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", user._id),
      )
      .unique();

    if (existingMember) {
      throw new Error("User is already a member");
    }

    if (board.workspaceId) {
      const workspaceMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_user", (q) =>
          q.eq("workspaceId", board.workspaceId).eq("userId", user._id),
        )
        .unique();

      if (!workspaceMembership) {
        await ctx.db.insert("workspaceMembers", {
          workspaceId: board.workspaceId,
          userId: user._id,
          joinedAt: Date.now(),
        });
      }
    }

    const membershipId = await ctx.db.insert("boardMembers", {
      boardId: args.boardId,
      userId: user._id,
      joinedAt: Date.now(),
    });

    return await ctx.db.get(membershipId);
  },
});

export const remove = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const { board, isOwner, currentRole } =
      await getProjectMemberManagementAccess(ctx, args.boardId);

    if (args.userId === board.userId) {
      throw new Error("Project owner cannot be removed");
    }

    const membership = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId),
      )
      .unique();

    if (!membership) {
      throw new Error("Member not found");
    }

    if (!isOwner && currentRole && membership.roleId) {
      const targetRole = await ctx.db.get(membership.roleId);

      if (
        targetRole &&
        targetRole.workspaceId === board.workspaceId &&
        targetRole.level >= currentRole.level
      ) {
        throw new Error(
          "You cannot remove a member with equal or higher role level",
        );
      }
    }

    await ctx.db.delete(membership._id);
  },
});
export const changeRole = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    roleId: v.id("roles"),
  },

  handler: async (ctx, args) => {
    const { board, isOwner, currentRole } =
      await getProjectMemberManagementAccess(ctx, args.boardId);

    if (!board.workspaceId) {
      throw new Error("Project has no workspace");
    }

    if (args.userId === board.userId) {
      throw new Error("Project owner role cannot be changed");
    }

    const membership = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId),
      )
      .unique();

    if (!membership) {
      throw new Error("Member not found");
    }

    const role = await ctx.db.get(args.roleId);

    if (!role || role.workspaceId !== board.workspaceId) {
      throw new Error("Role not found");
    }

    if (!isOwner && currentRole) {
      if (role.level >= currentRole.level) {
        throw new Error("You cannot assign a role with equal or higher level");
      }

      if (membership.roleId) {
        const targetCurrentRole = await ctx.db.get(membership.roleId);

        if (
          targetCurrentRole &&
          targetCurrentRole.workspaceId === board.workspaceId &&
          targetCurrentRole.level >= currentRole.level
        ) {
          throw new Error(
            "You cannot change the role of a member with equal or higher level",
          );
        }
      }
    }

    await ctx.db.patch(membership._id, {
      roleId: args.roleId,
    });

    return await ctx.db.get(membership._id);
  },
});
