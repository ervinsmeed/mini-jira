import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";

type TaskCardProps = {
  task: Doc<"tasks">;
  epic?: Doc<"tasks"> | null;
  onClick: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isDragging?: boolean;
  canDrag?: boolean;
  theme: "light" | "dark";
};

import { Progress } from "../ui/progress";

export default function TaskCard({
  task,
  epic: providedEpic,
  onClick,
  isSelected = false,
  onToggleSelect,
  isFavorite = false,
  onToggleFavorite,
  isDragging = false,
  theme,
  canDrag = false,
}: TaskCardProps) {
  const { t, i18n } = useTranslation();
  const queriedEpic = useQuery(
    api.tasks.get,
    task.epicId && !providedEpic ? { id: task.epicId } : "skip",
  );
  const epic = providedEpic ?? queriedEpic;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task._id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedSubtasks = task.subtasks
    ? task.subtasks.filter((subtask) => subtask.completed).length
    : 0;

  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const isOverdue = task.deadline !== undefined && task.deadline < now;

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString(i18n.resolvedLanguage)
    : "";

  const percentageCompletion =
    totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";

      case "medium":
        return "border-l-yellow-500";

      case "low":
        return "border-l-green-500";

      default:
        return "border-l-yellow-500";
    }
  };

  const getPriorityDot = (priority: string | undefined) => {
    switch (priority) {
      case "high":
        return "bg-red-500";

      case "medium":
        return "bg-yellow-500";

      case "low":
        return "bg-green-500";

      default:
        return "bg-yellow-500";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`task-card cursor-pointer rounded-md border border-l-6 p-6 shadow-sm transition-all ${getPriorityColor(
        task.priority,
      )} ${
        isDragging || isSortableDragging
          ? "rotate-1 scale-105 opacity-50 shadow-lg"
          : ""
      } ${isSelected ? "ring-2 ring-purple-500" : ""}`}
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          aria-label={t("taskCard.select", { title: task.title })}
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="mb-3 size-4 cursor-pointer accent-purple-500"
        />
      )}

      {task.taskType === "epic" && (
        <div className="mb-2">
          <span className="task-card__epic-badge inline-flex rounded-md px-2 py-1 text-xs font-semibold">
            <span title={t("hints.epic")}>{t("createTask.epic")}</span>
          </span>
        </div>
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="task-card__title min-w-0 flex-1 break-words font-semibold leading-tight">
          {task.title}
        </h4>

        <div className="flex shrink-0 items-center gap-2">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className={`rounded p-1 transition-colors ${
                isFavorite
                  ? "text-yellow-400"
                  : theme === "dark"
                    ? "text-slate-500 hover:text-yellow-400"
                    : "text-slate-400 hover:text-yellow-500"
              }`}
              title={t(isFavorite ? "favorites.remove" : "favorites.add")}
              aria-label={t(isFavorite ? "favorites.remove" : "favorites.add")}
            >
              <Star
                className={`size-4 ${
                  isFavorite ? "fill-yellow-400 text-yellow-400" : ""
                }`}
              />
            </button>
          )}

          <div
            title={t("taskCard.priority", {
              priority: t(`priority.${task.priority || "medium"}`),
            })}
            className={`size-2 rounded-full ${getPriorityDot(task.priority)}`}
          />
        </div>
      </div>

      {task.description && (
        <p className="task-card__description mb-2 line-clamp-2 text-sm! leading-4">
          {task.description}
        </p>
      )}

      {epic && (
        <div className="mb-2">
          <span className="task-card__epic-reference text-xs font-medium">
            {t("createTask.epic")}: {epic.title}
          </span>
        </div>
      )}
      {task.storyPoints !== undefined && (
        <div className="mb-3">
          <span className="task-card__points inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold">
            <span title={t("hints.storyPoints")}>{task.storyPoints} SP</span>
          </span>
        </div>
      )}

      {task.deadline !== undefined && (
        <div
          className={`task-card__deadline mb-3 flex items-center gap-2 text-xs font-medium ${
            isOverdue ? "task-card__deadline--overdue" : ""
          }`}
        >
          <CalendarDays className="size-4" />
          <span>{formattedDeadline}</span>
        </div>
      )}

      {totalSubtasks > 0 && (
        <>
          <p className="task-card__subtasks mb-2 text-sm! font-medium">
            {t("taskCard.subtasksProgress", {
              completed: completedSubtasks,
              total: totalSubtasks,
            })}
          </p>

          <Progress value={percentageCompletion} />
        </>
      )}

      {canDrag && (
        <div
          {...attributes}
          {...listeners}
          aria-label={t("taskCard.move")}
          className="task-card__drag-handle mt-2 inline-flex cursor-grab p-1 active:cursor-grabbing"
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical className="size-4" />
        </div>
      )}
    </div>
  );
}
