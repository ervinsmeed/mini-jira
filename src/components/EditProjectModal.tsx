/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { api } from "../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";

export default function EditProjectModal({
  project,
  onProjectUpdated,
  onClose,
  theme,
}: any) {
  const { t } = useTranslation();

  const [name, setName] = useState(project.name ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<"active" | "completed" | "archived">(
    project.status ?? "active",
  );

  const updateProject = useMutation(api.boards.update);

  useEffect(() => {
    setName(project.name ?? "");
    setDescription(project.description ?? "");
    setStatus(project.status ?? "active");
  }, [project._id, project.name, project.description, project.status]);

  const handleSubmit = async (event: any) => {
    event.preventDefault();

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

    toast.success(t("editProjectModal.updated"));

    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-md rounded-xl border shadow-lg ${
          theme === "dark"
            ? "border-slate-800 bg-slate-950 text-slate-100"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl! font-semibold">
            {t("editProjectModal.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("editProjectModal.projectName")}
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900 text-slate-100 focus:ring-purple-400"
                  : "border-slate-300 bg-white text-slate-900 focus:ring-purple-500"
              }`}
              required
            />
          </div>

          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("editProjectModal.description")}
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("editProjectModal.descriptionPlaceholder")}
              rows={4}
              className={`w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-purple-400"
                  : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-purple-500"
              }`}
            />
          </div>

          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("editProjectModal.status")}
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as "active" | "completed" | "archived",
                )
              }
              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900 text-slate-100 focus:ring-purple-400"
                  : "border-slate-300 bg-white text-slate-900 focus:ring-purple-500"
              }`}
            >
              <option value="active">{t("editProjectModal.active")}</option>
              <option value="completed">
                {t("editProjectModal.completed")}
              </option>
              <option value="archived">{t("editProjectModal.archived")}</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-purple-500 py-2 text-white transition hover:bg-purple-600"
          >
            {t("editProjectModal.save")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
