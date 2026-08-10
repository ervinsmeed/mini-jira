import { mutation } from "./_generated/server";
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
