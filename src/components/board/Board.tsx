import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, usePaginatedQuery } from "convex/react";
import { closestCenter, DndContext, DragOverlay } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

import { useAction } from "../../hooks/useAction";
import { useBoardDnd } from "../../hooks/useBoardDnd";
import { useBoardFilters } from "../../hooks/useBoardFilters";
import { useNow } from "../../hooks/useNow";
import { useTaskPages } from "../../hooks/useTaskPages";

import QueryBoundary from "../ui/QueryBoundary";
import CreateColumnModal from "../modals/CreateColumnModal";
import CreateTaskModal from "../modals/CreateTaskModal";
import EditColumnModal from "../modals/EditColumnModal";
import TaskModal from "../modals/TaskModal";

import BoardBulkActions from "./BoardBulkActions";
import BoardHeader from "./BoardHeader";
import BoardSkeleton from "./BoardSkeleton";
import Column from "./Column";
import TaskCard from "./TaskCard";
type BoardProps = {
  board: Doc<"boards"> | null;
  can: (permission: string) => boolean;
};
function BoardContent({ board, can }: BoardProps) {
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

  const [selectedTaskIds, setSelectedTaskIds] = useState<Id<"tasks">[]>([]);
  const filters = useBoardFilters();
  const { sortBy, taskQuery } = filters;

  const now = useNow();
  const {
    results: tasksResult,
    status: pageStatus,
    loadMore,
  } = useTaskPages(
    board ? { boardId: board._id, ...taskQuery } : "skip",
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
  const isBoardLoading =
    columnsResult === undefined || pageStatus === "LoadingFirstPage";
  const { sensors, activeTask, handleDragStart, handleDragEnd } = useBoardDnd({
    tasks,
    columns,
    tasksByColumn,
    canUpdateTask,
    run,
  });
  const bulkUpdateTasks = useMutation(api.tasks.bulkUpdate);
  const bulkRemoveTasks = useMutation(api.tasks.bulkRemove);

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
  if (!board?._id) {
    return (
      <div className="flex h-full flex-1 items-center justify-center transition-colors">
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
    <div className="flex min-w-0 flex-1 flex-col transition-colors">
      <BoardHeader
        board={board}
        filters={filters}
        columns={columns}
        projectMembers={projectMembers}
        pending={pending}
        canLoadMoreMembers={memberStatus === "CanLoadMore"}
        onLoadMoreMembers={() => loadMembers(30)}
        canCreateTask={can("task.create")}
        onCreateTask={() => setIsCreateModalOpen(true)}
        onTaskClick={handleTaskClick}
      />
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
        <div
          className="flex h-full min-w-max items-start space-x-6"
          aria-busy={isBoardLoading}
        >
          {isBoardLoading ? (
            <BoardSkeleton />
          ) : (
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
          )}
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
