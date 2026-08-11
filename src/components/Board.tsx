/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const { t } = useTranslation();

  /*
   * Важно: проверяем именно board?._id.
   * Если доска ещё не выбрана, Convex-запрос пропускается.
   */
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

  const getTaskCount = (columnId: Id<"columns">) => {
    return getTasksByColumn(columnId).length;
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
            <SortableContext items={tasks.map((task) => task._id)}>
              {columns.map((column) => (
                <Column
                  key={column._id}
                  column={column}
                  taskCount={getTaskCount(column._id)}
                  tasks={getTasksByColumn(column._id)}
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
