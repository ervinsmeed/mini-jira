import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAction } from "../../hooks/useAction";
import ColumnColorField from "./ColumnColorField";

const DEFAULT_COLUMN_COLOR = "#22d3ee";

type CreateColumnModalProps = {
  isOpen: boolean;
  onClose: () => void;
  boardId: Id<"boards">;
};

export default function CreateColumnModal({
  isOpen,
  onClose,
  boardId,
}: CreateColumnModalProps) {
  const { t } = useTranslation();
  const { pending, run } = useAction();
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLUMN_COLOR);

  const createColumn = useMutation(api.columns.create);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) return;
    await run(async () => {
      await createColumn({
        name: name.trim(),
        color: selectedColor,
        boardId,
      });

      setName("");
      setSelectedColor(DEFAULT_COLUMN_COLOR);
      onClose();
      toast.success(t("createColumn.created"));
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md border border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{t("createColumn.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <fieldset disabled={pending} className="min-w-0 space-y-6">
            <div>
              <label
                htmlFor="create-column-name"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                {t("createColumn.columnName")}
              </label>

              <input
                id="create-column-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("createColumn.placeholder")}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <ColumnColorField
              value={selectedColor}
              onChange={setSelectedColor}
              label={t("createColumn.color")}
            />

            <button
              type="submit"
              className="w-full rounded-md bg-primary py-2 font-medium text-white transition-colors hover:bg-primary/90"
            >
              {t("createColumn.create")}
            </button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
