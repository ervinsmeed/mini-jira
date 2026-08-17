import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function EditWorkspaceModal({ workspace, onClose, theme }: any) {
  const { t } = useTranslation();

  const [name, setName] = useState(workspace.name ?? "");
  const [description, setDescription] = useState(workspace.description ?? "");

  const updateWorkspace = useMutation(api.workspaces.update);

  useEffect(() => {
    setName(workspace.name ?? "");
    setDescription(workspace.description ?? "");
  }, [workspace._id]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!name.trim()) return;

    await updateWorkspace({
      id: workspace._id,
      name: name.trim(),
      description: description.trim(),
    });

    toast.success(t("editWorkspaceModal.updated"));

    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-md rounded-xl border shadow-lg ${
          theme === "dark"
            ? "bg-slate-950 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl! font-semibold">
            {t("editWorkspaceModal.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div>
            <label
              className={`mb-2 block text-sm font-medium ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {t("editWorkspaceModal.workspaceName")}
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              {t("editWorkspaceModal.description")}
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900 text-slate-100 focus:ring-purple-400"
                  : "border-slate-300 bg-white text-slate-900 focus:ring-purple-500"
              }`}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-purple-500 py-2 text-white transition hover:bg-purple-600"
          >
            {t("editWorkspaceModal.save")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
