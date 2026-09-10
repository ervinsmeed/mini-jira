import { ConvexError } from "convex/values";
import type { TFunction } from "i18next";

export function actionError(error: unknown, t: TFunction): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (
      typeof data === "object" &&
      data &&
      "code" in data &&
      typeof data.code === "string"
    ) {
      return t(`errors.${data.code}`, {
        defaultValue: t("common.actionError"),
      });
    }
  }
  return t("common.actionError");
}
