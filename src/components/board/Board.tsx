import QueryBoundary from "../ui/QueryBoundary";

import { useAction } from "../../hooks/useAction";
import { useTaskPages } from "../../hooks/useTaskPages";
import { useNow } from "../../hooks/useNow";

import { useMemo, useState } from "react";

import RecentTasksMenu from "./RecentTasksMenu";
import { Plus } from "lucide-react";

import BoardBulkActions from "./BoardBulkActions";
import BoardFilters from "./BoardFilters";
import SelectField from "../ui/SelectField";
import { useMutation, useQuery, usePaginatedQuery } from "convex/react";

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
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { UserButton } from "@clerk/clerk-react";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

import Column from "./Column";
import TaskCard from "./TaskCard";

import TaskModal from "../modals/TaskModal";
import CreateTaskModal from "../modals/CreateTaskModal";
import CreateColumnModal from "../modals/CreateColumnModal";
import EditColumnModal from "../modals/EditColumnModal";

type BoardProps = {
  board: Doc<"boards"> | null;
  theme: "light" | "dark";
  can: (permission: string) => boolean;
};

function BoardContent({ board, theme, can }: BoardProps) {
  const [selectedTask, setSelectedTask] = useState<Doc<"tasks"> | null>(null);
  const { t } = useTranslation();
  const { pending, run } = useAction();
  const canUpdateTask = can("task.update");
  const canDeleteTask = can("task.delete");
  const canSelectTasks = canUpdateTask || canDeleteTask;
  const currentUser = useQuery(api.users.getCurrent, board ? {} : "skip");
  const workspaceAccess = useQuery(
    api.workspaceMembers.getCurrentAccess,
    board?.workspaceId ? { workspaceId: board.workspaceId } : "skip",
  );
  const canCreateColumn = Boolean(
    currentUser &&
    (!board?.workspaceId || workspaceAccess) &&
    (workspaceAccess?.isOwner || board?.userId === currentUser._id),
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isCreateColumnModalOpen, setIsCreateColumnModalOpen] = useState(false);

  const [editingColumn, setEditingColumn] = useState<Doc<"columns"> | null>(
    null,
  );
  const [activeTask, setActiveTask] = useState<Doc<"tasks"> | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Id<"tasks">[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
  const todayDate = new Date();
  const today = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate(),
  ).getTime();
  const tomorrow = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate() + 1,
  ).getTime();

  const now = useNow();

  const {
    results: tasksResult,
    status: pageStatus,
    loadMore,
  } = useTaskPages(
    board
      ? {
          boardId: board._id,
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
        }
      : "skip",
    BOARD_TASK_LIMIT,
  );

  const columnsResult = useQuery(
    api.columns.list,
    board?._id
      ? {
          boardId: board._id,
        }
      : "skip",
  );

  const toggleTaskFavorite = useMutation(api.favorites.toggleTask);
  const recordRecentTaskView = useMutation(api.recentTasks.recordView);
  const {
    results: projectMembers,
    status: memberStatus,
    loadMore: loadMembers,
  } = usePaginatedQuery(
    api.boardMembers.projectMembersPage,
    board ? { boardId: board._id } : "skip",
    { initialNumItems: 30 },
  );

  const tasks = tasksResult;
  const columns: Doc<"columns">[] = columnsResult ?? [];

  const favoriteTaskIdSet = useMemo(
    () =>
      new Set(tasks.filter((task) => task.isFavorite).map((task) => task._id)),
    [tasks],
  );

  const taskById = useMemo(() => {
    const map = new Map<Id<"tasks">, Doc<"tasks">>();
    for (const task of tasks) map.set(task._id, task);
    return map;
  }, [tasks]);

  const tasksByColumn = useMemo(() => {
    const map = new Map<Id<"columns">, Doc<"tasks">[]>();
    for (const task of tasks) {
      const list = map.get(task.columnId);
      if (list) {
        list.push(task);
      } else {
        map.set(task.columnId, [task]);
      }
    }
    if (sortBy === "manual") {
      for (const list of map.values()) {
        list.sort((a, b) => a.order - b.order);
      }
    }
    return map;
  }, [tasks, sortBy]);

  const canReorder = canUpdateTask && sortBy === "manual";

  const updateTaskOrder = useMutation(api.tasks.updateOrder);
  const bulkUpdateTasks = useMutation(api.tasks.bulkUpdate);
  const bulkRemoveTasks = useMutation(api.tasks.bulkRemove);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getTasksByColumn = (columnId: Id<"columns">) =>
    tasksByColumn.get(columnId) ?? [];

  const toggleTaskSelection = (taskId: Id<"tasks">) => {
    if (!canSelectTasks) return;
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
    await run(async () => {
      if (!canUpdateTask || selectedTaskIds.length === 0) return;

      await bulkUpdateTasks({
        taskIds: selectedTaskIds,
        columnId: value as Id<"columns">,
      });

      clearTaskSelection();
    });
  };

  const handleBulkAssigneeChange = async (value: string) => {
    await run(async () => {
      if (!canUpdateTask || selectedTaskIds.length === 0) return;

      await bulkUpdateTasks({
        taskIds: selectedTaskIds,
        assigneeId: value === "unassigned" ? null : (value as Id<"users">),
      });

      clearTaskSelection();
    });
  };
  const handleBulkPriorityChange = async (value: string) => {
    await run(async () => {
      if (!canUpdateTask || selectedTaskIds.length === 0) return;

      const taskIds = [...selectedTaskIds];

      clearTaskSelection();

      await bulkUpdateTasks({
        taskIds,
        priority: value,
      });
    });
  };
  const handleBulkDelete = async () => {
    await run(async () => {
      if (!canDeleteTask || selectedTaskIds.length === 0) return;

      const confirmed = window.confirm(
        t("board.deleteQuestion", { count: selectedTaskIds.length }),
      );

      if (!confirmed) return;

      await bulkRemoveTasks({
        taskIds: selectedTaskIds,
      });

      clearTaskSelection();
    });
  };
  const handleToggleTaskFavorite = async (taskId: Id<"tasks">) => {
    await run(async () => {
      await toggleTaskFavorite({
        taskId,
      });
    });
  };
  const handleTaskClick = (task: Doc<"tasks">) => {
    setSelectedTask(task);
    recordRecentTaskView({ taskId: task._id }).catch(() => {});
  };
  const handleDragStart = (event: DragStartEvent) => {
    if (!canUpdateTask) {
      return;
    }

    const task = tasks.find((item) => item._id === event.active.id);

    setActiveTask(task ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    await run(async () => {
      const { active, over } = event;

      setActiveTask(null);

      if (!canUpdateTask) {
        return;
      }

      if (!over || over.id === active.id) return;

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
        beforeTaskId: destinationTask?._id,
        append: !destinationTask,
      });
    });
  };
  if (!board?._id) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-background transition-colors">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold text-foreground transition-colors">
            {t("board.welcome")}
          </h2>

          <p className="text-muted-foreground">{t("board.getStarted")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-sidebar p-6 transition-colors">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-foreground transition-colors">
            {board.name}
          </h1>
          {board.description && (
            <p className="mt-1 max-w-2xl whitespace-pre-wrap break-words text-sm text-muted-foreground transition-colors">
              {board.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {memberStatus === "CanLoadMore" && (
            <button type="button" onClick={() => loadMembers(30)}>
              {t("members.loadMore")}
            </button>
          )}
          <RecentTasksMenu onTaskClick={handleTaskClick} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("board.searchTasks")}
            className="w-56 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
          <SelectField
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
            data={[
              { label: t("board.manualOrder"), value: "manual" },
              { label: t("board.sortTitle"), value: "title" },
              { label: t("board.sortDeadline"), value: "deadline" },
              { label: t("board.sortCreated"), value: "created" },
              { label: t("board.sortStoryPoints"), value: "storyPoints" },
              { label: t("board.sortPriority"), value: "priority" },
            ]}
          />

          <BoardFilters
            pending={pending}
            columns={columns}
            projectMembers={projectMembers}
            statusFilter={statusFilter}
            assigneeFilter={assigneeFilter}
            storyPointsFilter={storyPointsFilter}
            deadlineFilter={deadlineFilter}
            priorityFilter={priorityFilter}
            setStatusFilter={setStatusFilter}
            setAssigneeFilter={setAssigneeFilter}
            setStoryPointsFilter={setStoryPointsFilter}
            setDeadlineFilter={setDeadlineFilter}
            setPriorityFilter={setPriorityFilter}
          />
          {can("task.create") && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              disabled={pending}
            >
              <Plus className="size-4" />
              <span>{t("board.addTask")}</span>
            </button>
          )}

          <UserButton />
        </div>
      </div>
      {canSelectTasks && selectedTaskIds.length > 0 && (
        <BoardBulkActions
          selectedCount={selectedTaskIds.length}
          pending={pending}
          canUpdateTask={canUpdateTask}
          canDeleteTask={canDeleteTask}
          columns={columns}
          projectMembers={projectMembers}
          onStatusChange={handleBulkStatusChange}
          onAssigneeChange={handleBulkAssigneeChange}
          onPriorityChange={handleBulkPriorityChange}
          onDelete={handleBulkDelete}
          onClearSelection={clearTaskSelection}
        />
      )}

      {pageStatus === "LoadingFirstPage" && (
        <p role="status" className="px-6">
          {t("pagination.loading")}
        </p>
      )}
      {pageStatus === "Exhausted" && tasks.length === 0 && (
        <p role="status" className="px-6">
          {t("board.noMatchingTasks")}
        </p>
      )}
      {(pageStatus === "CanLoadMore" || pageStatus === "LoadingMore") && (
        <p role="status" className="px-6">
          {t(
            tasks.length === 0 || pageStatus === "LoadingMore"
              ? "pagination.searching"
              : "pagination.scanning",
          )}
        </p>
      )}

      <div className="flex-1 overflow-auto p-6">
        <div className="flex h-full min-w-max items-start space-x-6">
          <DndContext
            key={canReorder ? "dnd-enabled" : "dnd-disabled"}
            sensors={canReorder ? sensors : []}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
              {columns.map((column) => (
                <Column
                  key={column._id}
                  column={column}
                  tasks={getTasksByColumn(column._id)}
                  taskById={taskById}
                  now={now}
                  onTaskClick={handleTaskClick}
                  onEditColumn={setEditingColumn}
                  canEditColumn={canCreateColumn}
                  canDeleteColumn={canCreateColumn}
                  canDragTasks={canReorder}
                  selectedTaskIds={selectedTaskIds}
                  onToggleTaskSelection={
                    canSelectTasks ? toggleTaskSelection : undefined
                  }
                  favoriteTaskIdSet={favoriteTaskIdSet}
                  onToggleTaskFavorite={handleToggleTaskFavorite}
                />
              ))}
            {canCreateColumn && (
              <div className="flex w-72 shrink-0 items-start justify-center pt-12">
                <button
                  type="button"
                  onClick={() => setIsCreateColumnModalOpen(true)}
                  className="flex min-h-[200px] w-full items-center justify-center space-x-2 rounded-lg border border-border bg-card px-6 py-6 text-lg font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  disabled={pending}
                >
                  <Plus className="size-6" />

                  {t("board.newColumn")}
                </button>
              </div>
            )}

            <DragOverlay>
              {activeTask ? (
                <TaskCard
                  task={activeTask}
                  now={now}
                  isDragging={true}
                  isOverlay
                  onClick={() => {}}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {(pageStatus === "CanLoadMore" || pageStatus === "LoadingMore") && (
          <div className="sticky left-0 mt-4 flex w-full justify-center">
            <button
              type="button"
              disabled={pending || pageStatus === "LoadingMore"}
              onClick={() => loadMore(12)}
              className="rounded-md border border-border bg-card px-5 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t(
                pageStatus === "LoadingMore"
                  ? "pagination.searching"
                  : "pagination.continueSearch",
              )}
            </button>
          </div>
        )}
      </div>
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
      />

      <CreateColumnModal
        isOpen={isCreateColumnModalOpen}
        onClose={() => setIsCreateColumnModalOpen(false)}
        boardId={board._id}
      />

      {editingColumn && (
        <EditColumnModal
          column={editingColumn}
          onClose={() => setEditingColumn(null)}
        />
      )}
    </div>
  );
}

const BOARD_TASK_LIMIT = 200;

export default function Board(props: BoardProps) {
  const { t } = useTranslation();
  return (
    <QueryBoundary
      key={props.board?._id ?? "none"}
      message={t("common.actionError")}
      retry={t("common.retry")}
    >
      <BoardContent {...props} />
    </QueryBoundary>
  );
}
