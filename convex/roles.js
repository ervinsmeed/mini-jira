export { rolesPage } from "./lib/directoryQueries";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertRoleDelegation } from "./lib/roleDelegation";

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
    throw new ConvexError({ code: "NOT_AUTHENTICATED" });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError({ code: "NOT_FOUND" });
  }

  const workspace = await ctx.db.get(workspaceId);

  if (!workspace) {
    throw new ConvexError({ code: "NOT_FOUND" });
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
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  const currentRole = await ctx.db.get(membership.roleId);

  if (!currentRole || currentRole.workspaceId !== workspaceId) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
  }

  if (!currentRole.permissions.includes("roles.manage")) {
    throw new ConvexError({ code: "ACCESS_DENIED" });
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
      throw new ConvexError({ code: "ACCESS_DENIED" });
    }
    assertRoleDelegation({ isOwner, currentRole }, args.workspaceId, args);
    const existingRoles = await ctx.db
      .query("roles")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const duplicateRole = existingRoles.find(
      (role) => role.name.toLowerCase() === args.name.trim().toLowerCase(),
    );

    if (duplicateRole) {
      throw new ConvexError({ code: "ACCESS_DENIED" });
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

export const update = mutation({
  args: {
    id: v.id("roles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    level: v.optional(v.number()),
    permissions: v.optional(v.array(permissionValidator)),
  },

  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.id);

    if (!role) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const { user, isOwner, currentRole } = await getRoleManagementAccess(
      ctx,
      role.workspaceId,
    );

    if (!isOwner && currentRole) {
      if (role.level >= currentRole.level) {
        throw new ConvexError({ code: "ACCESS_DENIED" });
      }

      if (args.level !== undefined && args.level >= currentRole.level) {
        throw new ConvexError({ code: "ACCESS_DENIED" });
      }
    }

    const nextRole = {
      workspaceId: role.workspaceId,
      level: args.level ?? role.level,
      permissions: args.permissions ?? role.permissions,
    };
    assertRoleDelegation({ isOwner, currentRole }, role.workspaceId, nextRole);

    if (!isOwner) {
      const workspaceMemberships = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      const projectMemberships = await ctx.db
        .query("boardMembers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      const assignedToSelf = [
        ...workspaceMemberships,
        ...projectMemberships,
      ].some((membership) => membership.roleId === role._id);

      if (
        assignedToSelf &&
        (nextRole.level > role.level ||
          nextRole.permissions.some(
            (permission) => !role.permissions.includes(permission),
          ))
      ) {
        throw new ConvexError({ code: "ACCESS_DENIED" });
      }
    }

    if (args.name !== undefined) {
      const roles = await ctx.db
        .query("roles")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", role.workspaceId))
        .collect();

      const duplicateRole = roles.find(
        (item) =>
          item._id !== args.id &&
          item.name.toLowerCase() === args.name.trim().toLowerCase(),
      );

      if (duplicateRole) {
        throw new ConvexError({ code: "ACCESS_DENIED" });
      }
    }

    const updates = {};

    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }

    if (args.description !== undefined) {
      updates.description = args.description.trim() || undefined;
    }

    if (args.level !== undefined) {
      updates.level = args.level;
    }

    if (args.permissions !== undefined) {
      updates.permissions = args.permissions;
    }

    await ctx.db.patch(args.id, updates);

    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({ code: "NOT_AUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", user._id),
      )
      .unique();

    const isOwner = workspace.ownerId === user._id;

    if (!isOwner && !membership) {
      throw new ConvexError({ code: "ACCESS_DENIED" });
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
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const { isOwner, currentRole } = await getRoleManagementAccess(
      ctx,
      role.workspaceId,
    );

    if (!isOwner && currentRole && role.level >= currentRole.level) {
      throw new ConvexError({ code: "ACCESS_DENIED" });
    }
    const workspaceMemberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", role.workspaceId))
      .collect();

    const workspaceRoleIsAssigned = workspaceMemberships.some(
      (membership) => membership.roleId === args.id,
    );

    const projectMemberships = await ctx.db.query("boardMembers").collect();

    const projectRoleIsAssigned = projectMemberships.some(
      (membership) => membership.roleId === args.id,
    );

    if (workspaceRoleIsAssigned || projectRoleIsAssigned) {
      throw new ConvexError({ code: "ACCESS_DENIED" });
    }

    await ctx.db.delete(args.id);
  },
});
