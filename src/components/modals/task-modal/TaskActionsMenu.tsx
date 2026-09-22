import { useState } from "react";
import { Edit, MoreVertical, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/kit";

type TaskActionsMenuProps = {
  canEdit: boolean;
  canDelete: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TaskActionsMenu({
  canEdit,
  canDelete,
  pending,
  onEdit,
  onDelete,
}: TaskActionsMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!canEdit && !canDelete) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t("taskModal.actions")}
        aria-expanded={isOpen}
      >
        <MoreVertical className="size-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-9 z-20 w-52 rounded-lg border border-border bg-popover p-1 shadow-lg">
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
            >
              <Edit className="size-3.5 text-muted-foreground" />
              {t("taskModal.editTask")}
            </button>
          )}

          {canDelete &&
            (isConfirmingDelete ? (
              <div className="space-y-2 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {t("taskModal.deleteQuestion")}
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" disabled={pending} onClick={onDelete}>
                    {t("common.yes")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsConfirmingDelete(false)}>
                    {t("common.no")}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
                {t("taskModal.deleteTask")}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
