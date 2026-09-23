import type { ComponentProps } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserButton } from "@clerk/clerk-react";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { BoardFiltersState, SortBy } from "../../hooks/useBoardFilters";
import { Button, Input, Select } from "../ui/kit";
import BoardFilters from "./BoardFilters";
import RecentTasksMenu from "./RecentTasksMenu";

type BoardHeaderProps = {
  board: Doc<"boards">;
  filters: BoardFiltersState;
  columns: Doc<"columns">[];
  projectMembers: ComponentProps<typeof BoardFilters>["projectMembers"];
  pending: boolean;
  canLoadMoreMembers: boolean;
  onLoadMoreMembers: () => void;
  canCreateTask: boolean;
  onCreateTask: () => void;
  onTaskClick: ComponentProps<typeof RecentTasksMenu>["onTaskClick"];
};

export default function BoardHeader({
  board,
  filters,
  columns,
  projectMembers,
  pending,
  canLoadMoreMembers,
  onLoadMoreMembers,
  canCreateTask,
  onCreateTask,
  onTaskClick,
}: BoardHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sidebar/70 p-4 backdrop-blur-md sm:gap-4 sm:p-6 transition-colors">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold text-foreground transition-colors">
          {board.name}
        </h1>
        {board.description && (
          <p className="mt-1 max-w-2xl whitespace-pre-wrap break-words text-sm text-muted-foreground transition-colors">
            {board.description}
          </p>
        )}
      </div>

      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
        {canLoadMoreMembers && (
          <Button variant="ghost" size="sm" onClick={onLoadMoreMembers}>
            {t("members.loadMore")}
          </Button>
        )}
        <RecentTasksMenu onTaskClick={onTaskClick} />
        <Input
          type="search"
          value={filters.searchQuery}
          onChange={(event) => filters.setSearchQuery(event.target.value)}
          placeholder={t("board.searchTasks")}
          aria-label={t("board.searchTasks")}
          className="w-full sm:w-56"
        />
        <Select
          value={filters.sortBy}
          onChange={(event) => filters.setSortBy(event.target.value as SortBy)}
          aria-label={t("board.manualOrder")}
          options={[
            { label: t("board.manualOrder"), value: "manual" },
            { label: t("board.sortTitle"), value: "title" },
            { label: t("board.sortDeadline"), value: "deadline" },
            { label: t("board.sortCreated"), value: "created" },
            { label: t("board.sortStoryPoints"), value: "storyPoints" },
            { label: t("board.sortPriority"), value: "priority" },
          ]}
        />
        <BoardFilters
          pending={pending}
          columns={columns}
          projectMembers={projectMembers}
          statusFilter={filters.statusFilter}
          assigneeFilter={filters.assigneeFilter}
          storyPointsFilter={filters.storyPointsFilter}
          deadlineFilter={filters.deadlineFilter}
          priorityFilter={filters.priorityFilter}
          setStatusFilter={filters.setStatusFilter}
          setAssigneeFilter={filters.setAssigneeFilter}
          setStoryPointsFilter={filters.setStoryPointsFilter}
          setDeadlineFilter={filters.setDeadlineFilter}
          setPriorityFilter={filters.setPriorityFilter}
        />
        {canCreateTask && (
          <Button onClick={onCreateTask} disabled={pending}>
            <Plus className="size-4" />
            {t("board.addTask")}
          </Button>
        )}
        <UserButton />
      </div>
    </div>
  );
}
