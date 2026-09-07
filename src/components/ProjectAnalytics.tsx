import { ArrowLeft } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import AnalyticsCharts from "./ui/AnalyticsCharts";

type ProjectAnalyticsProps = {
  board: Doc<"boards">;
  theme: "light" | "dark";
  can: (permission: string) => boolean;
  onBack: () => void;
};

export default function ProjectAnalytics({
  board,
  theme,
  can,
  onBack,
}: ProjectAnalyticsProps) {
  const analytics = useQuery(
    api.analytics.getProjectAnalytics,
    can("analytics.view")
      ? {
          boardId: board._id,
        }
      : "skip",
  );

  if (!can("analytics.view")) {
    return (
      <div
        className={`flex h-full items-center justify-center ${
          theme === "dark"
            ? "bg-slate-950 text-slate-100"
            : "bg-slate-50 text-slate-900"
        }`}
      >
        <p>You do not have permission to view analytics.</p>
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
            : "border-slate-200 bg-white"
        }`}
      >
        <div>
          <h1 className="text-2xl font-bold">Project analytics</h1>
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
          Back to board
        </button>
      </header>

      <main className="space-y-6 py-6">
        <section className="grid gap-4 px-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total tasks", value: analytics.total },
            { label: "Completed", value: analytics.completed },
            { label: "Active", value: analytics.active },
            { label: "Overdue", value: analytics.overdue },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-lg border p-4 ${cardClass}`}
            >
              <p className={`text-sm ${secondaryText}`}>{item.label}</p>
              <p className="mt-2 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <AnalyticsCharts analytics={analytics} theme={theme} />

        <section className="grid gap-6 px-6 xl:grid-cols-2">
          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <h2 className="mb-4 text-lg font-semibold">Status details</h2>

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
                    <span className={secondaryText}>{status.name}</span>
                    <span className="font-semibold">{status.count}</span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${cardClass}`}>
            <h2 className="mb-4 text-lg font-semibold">Assignee details</h2>

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
                    <span className={secondaryText}>{assignee.name}</span>
                    <span className="font-semibold">{assignee.count}</span>
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
