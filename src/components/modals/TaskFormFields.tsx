import { useId, type ReactNode } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { Doc } from "../../../convex/_generated/dataModel";
import { getColumnLabel } from "../../lib/columnLabel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Field, Input, Textarea } from "../ui/kit";
import SortableSubTask from "./SortableSubTask";
import TaskPriorityField from "./TaskPriorityField";
import TaskStoryPointsField from "./TaskStoryPointsField";
import { emptySubtask, resolveColumnId, type TaskFormValues } from "./taskForm";

type TaskFormFieldsProps = {
  mode: "create" | "edit";
  columns: Doc<"columns">[];
  extraFields?: ReactNode;
};

const labelClassName = "mb-2 block text-sm font-medium text-foreground";

export default function TaskFormFields({
  mode,
  columns,
  extraFields,
}: TaskFormFieldsProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const deadlineId = useId();
  const prefix = mode === "create" ? "createTask" : "editTask";
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<TaskFormValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "subtasks",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleRemoveSubtask = (index: number) => {
    remove(index);
    if (fields.length === 1) append(emptySubtask());
  };

  const handleSubtaskDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.id === active.id);
    const to = fields.findIndex((field) => field.id === over.id);
    if (from !== -1 && to !== -1) move(from, to);
  };

  return (
    <>
      <Field
        label={t(`${prefix}.taskTitle`)}
        htmlFor={titleId}
        error={errors.title?.message}
      >
        <Input
          id={titleId}
          {...register("title", {
            validate: (value) =>
              value.trim() !== "" || t("taskForm.titleRequired"),
          })}
          placeholder={t(`${prefix}.titlePlaceholder`)}
          aria-invalid={errors.title ? true : undefined}
        />
      </Field>

      <Field label={t(`${prefix}.description`)} htmlFor={descriptionId}>
        <Textarea
          id={descriptionId}
          {...register("description")}
          placeholder={t(`${prefix}.descriptionPlaceholder`)}
        />
      </Field>

      {extraFields}

      <div>
        <label className={labelClassName}>{t(`${prefix}.subtasks`)}</label>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSubtaskDragEnd}
        >
          <div className="space-y-3">
            <SortableContext
              items={fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              {fields.map((field, index) => (
                <SortableSubTask
                  key={field.id}
                  id={field.id}
                  index={index}
                  placeholder={t(`${prefix}.subtaskPlaceholder`)}
                  inputProps={register(`subtasks.${index}.text`)}
                  onRemove={handleRemoveSubtask}
                />
              ))}
            </SortableContext>
            <button
              type="button"
              onClick={() => append(emptySubtask())}
              className="w-full rounded-md border-2 border-dashed border-border py-2 font-medium text-foreground transition hover:bg-muted"
            >
              + {t(`${prefix}.addSubtask`)}
            </button>
          </div>
        </DndContext>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <TaskPriorityField
              value={field.value}
              onChange={field.onChange}
              label={t(`${prefix}.priority`)}
              placeholder={t(`${prefix}.selectPriority`)}
            />
          )}
        />

        <div className="min-w-0">
          <label className={labelClassName}>{t(`${prefix}.column`)}</label>
          <Controller
            control={control}
            name="columnId"
            render={({ field }) => (
              <Select
                value={resolveColumnId(columns, field.value)}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full min-w-0 border-border bg-input text-foreground">
                  <SelectValue placeholder={t(`${prefix}.selectColumn`)} />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  {columns.map((column) => (
                    <SelectItem key={column._id} value={column._id}>
                      {getColumnLabel(column.name, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <Controller
        control={control}
        name="storyPoints"
        render={({ field }) => (
          <TaskStoryPointsField
            value={field.value}
            onChange={field.onChange}
            label={t(`${prefix}.storyPoints`)}
            placeholder={t(`${prefix}.selectStoryPoints`)}
            allowNone={mode === "edit"}
          />
        )}
      />

      <Field label={t(`${prefix}.deadline`)} htmlFor={deadlineId}>
        <Input id={deadlineId} type="date" {...register("deadline")} />
      </Field>
    </>
  );
}
