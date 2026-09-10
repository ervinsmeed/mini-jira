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
import { useTranslation } from "react-i18next";

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

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  backlog: "analytics.status.backlog",
  "to do": "analytics.status.toDo",
  "in progress": "analytics.status.inProgress",
  review: "analytics.status.review",
  testing: "analytics.status.testing",
  done: "analytics.status.done",
};

export default function AnalyticsCharts({
  analytics,
  theme,
}: AnalyticsChartsProps) {
  const { t, i18n } = useTranslation();

  const textColor = theme === "dark" ? "#cbd5e1" : "var(--muted-foreground)";
  const gridColor = theme === "dark" ? "#334155" : "var(--border)";
  const tooltipBackground = theme === "dark" ? "#0f172a" : "var(--popover)";
  const tooltipBorder = theme === "dark" ? "#334155" : "var(--border)";

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

  const localizedStatusData = analytics.byStatus.map((status) => {
    const normalizedName = status.name.trim().toLowerCase();
    const translationKey = STATUS_TRANSLATION_KEYS[normalizedName];

    return {
      ...status,
      name: translationKey ? t(translationKey) : status.name,
    };
  });

  const localizedPriorityData = analytics.byPriority.map((priority) => ({
    ...priority,
    name: t(`analytics.priority.${priority.priority}`, {
      defaultValue: priority.name,
    }),
  }));

  const localizedAssigneeData = analytics.byAssignee.map((assignee) => ({
    ...assignee,
    name:
      assignee.assigneeId === null ? t("analytics.unassigned") : assignee.name,
  }));

  return (
    <div className="grid w-full min-w-0 gap-6 px-6 pb-6 xl:grid-cols-3">
      <div className={`min-w-0 rounded-lg border p-4 ${chartCardClass}`}>
        <h3 className="mb-4 text-lg font-semibold">
          {t("analytics.byStatus")}
        </h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={localizedStatusData}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />

              <XAxis
                dataKey="name"
                stroke={textColor}
                tick={{ fill: textColor, fontSize: 12 }}
              />

              <YAxis
                tickFormatter={(value: number) =>
                  value.toLocaleString(i18n.resolvedLanguage)
                }
                allowDecimals={false}
                stroke={textColor}
                tick={{ fill: textColor, fontSize: 12 }}
              />

              <Tooltip
                formatter={(value) =>
                  typeof value === "number"
                    ? value.toLocaleString(i18n.resolvedLanguage)
                    : value
                }
                itemStyle={theme === "light" ? { color: textColor } : undefined}
                contentStyle={tooltipStyle}
              />

              <Bar
                dataKey="count"
                name={t("analytics.tasks")}
                fill={theme === "dark" ? "#8b5cf6" : "var(--primary)"}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`min-w-0 rounded-lg border p-4 ${chartCardClass}`}>
        <h3 className="mb-4 text-lg font-semibold">
          {t("analytics.byPriority")}
        </h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={localizedPriorityData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={90}
                label
              >
                {localizedPriorityData.map((item) => (
                  <Cell
                    key={item.priority}
                    fill={PRIORITY_COLORS[item.priority] ?? "#8b5cf6"}
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(value) =>
                  typeof value === "number"
                    ? value.toLocaleString(i18n.resolvedLanguage)
                    : value
                }
                itemStyle={theme === "light" ? { color: textColor } : undefined}
                contentStyle={tooltipStyle}
              />
              <Legend
                wrapperStyle={{ color: textColor }}
                formatter={
                  theme === "light"
                    ? (value) => (
                        <span style={{ color: textColor }}>{value}</span>
                      )
                    : undefined
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`min-w-0 rounded-lg border p-4 ${chartCardClass}`}>
        <h3 className="mb-4 text-lg font-semibold">
          {t("analytics.byAssignee")}
        </h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={localizedAssigneeData} layout="vertical">
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />

              <XAxis
                type="number"
                allowDecimals={false}
                stroke={textColor}
                tick={{ fill: textColor, fontSize: 12 }}
              />

              <YAxis
                tickFormatter={(value: number) =>
                  value.toLocaleString(i18n.resolvedLanguage)
                }
                type="category"
                dataKey="name"
                width={110}
                stroke={textColor}
                tick={{ fill: textColor, fontSize: 12 }}
              />

              <Tooltip
                formatter={(value) =>
                  typeof value === "number"
                    ? value.toLocaleString(i18n.resolvedLanguage)
                    : value
                }
                itemStyle={theme === "light" ? { color: textColor } : undefined}
                contentStyle={tooltipStyle}
              />

              <Bar
                dataKey="count"
                name={t("analytics.tasks")}
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
