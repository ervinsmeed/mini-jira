import type { Doc } from "../../../convex/_generated/dataModel";
import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAction } from "../../hooks/useAction";
import ColumnColorField from "./ColumnColorField";

type EditColumnModalProps = {
  column: Doc<"columns">;
  onClose: () => void;
};

export default function EditColumnModal({
  column,
  onClose,
}: EditColumnModalProps) {
  const { t } = useTranslation();
  const { pending, run } = useAction();
  const [name, setName] = useState(column.name);
  const [selectedColor, setSelectedColor] = useState(column.color);

  const updateColumn = useMutation(api.columns.update);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) return;

    await run(async () => {
      await updateColumn({
        id: column._id,
        name: name.trim(),
        color: selectedColor,
      });

      onClose();
      toast.success(t("editColumn.updated"));
    });
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md border border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{t("editColumn.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <fieldset disabled={pending} className="min-w-0 space-y-6">
            <div>
              <label
                htmlFor="edit-column-name"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                {t("editColumn.columnName")}
              </label>

              <input
                id="edit-column-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("editColumn.placeholder")}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <ColumnColorField
              value={selectedColor}
              onChange={setSelectedColor}
              label={t("editColumn.color")}
            />

            <button
              type="submit"
              className="w-full rounded-md bg-primary py-2 font-medium text-white transition-colors hover:bg-primary/90"
            >
              {t("editColumn.update")}
            </button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
