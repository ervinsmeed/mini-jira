import { useTranslation } from "react-i18next";

import type { Id } from "../../../convex/_generated/dataModel";

import { getColumnLabel } from "../../lib/columnLabel";

import SelectField from "../ui/SelectField";
type StatusFilter = Id<"columns"> | "all";
type AssigneeFilter = Id<"users"> | "all" | "unassigned";
type StoryPointsFilter = "all" | "1" | "2" | "3" | "5" | "8" | "13" | "21";
type DeadlineFilter = "all" | "overdue" | "today" | "upcoming" | "none";
type PriorityFilter = "all" | "high" | "medium" | "low";

type FilterColumn = {
  _id: Id<"columns">;
  name: string;
};

type FilterMember = {
  _id: Id<"users">;
  name?: string;
  email: string;
};

type BoardFiltersProps = {
  pending: boolean;
  columns: FilterColumn[];
  projectMembers: FilterMember[];
  statusFilter: StatusFilter;
  assigneeFilter: AssigneeFilter;
  storyPointsFilter: StoryPointsFilter;
  deadlineFilter: DeadlineFilter;
  priorityFilter: PriorityFilter;
  setStatusFilter: (value: StatusFilter) => void;
  setAssigneeFilter: (value: AssigneeFilter) => void;
  setStoryPointsFilter: (value: StoryPointsFilter) => void;
  setDeadlineFilter: (value: DeadlineFilter) => void;
  setPriorityFilter: (value: PriorityFilter) => void;
};
export default function BoardFilters({
  pending,
  columns,
  projectMembers,
  statusFilter,
  assigneeFilter,
  storyPointsFilter,
  deadlineFilter,
  priorityFilter,
  setStatusFilter,
  setAssigneeFilter,
  setStoryPointsFilter,
  setDeadlineFilter,
  setPriorityFilter,
}: BoardFiltersProps) {
  const { t } = useTranslation();

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
        {t("board.filters", { defaultValue: "Filters" })}
      </summary>

      <div className="absolute right-0 top-12 z-50 grid w-72 gap-3 rounded-lg border border-border bg-card p-4 shadow-xl">
        <SelectField
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as Id<"columns"> | "all")
          }
          className="w-full"
          data={[
            {
              label: t("board.allStatuses", {
                defaultValue: "All statuses",
              }),
              value: "all",
            },
            ...columns.map((column) => ({
              label: getColumnLabel(column.name, t),
              value: column._id,
            })),
          ]}
        />

        <SelectField
          value={assigneeFilter}
          onChange={(event) =>
            setAssigneeFilter(
              event.target.value as Id<"users"> | "all" | "unassigned",
            )
          }
          className="w-full"
          data={[
            {
              label: t("board.allAssignees", {
                defaultValue: "All assignees",
              }),
              value: "all",
            },
            {
              label: t("board.unassigned", {
                defaultValue: "Unassigned",
              }),
              value: "unassigned",
            },
            ...projectMembers.map((member) => ({
              label: member.name || member.email,
              value: member._id,
            })),
          ]}
        />

        <SelectField
          value={storyPointsFilter}
          onChange={(event) =>
            setStoryPointsFilter(
              event.target.value as
                "all" | "1" | "2" | "3" | "5" | "8" | "13" | "21",
            )
          }
          className="w-full"
          data={[
            {
              label: t("board.allStoryPoints", {
                defaultValue: "All Story Points",
              }),
              value: "all",
            },
            ...[1, 2, 3, 5, 8, 13, 21].map((points) => ({
              label: `${points} SP`,
              value: String(points),
            })),
          ]}
        />
        <SelectField
          value={deadlineFilter}
          onChange={(event) =>
            setDeadlineFilter(
              event.target.value as
                "all" | "overdue" | "today" | "upcoming" | "none",
            )
          }
          className="w-full"
          data={[
            {
              label: t("board.allDeadlines", {
                defaultValue: "All deadlines",
              }),
              value: "all",
            },
            {
              label: t("board.overdue", { defaultValue: "Overdue" }),
              value: "overdue",
            },
            {
              label: t("board.today", { defaultValue: "Today" }),
              value: "today",
            },
            {
              label: t("board.upcoming", { defaultValue: "Upcoming" }),
              value: "upcoming",
            },
            {
              label: t("board.noDeadline", {
                defaultValue: "No deadline",
              }),
              value: "none",
            },
          ]}
        />
        <SelectField
          value={priorityFilter}
          onChange={(event) =>
            setPriorityFilter(event.target.value as PriorityFilter)
          }
          className="w-full"
          data={[
            { label: t("board.allPriorities"), value: "all" },
            { label: t("priority.high"), value: "high" },
            { label: t("priority.medium"), value: "medium" },
            { label: t("priority.low"), value: "low" },
          ]}
        />
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setAssigneeFilter("all");
            setStoryPointsFilter("all");
            setDeadlineFilter("all");
            setPriorityFilter("all");
          }}
          className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          disabled={pending}
        >
          {t("board.clearFilters", { defaultValue: "Clear filters" })}
        </button>
      </div>
    </details>
  );
}
