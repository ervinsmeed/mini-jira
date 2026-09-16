import type { FormEvent } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function EditWorkspaceModal({
  workspace,
  onClose,
}: {
  workspace: Doc<"workspaces">;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { pending, run } = useAction();

  const [name, setName] = useState(workspace.name ?? "");
  const [description, setDescription] = useState(workspace.description ?? "");

  const updateWorkspace = useMutation(api.workspaces.update);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await run(async () => {
      if (!name.trim()) return;

      await updateWorkspace({
        id: workspace._id,
        name: name.trim(),
        description: description.trim(),
      });

      toast.success(t("editWorkspaceModal.updated"));

      onClose();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl! font-semibold">
            {t("editWorkspaceModal.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <fieldset disabled={pending} className="contents">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                {t("editWorkspaceModal.workspaceName")}
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                {t("editWorkspaceModal.description")}
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-purple-500 py-2 text-white transition hover:bg-purple-600"
              disabled={pending}
            >
              {t("editWorkspaceModal.save")}
            </button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
