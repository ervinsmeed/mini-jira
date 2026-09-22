import { useTranslation } from "react-i18next";
import type { Id } from "../../../convex/_generated/dataModel";
import { getColumnLabel } from "../../lib/columnLabel";
import { Select } from "../ui/kit";
import type {
  AssigneeFilter,
  DeadlineFilter,
  PriorityFilter,
  StatusFilter,
  StoryPointsFilter,
} from "../../hooks/useBoardFilters";
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
  const activeFilters = [
    statusFilter,
    assigneeFilter,
    storyPointsFilter,
    deadlineFilter,
    priorityFilter,
  ].filter((value) => value !== "all").length;

  return (
    <details name="board-menu" className="relative">
      <summary
        className={`cursor-pointer list-none rounded-md border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted ${
          activeFilters > 0 ? "border-primary" : "border-border"
        }`}
      >
        {t("board.filters", { defaultValue: "Filters" })}
        {activeFilters > 0 && (
          <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
            {activeFilters}
          </span>
        )}
      </summary>

      <div className="absolute right-0 top-12 z-50 grid w-72 gap-3 rounded-lg border border-border bg-card p-4 shadow-xl">
        <Select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as Id<"columns"> | "all")
          }
          className="w-full"
          options={[
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

        <Select
          value={assigneeFilter}
          onChange={(event) =>
            setAssigneeFilter(
              event.target.value as Id<"users"> | "all" | "unassigned",
            )
          }
          className="w-full"
          options={[
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

        <Select
          value={storyPointsFilter}
          onChange={(event) =>
            setStoryPointsFilter(
              event.target.value as
                "all" | "1" | "2" | "3" | "5" | "8" | "13" | "21",
            )
          }
          className="w-full"
          options={[
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
        <Select
          value={deadlineFilter}
          onChange={(event) =>
            setDeadlineFilter(
              event.target.value as
                "all" | "overdue" | "today" | "upcoming" | "none",
            )
          }
          className="w-full"
          options={[
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
        <Select
          value={priorityFilter}
          onChange={(event) =>
            setPriorityFilter(event.target.value as PriorityFilter)
          }
          className="w-full"
          options={[
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
