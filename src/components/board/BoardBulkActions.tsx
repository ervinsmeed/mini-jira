import type { Id } from "../../../convex/_generated/dataModel";
import { useTranslation } from "react-i18next";
import { getColumnLabel } from "../../lib/columnLabel";

type BoardBulkActionsProps = {
  selectedCount: number;
  pending: boolean;
  canUpdateTask: boolean;
  canDeleteTask: boolean;
  columns: {
    _id: Id<"columns">;
    name: string;
  }[];
  projectMembers: {
    _id: Id<"users">;
    name?: string;
    email: string;
  }[];
  onStatusChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onDelete: () => void;
  onClearSelection: () => void;
};

export default function BoardBulkActions({
  selectedCount,
  pending,
  canUpdateTask,
  canDeleteTask,
  columns,
  projectMembers,
  onStatusChange,
  onAssigneeChange,
  onPriorityChange,
  onDelete,
  onClearSelection,
}: BoardBulkActionsProps) {
  const { t } = useTranslation();

  const selectClassName =
    "rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none";

  return (
    <div className="mx-6 mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      <span className="text-sm font-semibold text-foreground">
        {t("board.selected")} {selectedCount}
      </span>

      {canUpdateTask && (
        <>
          <select
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;

              onStatusChange(event.target.value);
              event.target.value = "";
            }}
            className={selectClassName}
          >
            <option value="" disabled>
              {t("board.column")}
            </option>

            {columns.map((column) => (
              <option key={column._id} value={column._id}>
                {getColumnLabel(column.name, t)}
              </option>
            ))}
          </select>

          <select
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;

              onAssigneeChange(event.target.value);
              event.target.value = "";
            }}
            className={selectClassName}
          >
            <option value="" disabled>
              {t("createTask.assignee")}
            </option>

            <option value="unassigned">{t("unassigned")}</option>

            {projectMembers.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name || member.email}
              </option>
            ))}
          </select>

          <select
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;

              onPriorityChange(event.target.value);
              event.target.value = "";
            }}
            className={selectClassName}
          >
            <option value="" disabled>
              {t("board.priority")}
            </option>

            <option value="high">{t("priority.high")}</option>
            <option value="medium">{t("priority.medium")}</option>
            <option value="low">{t("priority.low")}</option>
          </select>
        </>
      )}

      {canDeleteTask && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          disabled={pending}
        >
          {t("board.deleteSelected")}
        </button>
      )}

      <button
        type="button"
        onClick={onClearSelection}
        className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
        disabled={pending}
      >
        {t("board.clearSelection")}
      </button>
    </div>
  );
}
