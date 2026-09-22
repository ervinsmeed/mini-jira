import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { useNow } from "../../../hooks/useNow";

type TaskDetailsProps = {
  task: Doc<"tasks">;
};

export default function TaskDetails({ task }: TaskDetailsProps) {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const locale = i18n.resolvedLanguage;
  const isOverdue = task.deadline !== undefined && task.deadline < now;

  return (
    <>
      <p className="text-xs text-muted-foreground">
        {t("taskModal.createdAt")}: {new Date(task.createdAt).toLocaleString(locale)}
        <br />
        {t("taskModal.updatedAt")}:{" "}
        {new Date(task.updatedAt ?? task.createdAt).toLocaleString(locale)}
      </p>

      {task.description && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      )}

      {task.storyPoints !== undefined && (
        <section>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            {t("taskModal.storyPoints")}
            <span className="block text-xs font-normal text-muted-foreground">
              {t("hints.storyPoints")}
            </span>
          </h4>
          <span className="inline-flex rounded-md bg-muted px-3 py-1.5 text-sm font-semibold text-primary">
            {task.storyPoints} SP
          </span>
        </section>
      )}

      {task.deadline !== undefined && (
        <section>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            {t("taskModal.deadline")}
          </h4>
          <p
            className={`flex items-center gap-2 text-sm font-medium ${
              isOverdue ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            <CalendarDays className="size-4" />
            {new Date(task.deadline).toLocaleDateString(locale)}
          </p>
        </section>
      )}
    </>
  );
}
