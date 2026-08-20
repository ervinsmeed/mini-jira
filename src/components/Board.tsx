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
};

export default function Board({ board, theme }: BoardProps) {
  const [selectedTask, setSelectedTask] = useState<Doc<"tasks"> | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isCreateColumnModalOpen, setIsCreateColumnModalOpen] = useState(false);

  const [editingColumn, setEditingColumn] = useState<Doc<"columns"> | null>(
    null,
  );

  const [activeTask, setActiveTask] = useState<Doc<"tasks"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");

  const [sortBy, setSortBy] = useState<
    "manual" | "deadline" | "storyPoints" | "priority"
  >("manual");
  const { t } = useTranslation();

  const tasksResult = useQuery(
    api.tasks.list,
    board?._id
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

  const tasks: any[] = (tasksResult ?? []) as any[];
  const columns: any[] = (columnsResult ?? []) as any[];
  const visibleTasks = tasks
    .filter((task) => {
      const search = searchQuery.trim().toLowerCase();

      if (!search) {
        return true;
      }

      return (
        task.title.toLowerCase().includes(search) ||
        (task.description ?? "").toLowerCase().includes(search)
      );
    })
    .filter((task) => {
      if (priorityFilter === "all") {
        return true;
      }

      return task.priority === priorityFilter;
    })
    .sort((firstTask, secondTask) => {
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
      className={`flex min-w-full flex-1 flex-col transition-colors ${
        theme === "dark" ? "bg-slate-950" : "bg-slate-50"
      }`}
    >
      <div
        className={`flex items-center justify-between border-b p-6 transition-colors ${
          theme === "dark" ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <h1
          className={`text-2xl font-bold transition-colors ${
            theme === "dark" ? "text-slate-100" : "text-slate-900"
          }`}
        >
          {board.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
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
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(
                event.target.value as "all" | "high" | "medium" | "low",
              )
            }
            className={`rounded-md border px-3 py-2 text-sm outline-none ${
              theme === "dark"
                ? "border-slate-700 bg-slate-900 text-slate-100"
                : "border-slate-300 bg-white text-slate-900"
            }`}
          >
            <option value="all">{t("board.allPriorities")}</option>
            <option value="high">{t("priority.high")}</option>
            <option value="medium">{t("priority.medium")}</option>
            <option value="low">{t("priority.low")}</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as
                  "manual" | "deadline" | "storyPoints" | "priority",
              )
            }
            className={`rounded-md border px-3 py-2 text-sm outline-none ${
              theme === "dark"
                ? "border-slate-700 bg-slate-900 text-slate-100"
                : "border-slate-300 bg-white text-slate-900"
            }`}
          >
            <option value="manual">{t("board.manualOrder")}</option>
            <option value="deadline">{t("board.sortDeadline")}</option>
            <option value="storyPoints">{t("board.sortStoryPoints")}</option>
            <option value="priority">{t("board.sortPriority")}</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 rounded-full bg-purple-500 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-600"
          >
            <Plus className="size-4" />

            <span>{t("board.addTask")}</span>
          </button>

          <UserButton />
        </div>
      </div>

      {/* Колонки */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex h-full min-w-max items-start space-x-6">
          <DndContext
            sensors={sensors}
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
                  onTaskClick={setSelectedTask}
                  onEditColumn={setEditingColumn}
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
