import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const permissionValidator = v.union(
  v.literal("project.view"),
  v.literal("project.create"),
  v.literal("project.update"),
  v.literal("project.delete"),

  v.literal("task.view"),
  v.literal("task.create"),
  v.literal("task.update"),
  v.literal("task.delete"),

  v.literal("members.manage"),
  v.literal("roles.manage"),
  v.literal("analytics.view"),
);

async function getRoleManagementAccess(ctx, workspaceId) {
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

  if (!currentRole.permissions.includes("roles.manage")) {
    throw new Error("Missing permission: roles.manage");
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
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    level: v.number(),
    permissions: v.array(permissionValidator),
  },

  handler: async (ctx, args) => {
    const { user, isOwner, currentRole } = await getRoleManagementAccess(
      ctx,
      args.workspaceId,
    );

    if (!isOwner && currentRole && args.level >= currentRole.level) {
      throw new Error("You cannot create a role with equal or higher level");
    }
    const existingRoles = await ctx.db
      .query("roles")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const duplicateRole = existingRoles.find(
      (role) => role.name.toLowerCase() === args.name.trim().toLowerCase(),
    );

    if (duplicateRole) {
      throw new Error("Role already exists");
    }

    const roleId = await ctx.db.insert("roles", {
      workspaceId: args.workspaceId,
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      level: args.level,
      permissions: args.permissions,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return await ctx.db.get(roleId);
  },
});

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
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

    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", user._id),
      )
      .unique();

    const isOwner = workspace.ownerId === user._id;

    if (!isOwner && !membership) {
      throw new Error("Access denied");
    }

    const roles = await ctx.db
      .query("roles")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return roles.sort((a, b) => b.level - a.level);
  },
});
export const remove = mutation({
  args: {
    id: v.id("roles"),
  },

  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.id);

    if (!role) {
      throw new Error("Role not found");
    }

    const { isOwner, currentRole } = await getRoleManagementAccess(
      ctx,
      role.workspaceId,
    );

    if (!isOwner && currentRole && role.level >= currentRole.level) {
      throw new Error("You cannot delete a role with equal or higher level");
    }
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", role.workspaceId))
      .collect();

    const roleIsAssigned = memberships.some(
      (membership) => membership.roleId === args.id,
    );

    if (roleIsAssigned) {
      throw new Error("Role is assigned to one or more members");
    }

    await ctx.db.delete(args.id);
  },
});
