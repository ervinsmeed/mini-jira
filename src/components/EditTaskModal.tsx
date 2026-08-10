/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

import { GripVertical, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

import { toast } from "sonner";

type Theme = "light" | "dark";

type Subtask = {
  text: string;
  completed: boolean;
};

type SortableSubTaskProps = {
  subtask: Subtask;
  index: number;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
  theme: Theme;
};

type EditTaskModalProps = {
  task: Doc<"tasks">;
  onClose: () => void;
  theme: Theme;
};

function SortableSubTask({
  subtask,
  index,
  onRemove,
  onChange,
  theme,
}: SortableSubTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: `subtask-${index}`,
    });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center space-x-2"
    >
      <button
        type="button"
        {...listeners}
        className={`cursor-grab p-1 transition-colors ${
          theme === "dark"
            ? "text-slate-400 hover:text-slate-100"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        <GripVertical className="size-4" />
      </button>

      <input
        type="text"
        value={subtask.text}
        onChange={(event) => onChange(index, event.target.value)}
        placeholder="e.g Make coffee"
        className={`flex-1 rounded-md border px-3 py-2 transition focus:outline-none focus:ring-2 ${
          theme === "dark"
            ? "border-slate-800 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-purple-400"
            : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-purple-500"
        }`}
      />

      <button
        type="button"
        onClick={() => onRemove(index)}
        className={`p-2 transition-colors ${
          theme === "dark"
            ? "text-slate-400 hover:text-red-400"
            : "text-slate-500 hover:text-red-500"
        }`}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export default function EditTaskModal({
  task,
  onClose,
  theme,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority || "medium");

  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);

  const [columnId, setColumnId] = useState(task.columnId);

  const updateTask = useMutation(api.tasks.update);

  const columns: any[] =
    (useQuery(api.columns.list, {
      boardId: task.boardId,
    }) ?? []) as any[];

  /* При обновлении пропа task нужно обновлять локальный state полей формы.
     Правило ESLint иногда ругается на синхронный setState внутри эффекта — это ожидаемое поведение здесь
     потому что компонент представляет собой контролируемую форму. Отключаем правило для этого эффекта. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority ?? "medium");
    setColumnId(task.columnId);

    if (task.subtasks && task.subtasks.length > 0) {
      setSubtasks(task.subtasks);
    } else {
      setSubtasks([
        {
          text: "",
          completed: false,
        },
      ]);
    }
  }, [task]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddSubtask = () => {
    setSubtasks((currentSubtasks) => [
      ...currentSubtasks,
      {
        text: "",
        completed: false,
      },
    ]);
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks((currentSubtasks) => {
      const updatedSubtasks = currentSubtasks.filter(
        (_, currentIndex) => currentIndex !== index,
      );

      return updatedSubtasks.length > 0
        ? updatedSubtasks
        : [
            {
              text: "",
              completed: false,
            },
          ];
    });
  };

  const handleSubtaskChange = (index: number, value: string) => {
    setSubtasks((currentSubtasks) =>
      currentSubtasks.map((subtask, currentIndex) =>
        currentIndex === index
          ? {
              ...subtask,
              text: value,
            }
          : subtask,
      ),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = subtasks.findIndex(
      (_, index) => `subtask-${index}` === active.id,
    );

    const newIndex = subtasks.findIndex(
      (_, index) => `subtask-${index}` === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    setSubtasks((currentSubtasks) =>
      arrayMove(currentSubtasks, oldIndex, newIndex),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !columnId) return;

    const validSubtasks = subtasks
      .filter((subtask) => subtask.text.trim())
      .map((subtask) => ({
        text: subtask.text.trim(),
        completed: subtask.completed,
      }));

    await updateTask({
      id: task._id,
      title: title.trim(),
      description: description.trim(),
      priority,
      subtasks: validSubtasks,
      columnId,
    });

    onClose();
    toast.success("Task updated");
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className={`max-h-[600px] max-w-lg overflow-auto rounded-xl border shadow-lg transition-colors ${
          theme === "dark"
            ? "border-slate-800 bg-slate-950 text-slate-100"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-6">
          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g Take coffee break"
              className={`w-full rounded-md border px-3 py-2 transition focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-purple-400"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-purple-500"
              }`}
              required
            />
          </div>

          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Enter task description"
              rows={4}
              className={`w-full resize-none rounded-md border px-3 py-2 transition focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-purple-400"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-purple-500"
              }`}
            />
          </div>

          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Subtasks
            </label>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-3">
                <SortableContext
                  items={subtasks.map((_, index) => `subtask-${index}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {subtasks.map((subtask, index) => (
                    <SortableSubTask
                      key={`subtask-${index}`}
                      subtask={subtask}
                      index={index}
                      onRemove={handleRemoveSubtask}
                      onChange={handleSubtaskChange}
                      theme={theme}
                    />
                  ))}
                </SortableContext>

                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className={`w-full rounded-md border-2 border-dashed py-2 font-medium transition ${
                    theme === "dark"
                      ? "border-slate-800 text-purple-400 hover:bg-slate-900"
                      : "border-slate-300 text-purple-600 hover:bg-slate-100"
                  }`}
                >
                  + Add New Subtask
                </button>
              </div>
            </DndContext>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className={`mb-2 block text-sm font-medium ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Priority
              </label>

              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger
                  className={`w-full transition-colors ${
                    theme === "dark"
                      ? "border-slate-800 bg-slate-900 text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>

                <SelectContent
                  className={`transition-colors ${
                    theme === "dark"
                      ? "border-slate-800 bg-slate-900 text-slate-100"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <SelectItem value="high">
                    <div className="flex items-center space-x-2">
                      <div className="size-2 rounded-full bg-red-500" />
                      <span>High</span>
                    </div>
                  </SelectItem>

                  <SelectItem value="medium">
                    <div className="flex items-center space-x-2">
                      <div className="size-2 rounded-full bg-yellow-500" />
                      <span>Medium</span>
                    </div>
                  </SelectItem>

                  <SelectItem value="low">
                    <div className="flex items-center space-x-2">
                      <div className="size-2 rounded-full bg-green-500" />
                      <span>Low</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                className={`mb-2 block text-sm font-medium ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Column
              </label>

              <Select
                value={columnId}
                onValueChange={(value) => setColumnId(value as Id<"columns">)}
              >
                <SelectTrigger
                  className={`w-full transition-colors ${
                    theme === "dark"
                      ? "border-slate-800 bg-slate-900 text-slate-100"
                      : "border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>

                <SelectContent
                  className={`transition-colors ${
                    theme === "dark"
                      ? "border-slate-800 bg-slate-900 text-slate-100"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  {columns.map((column) => (
                    <SelectItem key={column._id} value={column._id}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 rounded-lg border py-2 transition-colors ${
                theme === "dark"
                  ? "border-slate-700 text-slate-300 hover:bg-slate-900"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 rounded-lg bg-purple-600 py-2 text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Update Task
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
