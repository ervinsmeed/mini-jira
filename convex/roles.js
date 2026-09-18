import { getWorkspacePermissionAccess } from "./lib/access";
export { rolesPage } from "./lib/directoryQueries";
import { ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
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

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    level: v.number(),
    permissions: v.array(permissionValidator),
  },

  handler: async (ctx, args) => {
    const { user, isOwner, currentRole } = await getWorkspacePermissionAccess(ctx, args.workspaceId, "roles.manage");

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

    const { user, isOwner, currentRole } = await getWorkspacePermissionAccess(ctx, role.workspaceId, "roles.manage");

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

export const remove = mutation({
  args: {
    id: v.id("roles"),
  },

  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.id);

    if (!role) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const { isOwner, currentRole } = await getWorkspacePermissionAccess(ctx, role.workspaceId, "roles.manage");

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

    const workspaceBoards = await ctx.db
      .query("boards")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", role.workspaceId))
      .collect();

    let projectRoleIsAssigned = false;
    for (const board of workspaceBoards) {
      const members = await ctx.db
        .query("boardMembers")
        .withIndex("by_board", (q) => q.eq("boardId", board._id))
        .collect();
      if (members.some((membership) => membership.roleId === args.id)) {
        projectRoleIsAssigned = true;
        break;
      }
    }

    if (workspaceRoleIsAssigned || projectRoleIsAssigned) {
      throw new ConvexError({ code: "ACCESS_DENIED" });
    }

    await ctx.db.delete(args.id);
  },
});
