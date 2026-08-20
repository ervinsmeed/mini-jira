import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),

    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatar: v.optional(v.string()),
    position: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  boards: defineTable({
    name: v.string(),
    userId: v.id("users"),

    workspaceId: v.optional(v.id("workspaces")),

    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived"),
      ),
    ),

    favorite: v.optional(v.boolean()),

    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"]),

  boardMembers: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_user", ["userId"])
    .index("by_board_user", ["boardId", "userId"]),

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

    deadline: v.optional(v.number()),

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
