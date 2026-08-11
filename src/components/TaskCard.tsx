import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Progress } from "./ui/progress";
import { useTranslation } from "react-i18next";
export default function TaskCard({
  task,
  onClick,
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
    ? task.subtasks.filter((st: any) => st.completed).length
    : 0;

  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

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
      className={`p-6 rounded-md cursor-pointer transition-all border shadow-sm border-l-6 ${getPriorityColor(
        task.priority,
      )} ${
        theme === "dark"
          ? "bg-slate-950 hover:bg-slate-900 border-slate-800"
          : "bg-white hover:bg-slate-50 border-slate-200"
      } ${
        isDragging || isSortableDragging
          ? "shadow-lg rotate-1 scale-105 opacity-50"
          : ""
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4
          className={`font-semibold leading-tight flex-1 ${
            theme === "dark" ? "text-slate-100" : "text-slate-900"
          }`}
        >
          {task.title}
        </h4>

        <div
          className={`size-2 rounded-full ml-2 mt-1 shrink-0 ${getPriorityDot(
            task.priority,
          )}`}
        />
      </div>

      {task.description && (
        <p
          className={`mb-2 text-sm! leading-4 line-clamp-2 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {task.description}
        </p>
      )}

      {totalSubtasks > 0 && (
        <>
          <p
            className={`text-sm! font-medium mb-2 ${
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
        className={`mt-2 p-1 cursor-grab active:cursor-grabbing inline-flex ${
          theme === "dark"
            ? "text-slate-400 hover:text-slate-100"
            : "text-slate-500 hover:text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </div>
    </div>
  );
}
