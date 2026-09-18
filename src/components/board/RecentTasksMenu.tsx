import { Clock3, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";

type RecentTasksMenuProps = {
  onTaskClick: (task: Doc<"tasks">) => void;
};
type RecentTaskEntry = {
  recentTaskId: Id<"recentTasks">;
  viewedAt: number;
  task: Doc<"tasks">;
  board: {
    _id: Id<"boards">;
    name: string;
  };
};

export default function RecentTasksMenu({ onTaskClick }: RecentTasksMenuProps) {
  const { t, i18n } = useTranslation();
  const recentTasks = useQuery(api.recentTasks.list, {
    limit: 8,
  });

  const clearRecentTasks = useMutation(api.recentTasks.clear);
  const { pending, run } = useAction();

  const handleClear = () => {
    void run(() => clearRecentTasks({}));
  };

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
        <Clock3 className="size-4" />
        {t("recentTasks.button")}
      </summary>

      <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-border bg-card p-3 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {t("recentTasks.title")}
          </h3>

          {recentTasks && recentTasks.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
              title={t("recentTasks.clear")}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        {recentTasks === undefined ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("recentTasks.loading")}
          </p>
        ) : recentTasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("recentTasks.empty")}
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {recentTasks.map((entry: RecentTaskEntry) => (
              <button
                key={entry.recentTaskId}
                type="button"
                onClick={() => onTaskClick(entry.task)}
                className="w-full rounded-md border border-border bg-input p-3 text-left transition-colors hover:bg-muted"
              >
                <div className="truncate text-sm font-semibold text-foreground">
                  {entry.task.title}
                </div>

                <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="truncate">{entry.board.name}</span>

                  <span className="shrink-0">
                    {new Date(entry.viewedAt).toLocaleString(
                      i18n.resolvedLanguage,
                    )}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
