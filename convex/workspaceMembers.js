import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getMemberManagementAccess(ctx, workspaceId) {
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

  const workspace = await ctx.db.get(workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const isOwner = workspace.ownerId === currentUser._id;

  if (isOwner) {
    return {
      currentUser,
      workspace,
      isOwner: true,
      currentRole: null,
    };
  }

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", currentUser._id),
    )
    .unique();

  if (!membership || !membership.roleId) {
    throw new Error("Access denied");
  }

  const currentRole = await ctx.db.get(membership.roleId);

  if (!currentRole || currentRole.workspaceId !== workspaceId) {
    throw new Error("Access denied");
  }

  if (!currentRole.permissions.includes("members.manage")) {
    throw new Error("Missing permission: members.manage");
  }

  return {
    currentUser,
    workspace,
    isOwner: false,
    currentRole,
  };
}

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
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

    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const currentMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", currentUser._id),
      )
      .unique();

    const isOwner = workspace.ownerId === currentUser._id;

    if (!isOwner && !currentMembership) {
      throw new Error("Access denied");
    }

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const owner = await ctx.db.get(workspace.ownerId);

    const members = [];

    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);

      if (user) {
        members.push({
          ...user,
          membershipId: membership._id,
          roleId: membership.roleId,
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
          joinedAt: workspace.createdAt,
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
    workspaceId: v.id("workspaces"),
    email: v.string(),
  },

  handler: async (ctx, args) => {
    const { workspace } = await getMemberManagementAccess(
      ctx,
      args.workspaceId,
    );

    const email = args.email.trim().toLowerCase();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user._id === workspace.ownerId) {
      throw new Error("Owner is already in workspace");
    }

    const existingMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", user._id),
      )
      .unique();

    if (existingMember) {
      throw new Error("User is already a member");
    }

    const membershipId = await ctx.db.insert("workspaceMembers", {
      workspaceId: args.workspaceId,
      userId: user._id,
      joinedAt: Date.now(),
    });

    return await ctx.db.get(membershipId);
  },
});

export const remove = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const { workspace, isOwner, currentRole } = await getMemberManagementAccess(
      ctx,
      args.workspaceId,
    );

    if (args.userId === workspace.ownerId) {
      throw new Error("Workspace owner cannot be removed");
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .unique();

    if (!membership) {
      throw new Error("Member not found");
    }

    if (!isOwner && currentRole && membership.roleId) {
      const targetRole = await ctx.db.get(membership.roleId);

      if (
        targetRole &&
        targetRole.workspaceId === args.workspaceId &&
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
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    roleId: v.id("roles"),
  },

  handler: async (ctx, args) => {
    const { workspace, isOwner, currentRole } = await getMemberManagementAccess(
      ctx,
      args.workspaceId,
    );

    if (args.userId === workspace.ownerId) {
      throw new Error("Workspace owner role cannot be changed");
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .unique();

    if (!membership) {
      throw new Error("Member not found");
    }

    const role = await ctx.db.get(args.roleId);

    if (!role) {
      throw new Error("Role not found");
    }

    if (role.workspaceId !== args.workspaceId) {
      throw new Error("Role does not belong to this workspace");
    }

    if (!isOwner && currentRole) {
      if (role.level >= currentRole.level) {
        throw new Error("You cannot assign a role with equal or higher level");
      }

      if (membership.roleId) {
        const targetCurrentRole = await ctx.db.get(membership.roleId);

        if (
          targetCurrentRole &&
          targetCurrentRole.workspaceId === args.workspaceId &&
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

export const getCurrentAccess = query({
  args: {
    workspaceId: v.id("workspaces"),
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

    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace) {
      return null;
    }

    const isOwner = workspace.ownerId === currentUser._id;

    if (isOwner) {
      return {
        isOwner: true,
        roleId: null,
        roleName: "Owner",
        level: null,
        permissions: [],
      };
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", currentUser._id),
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

    if (!role || role.workspaceId !== args.workspaceId) {
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
