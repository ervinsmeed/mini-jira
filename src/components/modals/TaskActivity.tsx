import { usePaginatedQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import HistoryValue from "./HistoryValue";

type TaskActivityProps = {
  taskId: Id<"tasks">;
};

export default function TaskActivity({ taskId }: TaskActivityProps) {
  const { t, i18n } = useTranslation();

  const {
    results: activityLogs,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.tasks.activityPage,
    { taskId },
    { initialNumItems: 20 },
  );

  return (
    <section className="min-w-0">
      <h4 className="mb-3 text-sm font-medium text-foreground">
        {t("taskModal.activity")}
      </h4>

      <div className="space-y-3">
        {status === "CanLoadMore" && (
          <button type="button" onClick={() => loadMore(20)}>
            {t("pagination.loadMore")}
          </button>
        )}

        {status === "LoadingFirstPage" ? (
          <p>{t("common.loading")}</p>
        ) : activityLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("taskModal.noActivity")}
          </p>
        ) : (
          activityLogs.map((log) => (
            <div
              key={log._id}
              className="rounded-lg border border-border bg-card p-3"
            >
              <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
                <div className="min-w-0 w-full sm:flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {log.userName}
                  </p>

                  <p className="mt-1 text-sm font-medium text-foreground">
                    {t(`taskModal.activityEvents.${log.action}`, {
                      defaultValue: log.action,
                    })}
                  </p>

                  <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {log.details}

                    {log.changes?.map((change, index) => (
                      <div key={index}>
                        {t(`historyFields.${change.field}`)}:{" "}
                        <HistoryValue
                          field={change.field}
                          value={change.before}
                        />{" "}
                        {"\u2192"}{" "}
                        <HistoryValue
                          field={change.field}
                          value={change.after}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <span className="max-w-full text-xs text-muted-foreground sm:shrink-0">
                  {new Date(log.createdAt).toLocaleString(
                    i18n.resolvedLanguage,
                  )}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
