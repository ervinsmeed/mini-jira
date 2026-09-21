import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export type StatusFilter = Id<"columns"> | "all";
export type AssigneeFilter = Id<"users"> | "all" | "unassigned";
export type StoryPointsFilter =
  "all" | "1" | "2" | "3" | "5" | "8" | "13" | "21";
export type DeadlineFilter = "all" | "overdue" | "today" | "upcoming" | "none";
export type PriorityFilter = "all" | "high" | "medium" | "low";
export type SortBy =
  "manual" | "title" | "deadline" | "created" | "storyPoints" | "priority";

function getDayBounds() {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).getTime();
  return { today, tomorrow };
}

export function useBoardFilters() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("manual");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [storyPointsFilter, setStoryPointsFilter] =
    useState<StoryPointsFilter>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const { today, tomorrow } = getDayBounds();

  const taskQuery = {
    search: searchQuery,
    sort: sortBy,
    columnId: statusFilter === "all" ? undefined : statusFilter,
    assigneeId:
      assigneeFilter === "all"
        ? undefined
        : assigneeFilter === "unassigned"
          ? null
          : assigneeFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
    storyPoints:
      storyPointsFilter === "all" ? undefined : Number(storyPointsFilter),
    deadline: deadlineFilter,
    today,
    tomorrow,
  };

  return {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    storyPointsFilter,
    setStoryPointsFilter,
    deadlineFilter,
    setDeadlineFilter,
    priorityFilter,
    setPriorityFilter,
    taskQuery,
  };
}

export type BoardFiltersState = ReturnType<typeof useBoardFilters>;
