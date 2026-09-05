import { useState, useEffect, type CSSProperties, type FormEvent } from "react";
import { X, GripVertical } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useTranslation } from "react-i18next";

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
type Priority = "high" | "medium" | "low";
type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 | 21;

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
  const { t } = useTranslation();

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
        placeholder={t("createTask.subtaskPlaceholder")}
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
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assigneeId, setAssigneeId] = useState<Id<"users"> | "">("");
  const [taskType, setTaskType] = useState<"epic" | "task">("task");
  const [epicId, setEpicId] = useState<Id<"tasks"> | "">("");

  const [storyPoints, setStoryPoints] = useState<StoryPoints>(1);
  const [deadline, setDeadline] = useState("");

  const [subtasks, setSubtasks] = useState(["", ""]);
  const [columnId, setColumnId] = useState<Id<"columns"> | "">("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    Id<"taskTemplates"> | ""
  >("");

  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const createTask = useMutation(api.tasks.create);
  const createTemplate = useMutation(api.taskTemplates.create);
  const removeTemplate = useMutation(api.taskTemplates.remove);

  const taskTemplates: Doc<"taskTemplates">[] =
    useQuery(api.taskTemplates.list, { boardId }) ?? [];
  const projectMembers = useQuery(api.boardMembers.list, { boardId }) ?? [];
  const projectTasks: Doc<"tasks">[] =
    useQuery(api.tasks.list, { boardId }) ?? [];

  const epics = projectTasks.filter((task) => task.taskType === "epic");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const firstColumn = columns[0];

    const columnExists = columns.some((column) => column._id === columnId);

    if (firstColumn && (!columnId || !columnExists)) {
      setColumnId(firstColumn._id);
    }
  }, [columns, columnId]);
  const handleTemplateSelect = (templateId: string) => {
    if (templateId === "none") {
      setSelectedTemplateId("");
      return;
    }

    const template = taskTemplates.find(
      (currentTemplate) => currentTemplate._id === templateId,
    );

    if (!template) return;

    setSelectedTemplateId(template._id);
    setTitle(template.title ?? "");
    setDescription(template.description ?? "");
    setPriority(template.priority ?? "medium");
    setStoryPoints(template.storyPoints ?? 1);
  };

  const handleSaveTemplate = async () => {
    const trimmedTemplateName = templateName.trim();

    if (!trimmedTemplateName) {
      toast.error(
        t("createTask.templateNameRequired", {
          defaultValue: "Enter a template name",
        }),
      );

      return;
    }

    setIsSavingTemplate(true);

    try {
      const createdTemplate = await createTemplate({
        boardId,
        name: trimmedTemplateName,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        priority,
        storyPoints,
      });

      setTemplateName("");

      if (createdTemplate) {
        setSelectedTemplateId(createdTemplate._id);
      }

      toast.success(
        t("createTask.templateCreated", {
          defaultValue: "Template created",
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("createTask.templateCreateError", {
              defaultValue: "Failed to create template",
            }),
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;

    const confirmed = window.confirm(
      t("createTask.deleteTemplateQuestion", {
        defaultValue: "Delete selected template?",
      }),
    );

    if (!confirmed) return;

    try {
      await removeTemplate({
        id: selectedTemplateId,
      });

      setSelectedTemplateId("");

      toast.success(
        t("createTask.templateDeleted", {
          defaultValue: "Template deleted",
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("createTask.templateDeleteError", {
              defaultValue: "Failed to delete template",
            }),
      );
    }
  };
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
      assigneeId: assigneeId || undefined,
      taskType,
      epicId: taskType === "task" ? epicId || undefined : undefined,
      storyPoints,
      deadline: deadline
        ? new Date(`${deadline}T23:59:59`).getTime()
        : undefined,
      subtasks: validSubtasks,
      columnId,
      boardId,
    });

    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssigneeId("");
    setTaskType("task");
    setEpicId("");
    setStoryPoints(1);
    setDeadline("");
    setSubtasks(["", ""]);
    setColumnId(columns[0]?._id ?? "");

    onClose();

    toast.success(t("createTask.created"));
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
            {t("createTask.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          <div
            className={`rounded-lg border p-4 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-900/50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("createTask.template", {
                defaultValue: "Task template",
              })}
            </label>

            <div className="flex gap-2">
              <select
                value={selectedTemplateId || "none"}
                onChange={(event) => handleTemplateSelect(event.target.value)}
                className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              >
                <option value="none">
                  {t("createTask.noTemplate", {
                    defaultValue: "Without template",
                  })}
                </option>

                {taskTemplates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleDeleteTemplate}
                disabled={!selectedTemplateId}
                className={`rounded-md border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  theme === "dark"
                    ? "border-red-900 text-red-400 hover:bg-red-950"
                    : "border-red-200 text-red-600 hover:bg-red-50"
                }`}
              >
                {t("createTask.deleteTemplate", {
                  defaultValue: "Delete",
                })}
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder={t("createTask.templateNamePlaceholder", {
                  defaultValue: "Template name, e.g. Bug",
                })}
                className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:ring-purple-400"
                    : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-purple-500"
                }`}
              />

              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate}
                className="rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingTemplate
                  ? t("createTask.savingTemplate", {
                      defaultValue: "Saving...",
                    })
                  : t("createTask.saveTemplate", {
                      defaultValue: "Save template",
                    })}
              </button>
            </div>

            <p
              className={`mt-2 text-xs ${
                theme === "dark" ? "text-slate-500" : "text-slate-500"
              }`}
            >
              {t("createTask.templateHint", {
                defaultValue:
                  "The template saves the current title, description, priority and Story Points.",
              })}
            </p>
          </div>
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("createTask.taskTitle")}
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("createTask.titlePlaceholder")}
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
              {t("createTask.description")}
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("createTask.descriptionPlaceholder")}
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
              Type
            </label>

            <Select
              value={taskType}
              onValueChange={(value) => {
                const newType = value as "epic" | "task";

                setTaskType(newType);

                if (newType === "epic") {
                  setEpicId("");
                }
              }}
            >
              <SelectTrigger
                className={`w-full transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-slate-100"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>

              <SelectContent
                className={`transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {taskType === "task" && (
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Epic
              </label>

              <Select
                value={epicId || "none"}
                onValueChange={(value) =>
                  setEpicId(value === "none" ? "" : (value as Id<"tasks">))
                }
              >
                <SelectTrigger
                  className={`w-full transition-colors ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-800 text-slate-100"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  <SelectValue placeholder="Select Epic" />
                </SelectTrigger>

                <SelectContent
                  className={`transition-colors ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-800 text-slate-100"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <SelectItem value="none">No Epic</SelectItem>

                  {epics.map((epic) => (
                    <SelectItem key={epic._id} value={epic._id}>
                      {epic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("createTask.subtasks")}
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
                        : "border-slate-300 text-purple-600 hover:bg-slate-100"
                    }`}
                  >
                    + {t("createTask.addSubtask")}
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
                {t("createTask.priority")}
              </label>

              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as Priority)}
              >
                <SelectTrigger
                  className={`w-full transition-colors ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-800 text-slate-100"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  <SelectValue
                    placeholder={t("createTask.selectPriority")}
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
                      <span>{t("priority.high")}</span>
                    </div>
                  </SelectItem>

                  <SelectItem value="medium">
                    <div className="flex items-center space-x-2">
                      <div className="size-2 rounded-full bg-yellow-500" />
                      <span>{t("priority.medium")}</span>
                    </div>
                  </SelectItem>

                  <SelectItem value="low">
                    <div className="flex items-center space-x-2">
                      <div className="size-2 rounded-full bg-green-500" />
                      <span>{t("priority.low")}</span>
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
                {t("createTask.column")}
              </label>
              <Select
                value={columnId}
                onValueChange={(value) => setColumnId(value as Id<"columns">)}
              >
                <SelectTrigger
                  className={`w-full transition-colors ${
                    theme === "dark"
                      ? "bg-slate-900 border-slate-800 text-slate-100"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  <SelectValue
                    placeholder={t("createTask.selectColumn")}
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
                  {columns.map((column) => (
                    <SelectItem key={column._id} value={column._id}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Assignee
            </label>

            <Select
              value={assigneeId || "unassigned"}
              onValueChange={(value) =>
                setAssigneeId(
                  value === "unassigned" ? "" : (value as Id<"users">),
                )
              }
            >
              <SelectTrigger
                className={`w-full transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-slate-100"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              >
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>

              <SelectContent
                className={`transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                <SelectItem value="unassigned">Unassigned</SelectItem>

                {projectMembers.map(
                  (
                    member: Doc<"users"> & {
                      membershipId: Id<"boardMembers"> | null;
                      joinedAt: number;
                      isOwner: boolean;
                    },
                  ) => (
                    <SelectItem key={member._id} value={member._id}>
                      {member.name || member.email}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* STORY POINTS */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("createTask.storyPoints")}
            </label>

            <Select
              value={storyPoints.toString()}
              onValueChange={(value) =>
                setStoryPoints(Number(value) as StoryPoints)
              }
            >
              <SelectTrigger
                className={`w-full transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-slate-100"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              >
                <SelectValue placeholder={t("createTask.selectStoryPoints")} />
              </SelectTrigger>

              <SelectContent
                className={`transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                {[1, 2, 3, 5, 8, 13, 21].map((points) => (
                  <SelectItem key={points} value={points.toString()}>
                    {points} SP
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DEADLINE */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("createTask.deadline")}
            </label>

            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-800 text-slate-100 focus:ring-purple-400"
                  : "bg-white border-slate-300 text-slate-900 focus:ring-purple-500"
              }`}
            />
          </div>

          <button
            type="submit"
            className={`w-full py-2 rounded-lg transition focus:outline-none focus:ring-2 ${
              theme === "dark"
                ? "bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-400"
                : "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500"
            }`}
          >
            {t("createTask.create")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
