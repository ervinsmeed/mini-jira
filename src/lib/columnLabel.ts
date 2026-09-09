import type { TFunction } from "i18next";

const COLUMN_TRANSLATION_KEYS: Record<string, string> = {
  backlog: "analytics.status.backlog",
  "to do": "analytics.status.toDo",
  "in progress": "analytics.status.inProgress",
  review: "analytics.status.review",
  testing: "analytics.status.testing",
  done: "analytics.status.done",
};

// Keep the board's existing display convention; never change stored names.
export function getColumnLabel(name: string, t: TFunction): string {
  const key = COLUMN_TRANSLATION_KEYS[name.trim().toLowerCase()];
  return key ? t(key, { defaultValue: name }) : name;
}
