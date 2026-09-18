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
import { getColumnLabel } from "../../lib/columnLabel";
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
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "var(--priority-high)",
  medium: "var(--priority-medium)",
  low: "var(--priority-low)",
};

export default function AnalyticsCharts({ analytics }: AnalyticsChartsProps) {
  const { t, i18n } = useTranslation();

  const textColor = "var(--muted-foreground)";
  const gridColor = "var(--border)";

  const chartCardClass = "border-border bg-card text-card-foreground";

  const tooltipStyle = {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--popover-foreground)",
  };

  const tooltipItemStyle = {
    color: "var(--popover-foreground)",
  };

  const localizedStatusData = analytics.byStatus.map((status) => ({
    ...status,
    name: getColumnLabel(status.name, t),
  }));

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
            <BarChart data={localizedStatusData} layout="vertical">
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
                width={125}
                interval={0}
                stroke={textColor}
                tick={{ fill: textColor, fontSize: 12 }}
              />

              <Tooltip
                formatter={(value) =>
                  typeof value === "number"
                    ? value.toLocaleString(i18n.resolvedLanguage)
                    : value
                }
                itemStyle={tooltipItemStyle}
                contentStyle={tooltipStyle}
              />

              <Bar
                dataKey="count"
                name={t("analytics.tasks")}
                fill="var(--analytics-bar)"
                radius={[0, 4, 4, 0]}
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
                    fill={PRIORITY_COLORS[item.priority] ?? "var(--chart-5)"}
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(value) =>
                  typeof value === "number"
                    ? value.toLocaleString(i18n.resolvedLanguage)
                    : value
                }
                itemStyle={tooltipItemStyle}
                contentStyle={tooltipStyle}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: textColor }}>{value}</span>
                )}
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
                itemStyle={tooltipItemStyle}
                contentStyle={tooltipStyle}
              />

              <Bar
                dataKey="count"
                name={t("analytics.tasks")}
                fill="var(--analytics-bar)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
