import { useState, type FormEvent } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";

type ProjectStatus = "active" | "completed" | "archived";

type EditProjectModalProps = {
  project: Doc<"boards">;
  onClose: () => void;
  onProjectUpdated: (board: Doc<"boards">) => void;
};

export default function EditProjectModal({
  project,
  onProjectUpdated,
  onClose,
}: EditProjectModalProps) {
  const { t } = useTranslation();
  const { pending, run } = useAction();

  const [name, setName] = useState(project.name ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    project.status ?? "active",
  );

  const updateProject = useMutation(api.boards.update);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await run(async () => {
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();

      if (!trimmedName) return;

      const updatedProject = await updateProject({
        id: project._id,
        name: trimmedName,
        description: trimmedDescription,
        status,
      });

      onProjectUpdated(updatedProject);
      toast.success(t("editProjectModal.updated"));
      onClose();
    });
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md rounded-xl border border-border bg-background text-foreground shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl! font-semibold">
            {t("editProjectModal.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2">
          <fieldset disabled={pending} className="min-w-0 space-y-5">
            <div>
              <label
                htmlFor="edit-project-name"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                {t("editProjectModal.projectName")}
              </label>

              <input
                id="edit-project-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label
                htmlFor="edit-project-description"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                {t("editProjectModal.description")}
              </label>

              <textarea
                id="edit-project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("editProjectModal.descriptionPlaceholder")}
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label
                htmlFor="edit-project-status"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                {t("editProjectModal.status")}
              </label>

              <select
                id="edit-project-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProjectStatus)
                }
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="active">{t("editProjectModal.active")}</option>
                <option value="completed">
                  {t("editProjectModal.completed")}
                </option>
                <option value="archived">
                  {t("editProjectModal.archived")}
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-2 text-primary-foreground transition hover:bg-primary/90"
              disabled={pending}
            >
              {t("editProjectModal.save")}
            </button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
