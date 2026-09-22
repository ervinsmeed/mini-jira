import { useTranslation } from "react-i18next";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { getColumnLabel } from "../../../lib/columnLabel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

type Member = {
  _id: Id<"users">;
  name: string;
  email: string;
};

type TaskAssignmentProps = {
  task: Doc<"tasks">;
  assigneeName?: string;
  columns: Doc<"columns">[];
  members: Member[];
  disabled: boolean;
  onAssigneeChange: (assigneeId: Id<"users"> | null) => void;
  onColumnChange: (columnId: Id<"columns">) => void;
};

const triggerClassName = "w-full min-w-0 border-border bg-input text-foreground";
const contentClassName = "border-border bg-popover text-popover-foreground";

export default function TaskAssignment({
  task,
  assigneeName,
  columns,
  members,
  disabled,
  onAssigneeChange,
  onColumnChange,
}: TaskAssignmentProps) {
  const { t } = useTranslation();
  const assigneeMissing =
    task.assigneeId !== undefined &&
    !members.some((member) => member._id === task.assigneeId);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="min-w-0">
        <p className="mb-2 text-sm font-medium text-foreground">
          {t("createTask.assignee")}
        </p>
        <Select
          value={task.assigneeId ?? "unassigned"}
          disabled={disabled}
          onValueChange={(value) =>
            onAssigneeChange(value === "unassigned" ? null : (value as Id<"users">))
          }
        >
          <SelectTrigger className={triggerClassName} aria-label={t("createTask.assignee")}>
            <SelectValue placeholder={t("createTask.selectAssignee")} />
          </SelectTrigger>
          <SelectContent className={contentClassName}>
            <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
            {assigneeMissing && task.assigneeId && (
              <SelectItem value={task.assigneeId}>
                {assigneeName ?? t("common.loading")}
              </SelectItem>
            )}
            {members.map((member) => (
              <SelectItem key={member._id} value={member._id}>
                {member.name || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-sm font-medium text-foreground">
          {t("taskModal.column")}
        </p>
        <Select
          value={task.columnId}
          disabled={disabled}
          onValueChange={(value) => onColumnChange(value as Id<"columns">)}
        >
          <SelectTrigger className={triggerClassName} aria-label={t("taskModal.column")}>
            <SelectValue placeholder={t("taskModal.selectColumn")} />
          </SelectTrigger>
          <SelectContent className={contentClassName}>
            {columns.map((column) => (
              <SelectItem key={column._id} value={column._id}>
                {getColumnLabel(column.name, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
