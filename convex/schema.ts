import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  boards: defineTable({
    name: v.string(),
    userId: v.id("users"),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  columns: defineTable({
    name: v.string(),
    color: v.string(),
    boardId: v.id("boards"),
    userId: v.id("users"),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_board", ["boardId"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    columnId: v.id("columns"),
    order: v.number(),
    priority: v.optional(v.string()),
    storyPoints: v.optional(
      v.union(
        v.literal(1),
        v.literal(2),
        v.literal(3),
        v.literal(5),
        v.literal(8),
        v.literal(13),
        v.literal(21),
      ),
    ),
    subtasks: v.optional(
      v.array(
        v.object({
          text: v.string(),
          completed: v.boolean(),
        }),
      ),
    ),
    boardId: v.id("boards"),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_board", ["boardId"]),
});
