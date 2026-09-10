import { useTranslation } from "react-i18next";
import { getColumnLabel } from "../../lib/columnLabel";

export default function HistoryValue({
  field,
  value,
}: {
  field: string;
  value: string | number | null;
}) {
  const { t, i18n } = useTranslation();
  if (value === null) return <>{t("common.none")}</>;
  if (field === "deadline" && typeof value === "number")
    return <>{new Date(value).toLocaleString(i18n.resolvedLanguage)}</>;
  if (field === "priority" && ["high", "medium", "low"].includes(String(value)))
    return <>{t(`priority.${value}`)}</>;
  if (field === "taskType")
    return <>{t(`historyTypes.${value}`, { defaultValue: String(value) })}</>;
  if (field === "columnId") return <>{getColumnLabel(String(value), t)}</>;
  if (field === "subtasks" && typeof value === "string") {
    // Only the new structured field produced by taskChanges is JSON, never legacy details.
    let items: unknown;
    try {
      items = JSON.parse(value);
    } catch {
      /* Preserve an unexpected value verbatim, without losing user content. */
    }
    if (
      Array.isArray(items) &&
      items.every(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "text" in item &&
          typeof item.text === "string" &&
          "completed" in item &&
          typeof item.completed === "boolean",
      )
    ) {
      return (
        <>
          {items.map(
            (item: { text: string; completed: boolean }, index: number) => (
              <span className="block" key={index}>
                {item.text} —{" "}
                {t(
                  item.completed
                    ? "historyTypes.completed"
                    : "historyTypes.pending",
                )}
              </span>
            ),
          )}
        </>
      );
    }
  }
  return (
    <>
      {typeof value === "number"
        ? value.toLocaleString(i18n.resolvedLanguage)
        : value}
    </>
  );
}
