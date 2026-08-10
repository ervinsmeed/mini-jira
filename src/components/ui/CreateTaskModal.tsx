import { useState, useEffect, type CSSProperties, type FormEvent } from "react";
import { X, GripVertical } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./Dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

import { toast } from "sonner";

type Theme = "dark" | "light";

interface SortableSubTaskProps {
  subtask: string;
  index: number;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
  theme: Theme;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: Id<"boards">;
  columns?: Doc<"columns">[];
  theme?: Theme;
}

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
      <div
        {...listeners}
        className={`p-1 cursor-grab transition-colors ${
          theme === "dark"
            ? "text-slate-400 hover:text-slate-100"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        <GripVertical className="size-4" />
      </div>

      <input
        type="text"
        value={subtask}
        onChange={(e) => onChange(index, e.target.value)}
        placeholder="e.g Make coffee"
        className={`flex-1 px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition ${
          theme === "dark"
            ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:ring-purple-400"
            : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-purple-500"
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

export default function CreateTaskModal({
  isOpen,
  onClose,
  boardId,
  columns = [],
  theme = "dark",
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [subtasks, setSubtasks] = useState(["", ""]);
  const [columnId, setColumnId] = useState<Id<"columns"> | "">("");

  const createTask = useMutation(api.tasks.create);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const getDefaultColumns = () => {
      const firstColumn = columns[0];

      if (firstColumn && !columnId) {
        setColumnId(firstColumn._id);
      }
    };

    getDefaultColumns();
  }, [columns, columnId]);

  const handleAddSubtask = () => {
    setSubtasks([...subtasks, ""]);
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubtaskChange = (index: number, value: string) => {
    const updated = subtasks.map((subtask, i) =>
      i === index ? value : subtask,
    );

    setSubtasks(updated);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = subtasks.findIndex((_, i) => `subtask-${i}` === active.id);

    const newIndex = subtasks.findIndex((_, i) => `subtask-${i}` === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    setSubtasks(arrayMove(subtasks, oldIndex, newIndex));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim() || !columnId) {
      return;
    }

    const validSubtasks = subtasks
      .filter((subtask) => subtask.trim())
      .map((text) => ({
        text: text.trim(),
        completed: false,
      }));

    await createTask({
      title: title.trim(),
      description: description.trim(),
      priority,
      subtasks: validSubtasks,
      columnId,
      boardId,
    });

    setTitle("");
    setDescription("");
    setPriority("medium");
    setSubtasks(["", ""]);
    setColumnId(columns[0]?._id ?? "");

    onClose();

    toast.success("New task added");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg max-h-[600px] overflow-auto rounded-xl border shadow-lg transition-colors ${
          theme === "dark"
            ? "bg-slate-950 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-lg! font-semibold">
            Add New Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g Take coffee break"
              className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:ring-purple-400"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-purple-500"
              }`}
              required
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g It 's always good to take a break."
              rows={4}
              className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition resize-none ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:ring-purple-400"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-purple-500"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
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
                  items={subtasks.map((_, i) => `subtask-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {subtasks.map((subtask, index) => (
                    <SortableSubTask
                      key={index}
                      subtask={subtask}
                      index={index}
                      onRemove={handleRemoveSubtask}
                      onChange={handleSubtaskChange}
                      theme={theme}
                    />
                  ))}
                </SortableContext>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className={`w-full py-2 border-2 border-dashed rounded-md font-medium transition ${
                      theme === "dark"
                        ? "border-slate-800 text-purple-400 hover:bg-slate-900"
                        : "border-slate-300 text-purple-600 hover:bg-slate-500"
                    }`}
                  >
                    + Add New Subtask
                  </button>
                </div>
              </div>
            </DndContext>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Priority
              </label>

              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger
                  className={`w-full transition-colors ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-800 text-slate-100"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  <SelectValue
                    placeholder="Select priority"
                    className="w-full"
                  />
                </SelectTrigger>

                <SelectContent
                  className={`transition-colors ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-800 text-slate-100"
                      : "bg-white border-slate-200 text-slate-900"
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
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Column
              </label>

              <Select
                onValueChange={(value) => setColumnId(value as Id<"columns">)}
              >
                <SelectTrigger
                  className={`w-full transition-colors ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-800 text-slate-100"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  <SelectValue placeholder="Select column" className="w-full" />
                </SelectTrigger>

                <SelectContent
                  className={`transition-colors ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-800 text-slate-100"
                      : "bg-white border-slate-200 text-slate-900"
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

          <button
            type="submit"
            className={`w-full py-2 rounded-lg transition focus:outline-none focus:ring-2 ${
              theme === "dark"
                ? "bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-400"
                : "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500"
            }`}
          >
            Create Task
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
