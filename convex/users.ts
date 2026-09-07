import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const email = identity.email?.trim().toLowerCase();

    if (!email) {
      throw new Error("Email must be present in Clerk JWT claims (email)");
    }

    if (identity.emailVerified !== true) {
      throw new Error(
        "Email must be verified in Clerk JWT claims (email_verified: true)",
      );
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
      throw new Error("Email is already associated with another user");
    }

    if (existingUser) {
      if (existingUser.email !== email || existingUser.name !== name) {
        await ctx.db.patch("users", existingUser._id, { email, name });
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
