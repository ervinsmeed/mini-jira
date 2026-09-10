import { ConvexError } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { getParentWorkspaceAccess } from "./lib/workspaceAccess";

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({ code: "NOT_AUTHENTICATED" });
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const email = identity.email?.trim().toLowerCase();

    if (!email) {
      throw new ConvexError({ code: "EMAIL_INVALID" });
    }

    if (identity.emailVerified !== true) {
      throw new ConvexError({ code: "EMAIL_INVALID" });
    }

    const name =
      identity.name?.trim() ||
      [identity.givenName?.trim(), identity.familyName?.trim()]
        .filter(Boolean)
        .join(" ") ||
      identity.nickname?.trim() ||
      identity.preferredUsername?.trim() ||
      "User";

    // Also detect legacy emails stored with whitespace or mixed case.
    const users = await ctx.db.query("users").collect();
    const emailConflict = users.some(
      (user) =>
        user.clerkId !== identity.subject &&
        user.email.trim().toLowerCase() === email,
    );

    if (emailConflict) {
      throw new ConvexError({ code: "EMAIL_INVALID" });
    }

    if (existingUser) {
      if (existingUser.email !== email) {
        await ctx.db.patch("users", existingUser._id, { email });
      }

      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email,
      name,
    });

    return userId;
  },
});
async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
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

  return user;
}

export const myRoles = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const result: {
      id: string;
      workspace: string;
      project?: string;
      role?: string;
      owner: boolean;
    }[] = [];
    const owned = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const workspace of owned)
      result.push({
        id: workspace._id,
        workspace: workspace.name,
        owner: true,
      });
    for (const member of memberships) {
      const workspace = await ctx.db.get("workspaces", member.workspaceId);
      if (!workspace || workspace.ownerId === user._id) continue;
      const role = member.roleId
        ? await ctx.db.get("roles", member.roleId)
        : null;
      result.push({
        id: workspace._id,
        workspace: workspace.name,
        owner: false,
        role: role?.workspaceId === workspace._id ? role.name : undefined,
      });
    }
    const ownedBoards = await ctx.db
      .query("boards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const projects = await ctx.db
      .query("boardMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const boardIds = new Set([
      ...ownedBoards.map((b) => b._id),
      ...projects.map((m) => m.boardId),
    ]);
    for (const id of boardIds) {
      const board = await ctx.db.get("boards", id);
      if (!board) continue;
      const access = await getParentWorkspaceAccess(ctx, user._id, board);
      if (!access) continue;
      const owner = access.isWorkspaceOwner || board.userId === user._id;
      const member = projects.find((m) => m.boardId === id);
      const role = member?.roleId
        ? await ctx.db.get("roles", member.roleId)
        : null;
      if (
        !owner &&
        (!role ||
          role.workspaceId !== board.workspaceId ||
          !role.permissions.includes("project.view"))
      )
        continue;
      result.push({
        id,
        workspace: access.workspace?.name ?? "",
        project: board.name,
        owner,
        role: owner ? undefined : role?.name,
      });
    }
    return result;
  },
});

export const getCurrent = query({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    position: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const firstName = args.firstName?.trim() || undefined;
    const lastName = args.lastName?.trim() || undefined;
    const position = args.position?.trim() || undefined;
    const avatar = args.avatar?.trim() || undefined;

    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    await ctx.db.patch("users", user._id, {
      firstName,
      lastName,
      position,
      avatar,
      name: fullName || user.name,
    });

    return await ctx.db.get("users", user._id);
  },
});
