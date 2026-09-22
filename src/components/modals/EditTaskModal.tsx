import { FormProvider, useForm } from "react-hook-form";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import TaskFormFields from "./TaskFormFields";
import {
  cleanSubtasks,
  fromDateInput,
  getTaskFormValues,
  resolveColumnId,
  toStoryPoints,
  type TaskFormValues,
} from "./taskForm";

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
  const updateTask = useMutation(api.tasks.update);
  const columns: Doc<"columns">[] =
    useQuery(api.columns.list, { boardId: task.boardId }) ?? [];

  const form = useForm<TaskFormValues>({
    defaultValues: getTaskFormValues(task),
  });

  const onSubmit = async (values: TaskFormValues) => {
    const columnId = resolveColumnId(columns, values.columnId);
    if (!canUpdate || !columnId) return;

    await run(async () => {
      await updateTask({
        id: task._id,
        title: values.title.trim(),
        description: values.description.trim(),
        priority: values.priority,
        storyPoints: toStoryPoints(values.storyPoints),
        deadline: fromDateInput(values.deadline),
        subtasks: cleanSubtasks(values.subtasks),
        columnId,
      });
      onClose();
      toast.success(t("editTask.updated"));
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[600px] max-w-lg overflow-auto rounded-xl border border-border bg-background text-foreground shadow-lg transition-colors">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("editTask.title")}
          </DialogTitle>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2">
            <fieldset
              disabled={pending || !canUpdate}
              className="min-w-0 space-y-6"
            >
              <TaskFormFields mode="edit" columns={columns} />

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
                  className="flex-1 rounded-lg bg-primary py-2 text-primary-foreground transition hover:bg-primary/90"
                >
                  {t("editTask.updateTask")}
                </button>
              </div>
            </fieldset>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
