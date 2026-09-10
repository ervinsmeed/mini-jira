import WorkspaceAnalytics from "./ui/WorkspaceAnalytics";
import QueryBoundary from "./ui/QueryBoundary";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";

import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import AnalyticsCharts from "./ui/AnalyticsCharts";

type ProjectAnalyticsProps = {
  board: Doc<"boards">;
  theme: "light" | "dark";
  can: (permission: string) => boolean;
  onBack: () => void;
};

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  backlog: "analytics.status.backlog",
  "to do": "analytics.status.toDo",
  "in progress": "analytics.status.inProgress",
  review: "analytics.status.review",
  testing: "analytics.status.testing",
  done: "analytics.status.done",
};

function ProjectAnalyticsContent({
  board,
  theme,
  can,
  onBack,
}: ProjectAnalyticsProps) {
  const { t, i18n } = useTranslation();

  const analytics = useQuery(
    api.analytics.getProjectAnalytics,
    can("analytics.view")
      ? {
          boardId: board._id,
        }
      : "skip",
  );

  const getLocalizedStatusName = (name: string) => {
    const normalizedName = name.trim().toLowerCase();
    const translationKey = STATUS_TRANSLATION_KEYS[normalizedName];

    if (!translationKey) {
      return name;
    }

    return t(translationKey, {
      defaultValue: name,
    });
  };

  if (!can("analytics.view")) {
    return (
      <div
        className={`flex h-full items-center justify-center ${
          theme === "dark"
            ? "bg-slate-950 text-slate-100"
            : "bg-slate-50 text-slate-900"
        }`}
      >
        <p>{t("analytics.noPermission")}</p>
      </div>
    );
  }

  if (analytics === undefined) {
    return (
      <div
        className={`flex h-full items-center justify-center ${
          theme === "dark" ? "bg-slate-950" : "bg-slate-50"
        }`}
      >
        <div className="size-10 animate-spin rounded-full border-4 border-slate-600 border-t-purple-500" />
      </div>
    );
  }

  const cardClass =
    theme === "dark"
      ? "border-slate-800 bg-slate-900"
      : "border-slate-200 bg-white";

  const secondaryText = theme === "dark" ? "text-slate-400" : "text-slate-500";

  return (
    <div
      className={`min-h-screen overflow-y-auto ${
        theme === "dark"
          ? "bg-slate-950 text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      <header
        className={`sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4 ${
          theme === "dark"
            ? "border-slate-800 bg-slate-950"
            : "border-slate-200 bg-sidebar"
        }`}
      >
        <div>
          <h1 className="text-2xl font-bold">{t("analytics.title")}</h1>

          <p className={`mt-1 text-sm ${secondaryText}`}>{board.name}</p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${
            theme === "dark"
              ? "border-slate-700 bg-slate-900 hover:bg-slate-800"
              : "border-slate-300 bg-white hover:bg-slate-100"
          }`}
        >
          <ArrowLeft className="size-4" />
          {t("navigation.backToBoard")}
        </button>
      </header>

      {board.workspaceId && (
        <QueryBoundary
          key={board.workspaceId}
          message={t("analytics.error")}
          retry={t("common.retry")}
        >
          <WorkspaceAnalytics workspaceId={board.workspaceId} />
        </QueryBoundary>
      )}
      <main className="space-y-6 py-6">
        <section className="grid gap-4 px-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: t("analytics.totalTasks"),
              value: analytics.total,
            },
            {
              label: t("analytics.completed"),
              value: analytics.completed,
            },
            {
              label: t("analytics.active"),
              value: analytics.active,
            },
            {
              label: t("analytics.overdue"),
              value: analytics.overdue,
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-lg border p-4 ${cardClass}`}
            >
              <p className={`text-sm ${secondaryText}`}>{item.label}</p>

              <p className="mt-2 text-3xl font-bold">
                {item.value.toLocaleString(i18n.resolvedLanguage)}
              </p>
            </div>
          ))}
        </section>

        <AnalyticsCharts analytics={analytics} theme={theme} />

        <section className="grid gap-6 px-6 xl:grid-cols-2">
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <h2 className="mb-4 text-lg font-semibold">
              {t("analytics.statusDetails")}
            </h2>

            <div className="space-y-3">
              {analytics.byStatus.map(
                (status: {
                  columnId: Id<"columns">;
                  name: string;
                  count: number;
                }) => (
                  <div
                    key={status.columnId}
                    className="flex items-center justify-between"
                  >
                    <span className={secondaryText}>
                      {getLocalizedStatusName(status.name)}
                    </span>

                    <span className="font-semibold">
                      {status.count.toLocaleString(i18n.resolvedLanguage)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <h2 className="mb-4 text-lg font-semibold">
              {t("analytics.assigneeDetails")}
            </h2>

            <div className="space-y-3">
              {analytics.byAssignee.map(
                (assignee: {
                  assigneeId: Id<"users"> | null;
                  name: string;
                  count: number;
                }) => (
                  <div
                    key={assignee.assigneeId ?? "unassigned"}
                    className="flex items-center justify-between"
                  >
                    <span className={secondaryText}>
                      {assignee.assigneeId === null
                        ? t("analytics.unassigned")
                        : assignee.name}
                    </span>

                    <span className="font-semibold">
                      {assignee.count.toLocaleString(i18n.resolvedLanguage)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ProjectAnalytics(props: ProjectAnalyticsProps) {
  const { t } = useTranslation();
  return (
    <QueryBoundary
      key={props.board?._id ?? "none"}
      message={t("common.actionError")}
      retry={t("common.retry")}
    >
      <ProjectAnalyticsContent {...props} />
    </QueryBoundary>
  );
}
