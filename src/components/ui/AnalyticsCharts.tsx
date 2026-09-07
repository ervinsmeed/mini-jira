import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Id } from "../../../convex/_generated/dataModel";

type StatusData = {
  columnId: Id<"columns">;
  name: string;
  count: number;
};

type AssigneeData = {
  assigneeId: Id<"users"> | null;
  name: string;
  count: number;
};

type PriorityData = {
  priority: string;
  name: string;
  count: number;
};

type AnalyticsChartsProps = {
  analytics: {
    byStatus: StatusData[];
    byAssignee: AssigneeData[];
    byPriority: PriorityData[];
  };
  theme: "light" | "dark";
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#eab308",
  low: "#22c55e",
};

export default function AnalyticsCharts({
  analytics,
  theme,
}: AnalyticsChartsProps) {
  const textColor = theme === "dark" ? "#cbd5e1" : "#475569";
  const gridColor = theme === "dark" ? "#334155" : "#e2e8f0";
  const tooltipBackground = theme === "dark" ? "#0f172a" : "#ffffff";
  const tooltipBorder = theme === "dark" ? "#334155" : "#cbd5e1";

  const chartCardClass =
    theme === "dark"
      ? "border-slate-800 bg-slate-900"
      : "border-slate-200 bg-white";

  const tooltipStyle = {
    backgroundColor: tooltipBackground,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: "8px",
    color: textColor,
  };

  return (
    <div className="grid w-full min-w-0 gap-6 px-6 pb-6 xl:grid-cols-3">
      <div className={`min-w-0 rounded-lg border p-4 ${chartCardClass}`}>
        <h3 className="mb-4 text-lg font-semibold">Tasks by status</h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byStatus}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                stroke={textColor}
                tick={{ fill: textColor, fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                stroke={textColor}
                tick={{ fill: textColor, fontSize: 12 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="count"
                name="Tasks"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`min-w-0 rounded-lg border p-4 ${chartCardClass}`}>
        <h3 className="mb-4 text-lg font-semibold">Tasks by priority</h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analytics.byPriority}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={90}
                label
              >
                {analytics.byPriority.map((item) => (
                  <Cell
                    key={item.priority}
                    fill={PRIORITY_COLORS[item.priority] ?? "#8b5cf6"}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: textColor }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`min-w-0 rounded-lg border p-4 ${chartCardClass}`}>
        <h3 className="mb-4 text-lg font-semibold">Tasks by assignee</h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byAssignee} layout="vertical">
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                type="number"
                allowDecimals={false}
                stroke={textColor}
                tick={{ fill: textColor, fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                stroke={textColor}
                tick={{ fill: textColor, fontSize: 12 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="count"
                name="Tasks"
                fill="#06b6d4"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
