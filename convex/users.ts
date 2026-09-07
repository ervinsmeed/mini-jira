import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Исправлено: правильно расставлены кавычки и скобки, исправлено ckerkId -> clerkId
    const exisitingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (exisitingUser) {
      return exisitingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
    });

    return userId;
  },
});
async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
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

  return user;
}

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
