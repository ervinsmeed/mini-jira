import { useState } from "react";
import { useForm } from "react-hook-form";
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

type EditTaskFormValues = {
  title: string;
  description: string;
  deadline: string;
};

type EditTaskModalProps = {
  canUpdate: boolean;
  task: Doc<"tasks">;
  onClose: () => void;
};

const toDateInput = (value: number) => {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export default function EditTaskModal({
  task,
  onClose,
  canUpdate,
}: EditTaskModalProps) {
  const { t } = useTranslation();
  const { pending, run } = useAction();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditTaskFormValues>({
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      deadline: task.deadline ? toDateInput(task.deadline) : "",
    },
  });

  const [priority, setPriority] = useState(task.priority || "medium");

  const [storyPoints, setStoryPoints] = useState(
    task.storyPoints ? String(task.storyPoints) : "none",
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

  const onSubmit = async (values: EditTaskFormValues) => {
    if (!canUpdate || !columnId) return;

    const validSubtasks = subtasks
      .filter((subtask) => subtask.text.trim())
      .map((subtask) => ({
        text: subtask.text.trim(),
        completed: subtask.completed,
      }));

    await run(async () => {
      await updateTask({
        id: task._id,
        title: values.title.trim(),
        description: values.description.trim(),
        priority,
        storyPoints:
          storyPoints === "none"
            ? null
            : (Number(storyPoints) as 1 | 2 | 3 | 5 | 8 | 13 | 21),

        deadline: values.deadline
          ? new Date(`${values.deadline}T23:59:59`).getTime()
          : null,

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
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2">
          <fieldset disabled={pending} className="contents">
            <fieldset disabled={!canUpdate} className="min-w-0 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t("editTask.taskTitle")}
                </label>

                <input
                  type="text"
                  {...register("title", {
                    validate: (value) => value.trim() !== "",
                  })}
                  placeholder={t("editTask.titlePlaceholder")}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-destructive">
                    {t("errors.VALIDATION_FAILED")}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t("editTask.description")}
                </label>

                <textarea
                  {...register("description")}
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
                allowNone
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t("editTask.deadline")}
                </label>
                <input
                  type="date"
                  {...register("deadline")}
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
                  className="flex-1 rounded-lg bg-primary py-2 text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
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
