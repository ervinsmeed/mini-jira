import type { FormEvent } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function CreateBoardModal({
  isOpen,
  onClose,
  onBoardCreated,
  workspaceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onBoardCreated: (board: Doc<"boards">) => void;
  workspaceId?: Id<"workspaces">;
}) {
  const { t } = useTranslation();
  const { pending, run } = useAction();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createBoard = useMutation(api.boards.create);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await run(async () => {
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();

      if (!trimmedName) return;

      const board = await createBoard({
        name: trimmedName,
        description: trimmedDescription || undefined,
        workspaceId: workspaceId ?? undefined,
      });

      setName("");
      setDescription("");

      onClose();
      onBoardCreated(board);

      toast.success(
        t("createBoardModal.created", {
          name: trimmedName,
        }),
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl! font-semibold">
            {t("createBoardModal.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <fieldset disabled={pending} className="contents">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                {t("createBoardModal.boardName")}
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("createBoardModal.placeholder")}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                {t("createBoardModal.description")}
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("createBoardModal.descriptionPlaceholder")}
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-2 text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={pending}
            >
              {t("createBoardModal.create")}
            </button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
