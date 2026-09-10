import { useQuery } from "convex/react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export default function WorkspaceAnalytics({
  workspaceId,
}: {
  workspaceId: Id<"workspaces">;
}) {
  const { t, i18n } = useTranslation();
  const data = useQuery(api.analytics.getWorkspaceAnalytics, { workspaceId });
  return (
    <section className="m-6 min-w-0 rounded-lg border border-border bg-card p-4">
      <h2>{t("analytics.byProjects")}</h2>
      {data === undefined ? (
        <p role="status">{t("common.loading")}</p>
      ) : data.length === 0 ? (
        <p>{t("analytics.noData")}</p>
      ) : (
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="var(--muted-foreground)" />
              <YAxis
                allowDecimals={false}
                stroke="var(--muted-foreground)"
                tickFormatter={(value) =>
                  Number(value).toLocaleString(i18n.resolvedLanguage)
                }
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === "number"
                    ? value.toLocaleString(i18n.resolvedLanguage)
                    : value
                }
                contentStyle={{
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  borderColor: "var(--border)",
                }}
              />
              <Bar
                dataKey="count"
                name={t("analytics.tasks")}
                fill="var(--primary)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
