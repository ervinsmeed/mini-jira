import { useEffect, useState } from "react";

import { Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { UserButton } from "@clerk/clerk-react";

import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

import Column from "./ui/Column";
import TaskCard from "./TaskCard";
import TaskModal from "./ui/TaskModal";
import CreateTaskModal from "./ui/CreateTaskModal";
import CreateColumnModal from "./ui/CreateColumnModal";
import EditColumnModal from "./EditColumnModal";

type BoardProps = {
  board: Doc<"boards"> | null;
  theme: "light" | "dark";
  can: (permission: string) => boolean;
};

export default function Board({ board, theme, can }: BoardProps) {
  const [selectedTask, setSelectedTask] = useState<Doc<"tasks"> | null>(null);
  const { t } = useTranslation();
  const canUpdateTask = can("task.update");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isCreateColumnModalOpen, setIsCreateColumnModalOpen] = useState(false);

  const [editingColumn, setEditingColumn] = useState<Doc<"columns"> | null>(
    null,
  );
  const [activeTask, setActiveTask] = useState<Doc<"tasks"> | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Id<"tasks">[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [statusFilter, setStatusFilter] = useState<Id<"columns"> | "all">(
    "all",
  );

  const [assigneeFilter, setAssigneeFilter] = useState<
    Id<"users"> | "all" | "unassigned"
  >("all");

  const [storyPointsFilter, setStoryPointsFilter] = useState<
    "all" | "1" | "2" | "3" | "5" | "8" | "13" | "21"
  >("all");

  const [deadlineFilter, setDeadlineFilter] = useState<
    "all" | "overdue" | "today" | "upcoming" | "none"
  >("all");

  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");

  const [sortBy, setSortBy] = useState<
    "manual" | "title" | "deadline" | "created" | "storyPoints" | "priority"
  >("manual");

  const tasksResult = useQuery(
    api.tasks.list,
    board?._id
      ? {
          boardId: board._id,
        }
      : "skip",
  );

  const analytics = useQuery(
    api.analytics.getProjectAnalytics,
    board?._id && can("analytics.view")
      ? {
          boardId: board._id,
        }
      : "skip",
  );

  const columnsResult = useQuery(
    api.columns.list,
    board?._id
      ? {
          boardId: board._id,
        }
      : "skip",
  );
  const favoriteTaskIdsResult = useQuery(
    api.favorites.listTaskIds,
    board?._id
      ? {
          boardId: board._id,
        }
      : "skip",
  );

  const favoriteTaskIds = favoriteTaskIdsResult ?? [];
  const favoriteTaskIdSet = new Set(favoriteTaskIds);

  const toggleTaskFavorite = useMutation(api.favorites.toggleTask);
  const projectMembers: any[] = (useQuery(
    api.boardMembers.list,
    board?._id
      ? {
          boardId: board._id,
        }
      : "skip",
  ) ?? []) as any[];

  const tasks: any[] = (tasksResult ?? []) as any[];
  const columns: any[] = (columnsResult ?? []) as any[];

  const visibleTasks = tasks
    .filter((task) => {
      const search = searchQuery.trim().toLowerCase();

      if (!search) {
        return true;
      }

      const assignee = projectMembers.find(
        (member: any) => member._id === task.assigneeId,
      );

      const author = projectMembers.find(
        (member: any) => member._id === task.userId,
      );

      const assigneeText = assignee
        ? `${assignee.name ?? ""} ${assignee.email ?? ""}`.toLowerCase()
        : "";

      const authorText = author
        ? `${author.name ?? ""} ${author.email ?? ""}`.toLowerCase()
        : "";

      return (
        task.title.toLowerCase().includes(search) ||
        (task.description ?? "").toLowerCase().includes(search) ||
        assigneeText.includes(search) ||
        authorText.includes(search)
      );
    })
    .filter((task) => {
      if (priorityFilter === "all") {
        return true;
      }

      return task.priority === priorityFilter;
    })
    .filter((task) => {
      if (statusFilter === "all") {
        return true;
      }

      return task.columnId === statusFilter;
    })
    .filter((task) => {
      if (assigneeFilter === "all") {
        return true;
      }

      if (assigneeFilter === "unassigned") {
        return !task.assigneeId;
      }

      return task.assigneeId === assigneeFilter;
    })
    .filter((task) => {
      if (storyPointsFilter === "all") {
        return true;
      }

      return task.storyPoints === Number(storyPointsFilter);
    })
    .filter((task) => {
      if (deadlineFilter === "all") {
        return true;
      }

      if (deadlineFilter === "none") {
        return task.deadline === undefined;
      }

      if (task.deadline === undefined) {
        return false;
      }

      const now = new Date();

      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();

      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      ).getTime();

      if (deadlineFilter === "overdue") {
        return task.deadline < startOfToday;
      }

      if (deadlineFilter === "today") {
        return task.deadline >= startOfToday && task.deadline < endOfToday;
      }

      if (deadlineFilter === "upcoming") {
        return task.deadline >= endOfToday;
      }

      return true;
    })
    .sort((firstTask, secondTask) => {
      if (sortBy === "title") {
        return firstTask.title.localeCompare(secondTask.title);
      }

      if (sortBy === "deadline") {
        if (
          firstTask.deadline === undefined &&
          secondTask.deadline === undefined
        ) {
          return firstTask.order - secondTask.order;
        }

        if (firstTask.deadline === undefined) {
          return 1;
        }

        if (secondTask.deadline === undefined) {
          return -1;
        }

        return firstTask.deadline - secondTask.deadline;
      }

      if (sortBy === "created") {
        return secondTask.createdAt - firstTask.createdAt;
      }

      if (sortBy === "storyPoints") {
        return (secondTask.storyPoints ?? -1) - (firstTask.storyPoints ?? -1);
      }

      if (sortBy === "priority") {
        const priorityOrder = {
          high: 0,
          medium: 1,
          low: 2,
        };

        const firstPriority =
          priorityOrder[firstTask.priority as keyof typeof priorityOrder] ?? 1;

        const secondPriority =
          priorityOrder[secondTask.priority as keyof typeof priorityOrder] ?? 1;

        if (firstPriority !== secondPriority) {
          return firstPriority - secondPriority;
        }
      }

      return firstTask.order - secondTask.order;
    });

  const initializeColumns = useMutation(api.columns.initializeDefaultColumns);

  const updateTaskOrder = useMutation(api.tasks.updateOrder);
  const bulkUpdateTasks = useMutation(api.tasks.bulkUpdate);
  const bulkRemoveTasks = useMutation(api.tasks.bulkRemove);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (
      board?._id &&
      columnsResult !== undefined &&
      columnsResult.length === 0
    ) {
      void initializeColumns({
        boardId: board._id,
      });
    }
  }, [board?._id, columnsResult, initializeColumns]);

  useEffect(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setAssigneeFilter("all");
    setStoryPointsFilter("all");
    setDeadlineFilter("all");
    setPriorityFilter("all");
    setSortBy("manual");
    setSelectedTaskIds([]);
  }, [board?._id]);

  const getTasksByColumn = (columnId: Id<"columns">) => {
    return tasks
      .filter((task) => task.columnId === columnId)
      .sort((firstTask, secondTask) => firstTask.order - secondTask.order);
  };
  const getVisibleTasksByColumn = (columnId: Id<"columns">) => {
    return visibleTasks.filter((task) => task.columnId === columnId);
  };

  const getTaskCount = (columnId: Id<"columns">) => {
    return getVisibleTasksByColumn(columnId).length;
  };
  const toggleTaskSelection = (taskId: Id<"tasks">) => {
    setSelectedTaskIds((currentTaskIds) =>
      currentTaskIds.includes(taskId)
        ? currentTaskIds.filter((id) => id !== taskId)
        : [...currentTaskIds, taskId],
    );
  };

  const clearTaskSelection = () => {
    setSelectedTaskIds([]);
  };
  const handleBulkStatusChange = async (value: string) => {
    if (selectedTaskIds.length === 0) return;

    await bulkUpdateTasks({
      taskIds: selectedTaskIds,
      columnId: value as Id<"columns">,
    });

    clearTaskSelection();
  };

  const handleBulkAssigneeChange = async (value: string) => {
    if (selectedTaskIds.length === 0) return;

    await bulkUpdateTasks({
      taskIds: selectedTaskIds,
      assigneeId: value === "unassigned" ? null : (value as Id<"users">),
    });

    clearTaskSelection();
  };
  const handleBulkPriorityChange = async (value: string) => {
    if (selectedTaskIds.length === 0) return;

    const taskIds = [...selectedTaskIds];

    clearTaskSelection();

    await bulkUpdateTasks({
      taskIds,
      priority: value,
    });
  };
  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedTaskIds.length} selected task(s)?`,
    );

    if (!confirmed) return;

    await bulkRemoveTasks({
      taskIds: selectedTaskIds,
    });

    clearTaskSelection();
  };
  const handleToggleTaskFavorite = async (taskId: Id<"tasks">) => {
    await toggleTaskFavorite({
      taskId,
    });
  };
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((item) => item._id === event.active.id);

    setActiveTask(task ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);

    if (!over) return;

    const task = tasks.find((item) => item._id === active.id);

    if (!task) return;

    const destinationTask = tasks.find((item) => item._id === over.id);

    let destinationColumnId: Id<"columns">;

    if (destinationTask) {
      destinationColumnId = destinationTask.columnId;
    } else {
      const destinationColumn = columns.find(
        (column) => column._id === over.id,
      );

      if (!destinationColumn) return;

      destinationColumnId = destinationColumn._id;
    }

    if (task.columnId === destinationColumnId && !destinationTask) {
      return;
    }

    const destinationTasks = getTasksByColumn(destinationColumnId).filter(
      (item) => item._id !== task._id,
    );

    let newOrder: number;

    if (destinationTasks.length === 0) {
      newOrder = 0;
    } else if (destinationTask) {
      const destinationIndex = destinationTasks.findIndex(
        (item) => item._id === destinationTask._id,
      );

      if (destinationIndex <= 0) {
        newOrder = destinationTasks[0].order - 1;
      } else {
        const beforeTask = destinationTasks[destinationIndex - 1];
        const afterTask = destinationTasks[destinationIndex];

        newOrder = (beforeTask.order + afterTask.order) / 2;
      }
    } else {
      newOrder = destinationTasks[destinationTasks.length - 1].order + 1;
    }

    await updateTaskOrder({
      taskId: task._id,
      newColumnId: destinationColumnId,
      newOrder,
    });
  };
  if (!board?._id) {
    return (
      <div
        className={`flex h-full flex-1 items-center justify-center transition-colors ${
          theme === "dark" ? "bg-slate-900" : "bg-slate-100"
        }`}
      >
        <div className="text-center">
          <h2
            className={`mb-2 text-2xl font-semibold transition-colors ${
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {t("board.welcome")}
          </h2>

          <p className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>
            {t("board.getStarted")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col transition-colors ${
        theme === "dark" ? "bg-slate-950" : "bg-slate-50"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-4 border-b p-6 transition-colors ${
          theme === "dark" ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <div className="min-w-0">
          <h1
            className={`break-words text-2xl font-bold transition-colors ${
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {board.name}
          </h1>

          {board.description && (
            <p
              className={`mt-1 max-w-2xl whitespace-pre-wrap break-words text-sm transition-colors ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {board.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {can("analytics.view") && (
            <button
              type="button"
              onClick={() => setShowAnalytics((value) => !value)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                theme === "dark"
                  ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
              }`}
            >
              {showAnalytics ? "Hide Analytics" : "Analytics"}
            </button>
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("board.searchTasks")}
            className={`w-56 rounded-md border px-3 py-2 text-sm outline-none transition ${
              theme === "dark"
                ? "border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-purple-500"
                : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-purple-500"
            }`}
          />
          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as
                  | "manual"
                  | "title"
                  | "deadline"
                  | "created"
                  | "storyPoints"
                  | "priority",
              )
            }
            className={`rounded-md border px-3 py-2 text-sm outline-none ${
              theme === "dark"
                ? "border-slate-700 bg-slate-900 text-slate-100"
                : "border-slate-300 bg-white text-slate-900"
            }`}
          >
            <option value="manual">{t("board.manualOrder")}</option>
            <option value="title">{t("board.sortTitle")}</option>
            <option value="deadline">{t("board.sortDeadline")}</option>
            <option value="created">{t("board.sortCreated")}</option>
            <option value="storyPoints">{t("board.sortStoryPoints")}</option>
            <option value="priority">{t("board.sortPriority")}</option>
          </select>

          <details className="relative">
            <summary
              className={`cursor-pointer list-none rounded-md border px-4 py-2 text-sm font-medium ${
                theme === "dark"
                  ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                  : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
              }`}
            >
              {t("board.filters", { defaultValue: "Filters" })}
            </summary>

            <div
              className={`absolute right-0 top-12 z-50 grid w-72 gap-3 rounded-lg border p-4 shadow-xl ${
                theme === "dark"
                  ? "border-slate-700 bg-slate-900"
                  : "border-slate-300 bg-white"
              }`}
            >
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as Id<"columns"> | "all")
                }
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="all">
                  {t("board.allStatuses", { defaultValue: "All statuses" })}
                </option>
                {columns.map((column) => (
                  <option key={column._id} value={column._id}>
                    {column.name}
                  </option>
                ))}
              </select>

              <select
                value={assigneeFilter}
                onChange={(event) =>
                  setAssigneeFilter(
                    event.target.value as Id<"users"> | "all" | "unassigned",
                  )
                }
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="all">
                  {t("board.allAssignees", {
                    defaultValue: "All assignees",
                  })}
                </option>
                <option value="unassigned">
                  {t("board.unassigned", { defaultValue: "Unassigned" })}
                </option>
                {projectMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name || member.email}
                  </option>
                ))}
              </select>

              <select
                value={storyPointsFilter}
                onChange={(event) =>
                  setStoryPointsFilter(
                    event.target.value as
                      "all" | "1" | "2" | "3" | "5" | "8" | "13" | "21",
                  )
                }
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="all">
                  {t("board.allStoryPoints", {
                    defaultValue: "All Story Points",
                  })}
                </option>
                {[1, 2, 3, 5, 8, 13, 21].map((points) => (
                  <option key={points} value={String(points)}>
                    {points} SP
                  </option>
                ))}
              </select>

              <select
                value={deadlineFilter}
                onChange={(event) =>
                  setDeadlineFilter(
                    event.target.value as
                      "all" | "overdue" | "today" | "upcoming" | "none",
                  )
                }
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="all">
                  {t("board.allDeadlines", {
                    defaultValue: "All deadlines",
                  })}
                </option>
                <option value="overdue">
                  {t("board.overdue", { defaultValue: "Overdue" })}
                </option>
                <option value="today">
                  {t("board.today", { defaultValue: "Today" })}
                </option>
                <option value="upcoming">
                  {t("board.upcoming", { defaultValue: "Upcoming" })}
                </option>
                <option value="none">
                  {t("board.noDeadline", { defaultValue: "No deadline" })}
                </option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value as "all" | "high" | "medium" | "low",
                  )
                }
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="all">{t("board.allPriorities")}</option>
                <option value="high">{t("priority.high")}</option>
                <option value="medium">{t("priority.medium")}</option>
                <option value="low">{t("priority.low")}</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setAssigneeFilter("all");
                  setStoryPointsFilter("all");
                  setDeadlineFilter("all");
                  setPriorityFilter("all");
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t("board.clearFilters", { defaultValue: "Clear filters" })}
              </button>
            </div>
          </details>
          {can("task.create") && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-full bg-purple-500 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-600"
            >
              <Plus className="size-4" />
              <span>{t("board.addTask")}</span>
            </button>
          )}

          <UserButton />
        </div>
      </div>

      {showAnalytics && analytics && can("analytics.view") && (
        <div
          className={`grid w-full min-w-0 grid-cols-2 gap-4 border-b p-6 md:grid-cols-4 ${
            theme === "dark" ? "border-slate-800" : "border-slate-200"
          }`}
        >
          <div
            className={`rounded-lg border p-4 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
          >
            <p
              className={`text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Total Tasks
            </p>

            <p className="mt-2 text-2xl font-bold">{analytics.total}</p>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
          >
            <p
              className={`text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Completed
            </p>

            <p className="mt-2 text-2xl font-bold">{analytics.completed}</p>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
          >
            <p
              className={`text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Active
            </p>

            <p className="mt-2 text-2xl font-bold">{analytics.active}</p>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
          >
            <p
              className={`text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Overdue
            </p>

            <p className="mt-2 text-2xl font-bold">{analytics.overdue}</p>
          </div>
        </div>
      )}
      {showAnalytics && analytics && can("analytics.view") && (
        <div className="grid w-full min-w-0 gap-6 px-6 pb-6 md:grid-cols-3">
          <div
            className={`rounded-lg border p-4 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
          >
            <h3 className="mb-4 text-lg font-semibold">Tasks by Status</h3>

            <div className="space-y-3">
              {analytics.byStatus.map(
                (status: {
                  columnId: Id<"columns">;
                  name: string;
                  count: number;
                }) => (
                  <div
                    key={status.columnId}
                    className="flex items-center justify-between"
                  >
                    <span
                      className={
                        theme === "dark" ? "text-slate-400" : "text-slate-600"
                      }
                    >
                      {status.name}
                    </span>

                    <span className="font-semibold">{status.count}</span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
          >
            <h3 className="mb-4 text-lg font-semibold">Tasks by Assignee</h3>

            <div className="space-y-3">
              {analytics.byAssignee.map(
                (assignee: {
                  assigneeId: Id<"users"> | null;
                  name: string;
                  count: number;
                }) => (
                  <div
                    key={assignee.assigneeId ?? "unassigned"}
                    className="flex items-center justify-between"
                  >
                    <span
                      className={
                        theme === "dark" ? "text-slate-400" : "text-slate-600"
                      }
                    >
                      {assignee.name}
                    </span>

                    <span className="font-semibold">{assignee.count}</span>
                  </div>
                ),
              )}
            </div>
          </div>
          <div
            className={`rounded-lg border p-4 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
          >
            <h3 className="mb-4 text-lg font-semibold">Tasks by Project</h3>

            <div className="flex items-center justify-between">
              <span
                className={
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }
              >
                {analytics.project.name}
              </span>

              <span className="font-semibold">
                {analytics.project.taskCount}
              </span>
            </div>
          </div>
        </div>
      )}
      {selectedTaskIds.length > 0 && (
        <div
          className={`mx-6 mb-2 flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
            theme === "dark"
              ? "border-slate-800 bg-slate-900"
              : "border-slate-200 bg-white"
          }`}
        >
          <span
            className={`text-sm font-semibold ${
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
          >
            Selected: {selectedTaskIds.length}
          </span>

          {canUpdateTask && (
            <>
              <select
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return;

                  void handleBulkStatusChange(event.target.value);
                  event.target.value = "";
                }}
                className={`rounded-md border px-3 py-2 text-sm ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="" disabled>
                  Status
                </option>

                {columns.map((column) => (
                  <option key={column._id} value={column._id}>
                    {column.name}
                  </option>
                ))}
              </select>

              <select
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return;

                  void handleBulkAssigneeChange(event.target.value);
                  event.target.value = "";
                }}
                className={`rounded-md border px-3 py-2 text-sm ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="" disabled>
                  Assignee
                </option>

                <option value="unassigned">Unassigned</option>

                {projectMembers.map((member: any) => (
                  <option key={member._id} value={member._id}>
                    {member.name || member.email}
                  </option>
                ))}
              </select>

              <select
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return;

                  void handleBulkPriorityChange(event.target.value);
                  event.target.value = "";
                }}
                className={`rounded-md border px-3 py-2 text-sm ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="" disabled>
                  Priority
                </option>

                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </>
          )}

          {can("task.delete") && (
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={clearTaskSelection}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              theme === "dark"
                ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Clear
          </button>
        </div>
      )}

      {/* Колонки */}

      <div className="flex-1 overflow-auto p-6">
        <div className="flex h-full min-w-max items-start space-x-6">
          <DndContext
            sensors={canUpdateTask ? sensors : []}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={visibleTasks.map((task) => task._id)}>
              {columns.map((column) => (
                <Column
                  key={column._id}
                  column={column}
                  taskCount={getTaskCount(column._id)}
                  tasks={getVisibleTasksByColumn(column._id)}
                  allTasks={tasks}
                  onTaskClick={setSelectedTask}
                  onEditColumn={setEditingColumn}
                  selectedTaskIds={selectedTaskIds}
                  onToggleTaskSelection={toggleTaskSelection}
                  favoriteTaskIdSet={favoriteTaskIdSet}
                  onToggleTaskFavorite={handleToggleTaskFavorite}
                  theme={theme}
                />
              ))}
            </SortableContext>

            {/* Кнопка новой колонки */}
            <div className="flex w-72 shrink-0 items-start justify-center pt-12">
              <button
                type="button"
                onClick={() => setIsCreateColumnModalOpen(true)}
                className={`flex min-h-[200px] w-full items-center justify-center space-x-2 rounded-lg border px-6 py-6 text-lg font-medium transition-colors ${
                  theme === "dark"
                    ? "border-slate-800 bg-slate-900 text-slate-400 hover:border-purple-500 hover:text-slate-100"
                    : "border-slate-200 bg-slate-100 text-slate-900 hover:border-purple-500"
                }`}
              >
                <Plus className="size-6" />

                {t("board.newColumn")}
              </button>
            </div>

            <DragOverlay>
              {activeTask ? (
                <TaskCard
                  task={activeTask}
                  isDragging={true}
                  onClick={() => {}}
                  theme={theme}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Модальное окно задачи */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          theme={theme}
          can={can}
        />
      )}

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        boardId={board._id}
        columns={columns}
        theme={theme}
      />

      <CreateColumnModal
        isOpen={isCreateColumnModalOpen}
        onClose={() => setIsCreateColumnModalOpen(false)}
        boardId={board._id}
        theme={theme}
      />

      {editingColumn && (
        <EditColumnModal
          column={editingColumn}
          onClose={() => setEditingColumn(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
