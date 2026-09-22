import { useTranslation } from "react-i18next";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Checkbox } from "../../ui/checkbox";

type Subtask = NonNullable<Doc<"tasks">["subtasks"]>[number];

type TaskSubtaskListProps = {
  subtasks: Subtask[];
  disabled: boolean;
  onToggle: (index: number) => void;
};

export default function TaskSubtaskList({
  subtasks,
  disabled,
  onToggle,
}: TaskSubtaskListProps) {
  const { t } = useTranslation();
  if (subtasks.length === 0) return null;

  const completed = subtasks.filter((subtask) => subtask.completed).length;

  return (
    <section>
      <h4 className="mb-4 text-sm font-medium text-foreground">
        {t("taskModal.subtasks", { completed, total: subtasks.length })}
      </h4>
      <ul className="space-y-3">
        {subtasks.map((subtask, index) => (
          <li key={index}>
            <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg bg-muted p-3 transition-colors hover:bg-accent">
              <Checkbox
                className="shrink-0"
                disabled={disabled}
                checked={subtask.completed}
                onCheckedChange={() => onToggle(index)}
              />
              <span
                className={`min-w-0 flex-1 whitespace-pre-wrap text-sm ${
                  subtask.completed
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {subtask.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
