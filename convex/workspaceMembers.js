import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

    if (!workspace || workspace.ownerId !== currentUser._id) {
      throw new Error("Workspace not found");
    }

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

    if (!workspace || workspace.ownerId !== currentUser._id) {
      throw new Error("Workspace not found");
    }

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

    if (!workspace || workspace.ownerId !== currentUser._id) {
      throw new Error("Access denied");
    }

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

    await ctx.db.patch(membership._id, {
      roleId: args.roleId,
    });

    return await ctx.db.get(membership._id);
  },
});
