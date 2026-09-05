import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Progress } from "./ui/progress";

export default function TaskCard({
  task,
  epic,
  onClick,
  isSelected = false,
  onToggleSelect,
  isFavorite = false,
  onToggleFavorite,
  isDragging = false,
  theme,
}: any) {
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedSubtasks = task.subtasks
    ? task.subtasks.filter((subtask: any) => subtask.completed).length
    : 0;

  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  const isOverdue = task.deadline !== undefined && task.deadline < Date.now();

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString()
    : "";

  const percentageCompletion =
    totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const getPriorityColor = (priority: any) => {
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

  const getPriorityDot = (priority: any) => {
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
      className={`cursor-pointer rounded-md border border-l-6 p-6 shadow-sm transition-all ${getPriorityColor(
        task.priority,
      )} ${
        theme === "dark"
          ? "border-slate-800 bg-slate-950 hover:bg-slate-900"
          : "border-slate-200 bg-white hover:bg-slate-50"
      } ${
        isDragging || isSortableDragging
          ? "rotate-1 scale-105 opacity-50 shadow-lg"
          : ""
      } ${isSelected ? "ring-2 ring-purple-500" : ""}`}
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          className="mb-3 size-4 cursor-pointer accent-purple-500"
        />
      )}

      {task.taskType === "epic" && (
        <div className="mb-2">
          <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
              theme === "dark"
                ? "bg-purple-500/20 text-purple-300"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            EPIC
          </span>
        </div>
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <h4
          className={`min-w-0 flex-1 break-words font-semibold leading-tight ${
            theme === "dark" ? "text-slate-100" : "text-slate-900"
          }`}
        >
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
              title={t("taskCard.favorite", {
                defaultValue: isFavorite
                  ? "Remove from favorites"
                  : "Add to favorites",
              })}
              aria-label={
                isFavorite
                  ? "Remove task from favorites"
                  : "Add task to favorites"
              }
            >
              <Star
                className={`size-4 ${
                  isFavorite ? "fill-yellow-400 text-yellow-400" : ""
                }`}
              />
            </button>
          )}

          <div
            className={`size-2 rounded-full ${getPriorityDot(task.priority)}`}
          />
        </div>
      </div>

      {task.description && (
        <p
          className={`mb-2 line-clamp-2 text-sm! leading-4 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {task.description}
        </p>
      )}

      {epic && (
        <div className="mb-2">
          <span
            className={`text-xs font-medium ${
              theme === "dark" ? "text-purple-300" : "text-purple-700"
            }`}
          >
            Epic: {epic.title}
          </span>
        </div>
      )}

      {task.storyPoints !== undefined && (
        <div className="mb-3">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
              theme === "dark"
                ? "bg-slate-800 text-purple-300"
                : "bg-slate-100 text-purple-700"
            }`}
          >
            {task.storyPoints} SP
          </span>
        </div>
      )}

      {task.deadline !== undefined && (
        <div
          className={`mb-3 flex items-center gap-2 text-xs font-medium ${
            isOverdue
              ? "text-red-500"
              : theme === "dark"
                ? "text-slate-400"
                : "text-slate-600"
          }`}
        >
          <CalendarDays className="size-4" />
          <span>{formattedDeadline}</span>
        </div>
      )}

      {totalSubtasks > 0 && (
        <>
          <p
            className={`mb-2 text-sm! font-medium ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {t("taskCard.subtasksProgress", {
              completed: completedSubtasks,
              total: totalSubtasks,
            })}
          </p>

          <Progress value={percentageCompletion} />
        </>
      )}

      <div
        {...attributes}
        {...listeners}
        className={`mt-2 inline-flex cursor-grab p-1 active:cursor-grabbing ${
          theme === "dark"
            ? "text-slate-400 hover:text-slate-100"
            : "text-slate-500 hover:text-slate-900"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </div>
    </div>
  );
}
