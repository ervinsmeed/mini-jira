import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./Dialog";
import { toast } from "sonner";

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
    toast.success("New column");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`max-w-md border ${
          theme === "dark"
            ? "border-slate-700 bg-slate-900"
            : "border-slate-300 bg-slate-100"
        }`}
      >
        <DialogHeader>
          <DialogTitle>Create New Column</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Column Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. In Review"
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Column Color
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
                      : "border-slate-800 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-purple-500 text-white rounded-m font-medium hover:bg-purple-600 transition-colors"
          >
            Create Column
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
