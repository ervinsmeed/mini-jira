import type { FormEvent } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onWorkspaceCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated: (workspace: Doc<"workspaces">) => void;
}) {
  const { t } = useTranslation();
  const { pending, run } = useAction();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createWorkspace = useMutation(api.workspaces.create);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await run(async () => {
      if (!name.trim()) return;

      const workspace = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      toast.success(
        t("createWorkspaceModal.created", {
          name,
        }),
      );

      setName("");
      setDescription("");

      onClose();
      onWorkspaceCreated(workspace);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl! font-semibold">
            {t("createWorkspaceModal.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <fieldset disabled={pending} className="contents">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                {t("createWorkspaceModal.workspaceName")}
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("createWorkspaceModal.namePlaceholder")}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                {t("createWorkspaceModal.description")}
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("createWorkspaceModal.descriptionPlaceholder")}
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none transition focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-2 text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={pending}
            >
              {t("createWorkspaceModal.create")}
            </button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
