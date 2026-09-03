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
    roleId: v.optional(v.id("roles")),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  roles: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    level: v.number(),

    permissions: v.array(
      v.union(
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
      ),
    ),

    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

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
    roleId: v.optional(v.id("roles")),

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
    assigneeId: v.optional(v.id("users")),
    taskType: v.optional(v.union(v.literal("epic"), v.literal("task"))),

    epicId: v.optional(v.id("tasks")),

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

    timerStatus: v.optional(
      v.union(v.literal("running"), v.literal("paused"), v.literal("stopped")),
    ),

    timerStartedAt: v.optional(v.number()),
    timerElapsedMs: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_board", ["boardId"]),

  activityLogs: defineTable({
    boardId: v.id("boards"),
    taskId: v.id("tasks"),
    userId: v.id("users"),

    action: v.string(),
    details: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_board", ["boardId"]),
  comments: defineTable({
    taskId: v.id("tasks"),
    boardId: v.id("boards"),
    userId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),
});
