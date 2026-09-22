import { useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
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
  getEmptyTaskFormValues,
  resolveColumnId,
  toStoryPoints,
  type TaskFormValues,
} from "./taskForm";

type CreateTaskFormValues = TaskFormValues & {
  taskType: "task" | "epic";
  epicId: Id<"tasks"> | "";
  assigneeId: Id<"users"> | "";
};

type CreateTaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  boardId: Id<"boards">;
  columns?: Doc<"columns">[];
};

const getDefaultValues = (): CreateTaskFormValues => ({
  ...getEmptyTaskFormValues(),
  taskType: "task",
  epicId: "",
  assigneeId: "",
});

const labelClassName = "mb-2 block text-sm font-medium text-foreground";
const selectTriggerClassName =
  "w-full min-w-0 border-border bg-input text-foreground";
const selectContentClassName =
  "border-border bg-popover text-popover-foreground";

export default function CreateTaskModal({
  isOpen,
  onClose,
  boardId,
  columns = [],
}: CreateTaskModalProps) {
  const { t } = useTranslation();
  const { pending, run } = useAction();

  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"taskTemplates"> | "">("");
  const [templateName, setTemplateName] = useState("");

  const form = useForm<CreateTaskFormValues>({ defaultValues: getDefaultValues() });
  const taskType = useWatch({ control: form.control, name: "taskType" });

  const createTask = useMutation(api.tasks.create);
  const createTemplate = useMutation(api.taskTemplates.create);
  const removeTemplate = useMutation(api.taskTemplates.remove);

  const queryArgs = isOpen ? { boardId } : "skip";
  const templates = usePaginatedQuery(api.tasks.templatesPage, queryArgs, {
    initialNumItems: 30,
  });
  const members = usePaginatedQuery(api.boardMembers.projectMembersPage, queryArgs, {
    initialNumItems: 30,
  });
  const epics = usePaginatedQuery(api.tasks.epics, queryArgs, {
    initialNumItems: 30,
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.results.find((item) => item._id === templateId);
    setSelectedTemplateId(template?._id ?? "");
    if (!template) return;

    form.setValue("title", template.title ?? "");
    form.setValue("description", template.description ?? "");
    form.setValue("priority", template.priority ?? "medium");
    form.setValue("storyPoints", String(template.storyPoints ?? 1));
  };

  const handleSaveTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      toast.error(t("createTask.templateNameRequired"));
      return;
    }

    const values = form.getValues();
    await run(async () => {
      const created = await createTemplate({
        boardId,
        name,
        title: values.title.trim() || undefined,
        description: values.description.trim() || undefined,
        priority: values.priority,
        storyPoints: toStoryPoints(values.storyPoints) ?? undefined,
      });
      setTemplateName("");
      if (created) setSelectedTemplateId(created._id);
      toast.success(t("createTask.templateCreated"));
    });
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!window.confirm(t("createTask.deleteTemplateQuestion"))) return;

    await run(async () => {
      await removeTemplate({ id: selectedTemplateId });
      setSelectedTemplateId("");
      toast.success(t("createTask.templateDeleted"));
    });
  };

  const onSubmit = async (values: CreateTaskFormValues) => {
    const columnId = resolveColumnId(columns, values.columnId);
    if (!columnId) return;

    await run(async () => {
      await createTask({
        boardId,
        columnId,
        title: values.title.trim(),
        description: values.description.trim(),
        priority: values.priority,
        storyPoints: toStoryPoints(values.storyPoints) ?? undefined,
        deadline: fromDateInput(values.deadline) ?? undefined,
        subtasks: cleanSubtasks(values.subtasks),
        taskType: values.taskType,
        epicId: values.taskType === "task" ? values.epicId || undefined : undefined,
        assigneeId: values.assigneeId || undefined,
      });
      form.reset(getDefaultValues());
      setSelectedTemplateId("");
      onClose();
      toast.success(t("createTask.created"));
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
              <SelectTrigger className={selectTriggerClassName}>
                <SelectValue placeholder={t("createTask.selectType")} />
              </SelectTrigger>
              <SelectContent className={selectContentClassName}>
                <SelectItem value="task">{t("createTask.task")}</SelectItem>
                <SelectItem value="epic">{t("createTask.epic")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {taskType === "task" && (
        <div>
          <label className={labelClassName}>{t("createTask.epic")}</label>
          <Controller
            control={form.control}
            name="epicId"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
              >
                <SelectTrigger className={selectTriggerClassName}>
                  <SelectValue placeholder={t("createTask.selectEpic")} />
                </SelectTrigger>
                <SelectContent className={selectContentClassName}>
                  <SelectItem value="none">{t("createTask.noEpic")}</SelectItem>
                  {epics.results.map((epic) => (
                    <SelectItem key={epic._id} value={epic._id}>
                      {epic.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {epics.status === "CanLoadMore" && (
            <button type="button" onClick={() => epics.loadMore(30)} className="mt-2 text-sm text-primary">
              {t("pagination.loadMore")}
            </button>
          )}
        </div>
      )}

      <div>
        <label className={labelClassName}>{t("createTask.assignee")}</label>
        <Controller
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <Select
              value={field.value || "unassigned"}
              onValueChange={(value) =>
                field.onChange(value === "unassigned" ? "" : value)
              }
            >
              <SelectTrigger className={selectTriggerClassName}>
                <SelectValue placeholder={t("createTask.selectAssignee")} />
              </SelectTrigger>
              <SelectContent className={selectContentClassName}>
                <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
                {members.results.map((member) => (
                  <SelectItem key={member._id} value={member._id}>
                    {member.name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {members.status === "CanLoadMore" && (
          <button type="button" onClick={() => members.loadMore(30)} className="mt-2 text-sm text-primary">
            {t("members.loadMore")}
          </button>
        )}
      </div>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[min(600px,calc(100dvh-2rem))] w-[calc(100%-2rem)] min-w-0 max-w-lg overflow-y-auto rounded-xl border border-border bg-background text-foreground shadow-lg transition-colors sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="min-w-0 pr-6 text-lg font-semibold">
            {t("createTask.title")}
          </DialogTitle>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 min-w-0">
            <fieldset disabled={pending} className="min-w-0 space-y-6">
              <div className="min-w-0 rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
                <label className={labelClassName}>{t("createTask.template")}</label>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedTemplateId || "none"}
                    onChange={(event) => handleTemplateSelect(event.target.value)}
                    className="w-full min-w-0 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground sm:flex-1"
                  >
                    <option value="none">{t("createTask.noTemplate")}</option>
                    {templates.results.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleDeleteTemplate}
                    disabled={!selectedTemplateId}
                    className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("createTask.deleteTemplate")}
                  </button>
                </div>
                {templates.status === "CanLoadMore" && (
                  <button type="button" onClick={() => templates.loadMore(30)} className="mt-2 text-sm text-primary">
                    {t("pagination.loadMore")}
                  </button>
                )}

                <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    placeholder={t("createTask.templateNamePlaceholder")}
                    className="w-full min-w-0 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground sm:flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                  >
                    {pending ? t("createTask.savingTemplate") : t("createTask.saveTemplate")}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("createTask.templateHint")}
                </p>
              </div>

              <TaskFormFields mode="create" columns={columns} extraFields={extraFields} />

              <button
                type="submit"
                className="w-full rounded-lg bg-primary px-3 py-2 text-primary-foreground transition hover:bg-primary/90"
              >
                {t("createTask.create")}
              </button>
            </fieldset>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
