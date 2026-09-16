import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import TaskStoryPointsField from "./TaskStoryPointsField";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { getColumnLabel } from "../../lib/columnLabel";
import TaskPriorityField from "./TaskPriorityField";
import SortableSubTask from "./SortableSubTask";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Subtask = {
  text: string;
  completed: boolean;
};

type EditTaskModalProps = {
  canUpdate: boolean;
  task: Doc<"tasks">;
  onClose: () => void;
};

export default function EditTaskModal({
  task,
  onClose,
  canUpdate,
}: EditTaskModalProps) {
  const { t } = useTranslation();
  const { pending, run } = useAction();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority || "medium");

  const [storyPoints, setStoryPoints] = useState(String(task.storyPoints ?? 1));
  const [deadline, setDeadline] = useState(
    task.deadline ? new Date(task.deadline).toISOString().split("T")[0] : "",
  );
  const [subtasks, setSubtasks] = useState<Subtask[]>(() =>
    task.subtasks?.length
      ? task.subtasks.map((subtask) => ({ ...subtask }))
      : [{ text: "", completed: false }],
  );

  const [columnId, setColumnId] = useState(task.columnId);

  const updateTask = useMutation(api.tasks.update);

  const columns: Doc<"columns">[] =
    useQuery(api.columns.list, {
      boardId: task.boardId,
    }) ?? [];

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
    if (!canUpdate) return;

    if (!title.trim() || !columnId) return;

    const validSubtasks = subtasks
      .filter((subtask) => subtask.text.trim())
      .map((subtask) => ({
        text: subtask.text.trim(),
        completed: subtask.completed,
      }));

    await run(async () => {
      await updateTask({
        id: task._id,
        title: title.trim(),
        description: description.trim(),
        priority,
        storyPoints: Number(storyPoints) as 1 | 2 | 3 | 5 | 8 | 13 | 21,

        deadline: deadline ? new Date(`${deadline}T23:59:59`).getTime() : null,

        subtasks: validSubtasks,
        columnId,
      });
      onClose();

      toast.success(t("editTask.updated"));
    });
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
      <DialogContent className="max-h-[600px] max-w-lg overflow-auto rounded-xl border border-border bg-background text-foreground shadow-lg transition-colors">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("editTask.title")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2">
          <fieldset disabled={pending} className="contents">
            <fieldset disabled={!canUpdate} className="min-w-0 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t("editTask.taskTitle")}
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("editTask.titlePlaceholder")}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t("editTask.description")}
                </label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t("editTask.descriptionPlaceholder")}
                  rows={4}
                  className="w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t("editTask.subtasks")}
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
                          text={subtask.text}
                          index={index}
                          placeholder={t("editTask.subtaskPlaceholder")}
                          onRemove={handleRemoveSubtask}
                          onChange={handleSubtaskChange}
                        />
                      ))}
                    </SortableContext>

                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="w-full rounded-md border-2 border-dashed border-border py-2 font-medium text-foreground transition hover:bg-muted"
                    >
                      + {t("editTask.addSubtask")}
                    </button>
                  </div>
                </DndContext>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <TaskPriorityField
                  value={priority}
                  onChange={setPriority}
                  label={t("editTask.priority")}
                  placeholder={t("editTask.selectPriority")}
                />

                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t("editTask.column")}
                  </label>

                  <Select
                    value={columnId}
                    onValueChange={(value) =>
                      setColumnId(value as Id<"columns">)
                    }
                  >
                    <SelectTrigger className="w-full border-border bg-input text-foreground">
                      <SelectValue placeholder={t("editTask.selectColumn")} />
                    </SelectTrigger>

                    <SelectContent className="border-border bg-popover text-popover-foreground">
                      {columns.map((column) => (
                        <SelectItem key={column._id} value={column._id}>
                          {getColumnLabel(column.name, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TaskStoryPointsField
                value={storyPoints}
                onChange={setStoryPoints}
                label={t("editTask.storyPoints")}
                placeholder={t("editTask.selectStoryPoints")}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t("editTask.deadline")}
                </label>

                <input
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground transition focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-border py-2 text-foreground transition-colors hover:bg-muted"
                >
                  {t("editTask.cancel")}
                </button>

                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 rounded-lg bg-purple-600 py-2 text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {t("editTask.updateTask")}
                </button>
              </div>
            </fieldset>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
