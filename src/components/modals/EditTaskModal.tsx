import { FormProvider, useForm } from "react-hook-form";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { Button, Modal } from "../ui/kit";
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
    <Modal open onClose={onClose} title={t("editTask.title")}>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2">
          <fieldset
            disabled={pending || !canUpdate}
            className="min-w-0 space-y-6"
          >
            <TaskFormFields mode="edit" columns={columns} />

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={onClose}>
                {t("editTask.cancel")}
              </Button>
              <Button type="submit" fullWidth>
                {t("editTask.updateTask")}
              </Button>
            </div>
          </fieldset>
        </form>
      </FormProvider>
    </Modal>
  );
}
