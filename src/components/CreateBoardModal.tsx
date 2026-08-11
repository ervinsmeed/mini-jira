import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function CreateBoardModal({
  isOpen,
  onClose,
  onBoardCreated,
  theme,
}: any) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const createBoard = useMutation(api.boards.create);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!name.trim()) return;

    const board = await createBoard({
      name: name.trim(),
    });

    setName("");
    onClose();
    onBoardCreated(board);

    toast.success(
      t("createBoardModal.created", {
        name,
      }),
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-md rounded-xl border shadow-lg ${
          theme === "dark"
            ? "bg-slate-950 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl! font-semibold">
            {t("createBoardModal.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("createBoardModal.boardName")}
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createBoardModal.placeholder")}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:ring-purple-400"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-purple-500"
              }`}
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-2 rounded-lg transition focus:outline-none focus:ring-2 ${
              theme === "dark"
                ? "bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-400"
                : "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500"
            }`}
          >
            {t("createBoardModal.create")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
