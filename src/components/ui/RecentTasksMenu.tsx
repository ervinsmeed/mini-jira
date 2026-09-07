import { Clock3, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type RecentTasksMenuProps = {
  theme: "light" | "dark";
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

export default function RecentTasksMenu({
  theme,
  onTaskClick,
}: RecentTasksMenuProps) {
  const recentTasks = useQuery(api.recentTasks.list, {
    limit: 8,
  });

  const clearRecentTasks = useMutation(api.recentTasks.clear);

  const handleClear = () => {
    void clearRecentTasks({});
  };

  return (
    <details className="relative">
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${
          theme === "dark"
            ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
            : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
        }`}
      >
        <Clock3 className="size-4" />
        Recent
      </summary>

      <div
        className={`absolute right-0 top-12 z-50 w-80 rounded-lg border p-3 shadow-xl ${
          theme === "dark"
            ? "border-slate-700 bg-slate-900"
            : "border-slate-300 bg-white"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3
            className={`text-sm font-semibold ${
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
          >
            Recent tasks
          </h3>

          {recentTasks && recentTasks.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={`rounded p-1 ${
                theme === "dark"
                  ? "text-slate-400 hover:bg-slate-800 hover:text-red-400"
                  : "text-slate-500 hover:bg-slate-100 hover:text-red-500"
              }`}
              title="Clear recent tasks"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        {recentTasks === undefined ? (
          <p
            className={`py-4 text-center text-sm ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Loading...
          </p>
        ) : recentTasks.length === 0 ? (
          <p
            className={`py-4 text-center text-sm ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            No recently viewed tasks
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {recentTasks.map((entry: RecentTaskEntry) => (
              <button
                key={entry.recentTaskId}
                type="button"
                onClick={() => onTaskClick(entry.task)}
                className={`w-full rounded-md border p-3 text-left transition-colors ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-950 hover:bg-slate-800"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`truncate text-sm font-semibold ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {entry.task.title}
                </div>

                <div
                  className={`mt-1 flex items-center justify-between gap-3 text-xs ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  <span className="truncate">{entry.board.name}</span>

                  <span className="shrink-0">
                    {new Date(entry.viewedAt).toLocaleString()}
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
