import { getParentWorkspaceAccess, requireParentWorkspaceAccess } from "./lib/workspaceAccess";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertRoleDelegation } from "./lib/roleDelegation";

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

  const { workspace, isWorkspaceOwner } =
    await requireParentWorkspaceAccess(ctx, currentUser._id, board);
  const isProjectOwner = board.userId === currentUser._id;

  const isOwner = isWorkspaceOwner || isProjectOwner;

  if (isOwner) {
    return {
      currentUser,
      board,
      workspace,
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
    workspace,
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

    const parentAccess = await getParentWorkspaceAccess(ctx, currentUser._id, board);
    if (!parentAccess) throw new Error("Active workspace access required");
    const isOwner = board.userId === currentUser._id || parentAccess.isWorkspaceOwner;

    if (isOwner) {
      await getProjectMemberManagementAccess(ctx, args.boardId);
    }

    if (!isOwner && !currentMembership) {
      throw new Error("Access denied");
    }

    if (!isOwner && board.workspaceId) {
      const role = currentMembership.roleId
        ? await ctx.db.get(currentMembership.roleId)
        : null;
      if (
        !role || role.workspaceId !== board.workspaceId ||
        !role.permissions.some((permission) =>
          ["project.view", "task.view", "members.manage"].includes(permission),
        )
      ) {
        throw new Error("Access denied");
      }
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
          _id: user._id,
          name: user.name,
          email: user.email,
          roleId: membership.roleId ?? null,
          isOwner: false,
        });
      }
    }

    if (owner) {
      return [
        {
          _id: owner._id,
          name: owner.name,
          email: owner.email,
          roleId: null,
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
    const { currentUser, board, workspace } =
      await getProjectMemberManagementAccess(ctx, args.boardId);

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

    if (user._id === workspace?.ownerId) {
      throw new Error("Workspace owner already has project access");
    }

    if (user._id === currentUser._id) {
      throw new Error("You cannot add yourself as a project member");
    }

    if (board.workspaceId && user._id !== workspace?.ownerId) {
      const workspaceMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_user", (q) =>
          q.eq("workspaceId", board.workspaceId).eq("userId", user._id),
        )
        .unique();

      if (!workspaceMembership) {
        throw new Error(
          "User must be a workspace member before being added to the project",
        );
      }
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
    const { board, workspace, isOwner, currentRole } =
      await getProjectMemberManagementAccess(ctx, args.boardId);

    if (args.userId === board.userId) {
      throw new Error("Project owner cannot be removed");
    }

    if (args.userId === workspace?.ownerId) {
      throw new Error("Workspace owner cannot be removed");
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
    const { currentUser, board, workspace, isOwner, currentRole } =
      await getProjectMemberManagementAccess(ctx, args.boardId);

    if (!board.workspaceId) {
      throw new Error("Project has no workspace");
    }

    if (args.userId === board.userId) {
      throw new Error("Project owner role cannot be changed");
    }

    if (args.userId === workspace?.ownerId) {
      throw new Error("Workspace owner role cannot be changed");
    }

    if (args.userId === currentUser._id) {
      throw new Error("You cannot assign a role to yourself");
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

    assertRoleDelegation({ isOwner, currentRole }, board.workspaceId, role);

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
