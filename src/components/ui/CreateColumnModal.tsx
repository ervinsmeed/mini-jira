import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./Dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const PRESET_COLORS = [
  "#22d3ee",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#10b981",
];

type CreateColumnModalProps = {
  isOpen: boolean;
  onClose: () => void;
  boardId: Id<"boards">;
  theme: "light" | "dark";
};

export default function CreateColumnModal({
  isOpen,
  onClose,
  boardId,
  theme,
}: CreateColumnModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const createColumn = useMutation(api.columns.create);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) return;

    await createColumn({
      name: name.trim(),
      color: selectedColor,
      boardId,
    });

    setName("");
    setSelectedColor(PRESET_COLORS[0]);
    onClose();
    toast.success(t("createColumn.created"));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`max-w-md border ${
          theme === "dark"
            ? "border-slate-700 bg-slate-900 text-slate-100"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <DialogHeader>
          <DialogTitle>{t("createColumn.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {t("createColumn.columnName")}
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createColumn.placeholder")}
              className={`w-full rounded-md border px-3 py-2 transition focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-400 focus:ring-purple-500"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-purple-500"
              }`}
              required
            />
          </div>
          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {t("createColumn.color")}
            </label>

            <div className="grid grid-cols-4 gap-4">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`size-12 rounded-lg border-2 transition-all ${
                    selectedColor === color
                      ? "border-purple-500 scale-110"
                      : theme === "dark"
                        ? "border-slate-700 hover:scale-105"
                        : "border-slate-300 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-purple-500 text-white rounded-md font-medium hover:bg-purple-600 transition-colors"
          >
            {t("createColumn.create")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
