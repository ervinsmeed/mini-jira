import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

    if (!board || board.userId !== currentUser._id) {
      throw new Error("Project not found");
    }

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

    if (!board || board.userId !== currentUser._id) {
      throw new Error("Project not found");
    }

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

    await ctx.db.delete(membership._id);
  },
});
