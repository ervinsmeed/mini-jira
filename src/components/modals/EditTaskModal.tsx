import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { Button, Modal } from "../ui/kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import TaskFormFields from "./TaskFormFields";
import {
  cleanSubtasks,
  fromDateInput,
  getTaskFormValues,
  resolveColumnId,
  toStoryPoints,
  type TaskFormValues,
} from "./taskForm";

type EditTaskFormValues = TaskFormValues & {
  taskType: "task" | "epic";
  epicId: Id<"tasks"> | "";
};

type EditTaskModalProps = {
  canUpdate: boolean;
  task: Doc<"tasks">;
  onClose: () => void;
};

const labelClassName = "mb-2 block text-sm font-medium text-foreground";
const triggerClassName = "w-full min-w-0 border-border bg-input text-foreground";
const contentClassName = "border-border bg-popover text-popover-foreground";

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
  const epics = usePaginatedQuery(
    api.tasks.epics,
    { boardId: task.boardId },
    { initialNumItems: 30 },
  );

  const form = useForm<EditTaskFormValues>({
    defaultValues: {
      ...getTaskFormValues(task),
      taskType: task.taskType === "epic" ? "epic" : "task",
      epicId: task.epicId ?? "",
    },
  });
  const taskType = useWatch({ control: form.control, name: "taskType" });
  const availableEpics = epics.results.filter((epic) => epic._id !== task._id);

  const onSubmit = async (values: EditTaskFormValues) => {
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
        taskType: values.taskType,
        epicId: values.taskType === "task" ? values.epicId || null : null,
      });
      onClose();
      toast.success(t("editTask.updated"));
    });
  };

  const extraFields = (
    <>
      <div>
        <label className={labelClassName}>
          {t("createTask.type")}
          <span className="block text-xs font-normal opacity-70">
            {t("hints.epic")}
          </span>
        </label>
        <Controller
          control={form.control}
          name="taskType"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                if (value === "epic") form.setValue("epicId", "");
              }}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue placeholder={t("createTask.selectType")} />
              </SelectTrigger>
              <SelectContent className={contentClassName}>
                <SelectItem value="task">{t("createTask.task")}</SelectItem>
                <SelectItem value="epic">{t("createTask.epic")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {taskType === "task" && availableEpics.length > 0 && (
        <div>
          <label className={labelClassName}>{t("createTask.epic")}</label>
          <Controller
            control={form.control}
            name="epicId"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) =>
                  field.onChange(value === "none" ? "" : value)
                }
              >
                <SelectTrigger className={triggerClassName}>
                  <SelectValue placeholder={t("createTask.selectEpic")} />
                </SelectTrigger>
                <SelectContent className={contentClassName}>
                  <SelectItem value="none">{t("createTask.noEpic")}</SelectItem>
                  {availableEpics.map((epic) => (
                    <SelectItem key={epic._id} value={epic._id}>
                      {epic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {epics.status === "CanLoadMore" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => epics.loadMore(30)}
            >
              {t("pagination.loadMore")}
            </Button>
          )}
        </div>
      )}
    </>
  );

  return (
    <Modal open onClose={onClose} title={t("editTask.title")}>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2">
          <fieldset
            disabled={pending || !canUpdate}
            className="min-w-0 space-y-6"
          >
            <TaskFormFields
              mode="edit"
              columns={columns}
              extraFields={extraFields}
            />

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
