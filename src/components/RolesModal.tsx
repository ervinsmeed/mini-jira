import type { Doc, Id } from "../../convex/_generated/dataModel";
import { actionError } from "../lib/actionError";
import { useAction } from "../lib/useAction";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";

type Permission =
  | "project.view"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "task.view"
  | "task.create"
  | "task.update"
  | "task.delete"
  | "members.manage"
  | "roles.manage"
  | "analytics.view";

const permissionsList: {
  value: Permission;
  label: string;
}[] = [
  { value: "project.view", label: "permissions.project.view" },
  { value: "project.create", label: "permissions.project.create" },
  { value: "project.update", label: "permissions.project.update" },
  { value: "project.delete", label: "permissions.project.delete" },

  { value: "task.view", label: "permissions.task.view" },
  { value: "task.create", label: "permissions.task.create" },
  { value: "task.update", label: "permissions.task.update" },
  { value: "task.delete", label: "permissions.task.delete" },

  { value: "members.manage", label: "permissions.members.manage" },
  { value: "roles.manage", label: "permissions.roles.manage" },
  { value: "analytics.view", label: "permissions.analytics.view" },
];

export default function RolesModal({
  workspace,
  onClose,
}: {
  workspace: Doc<"workspaces">;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { pending, run } = useAction();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState(10);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editingRole, setEditingRole] = useState<Doc<"roles"> | null>(null);

  const {
    results: roles,
    status: roleStatus,
    loadMore: loadRoles,
  } = usePaginatedQuery(
    api.roles.rolesPage,
    { workspaceId: workspace._id },
    { initialNumItems: 30 },
  );

  const createRole = useMutation(api.roles.create);
  const updateRole = useMutation(api.roles.update);
  const removeRole = useMutation(api.roles.remove);

  const resetForm = () => {
    setName("");
    setDescription("");
    setLevel(10);
    setPermissions([]);
    setEditingRole(null);
  };

  const handlePermissionChange = (permission: Permission) => {
    setPermissions((currentPermissions) => {
      if (currentPermissions.includes(permission)) {
        return currentPermissions.filter((item) => item !== permission);
      }

      return [...currentPermissions, permission];
    });
  };

  const handleSubmit = async () => {
    await run(async () => {
      if (!name.trim()) {
        toast.error(t("roles.nameRequired"));
        return;
      }

      try {
        if (editingRole) {
          await updateRole({
            id: editingRole._id,
            name: name.trim(),
            description: description.trim(),
            level,
            permissions,
          });

          toast.success(t("roles.updated"));
        } else {
          await createRole({
            workspaceId: workspace._id,
            name: name.trim(),
            description: description.trim() || undefined,
            level,
            permissions,
          });

          toast.success(t("roles.created"));
        }

        resetForm();
      } catch (error) {
        toast.error(actionError(error, t));
      }
    });
  };

  const handleEditRole = (role: Doc<"roles">) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description ?? "");
    setLevel(role.level);
    setPermissions(role.permissions ?? []);
  };

  const handleDeleteRole = async (roleId: Id<"roles">) => {
    await run(async () => {
      try {
        await removeRole({
          id: roleId,
        });

        if (editingRole?._id === roleId) {
          resetForm();
        }

        toast.success(t("roles.deleted"));
      } catch (error) {
        toast.error(actionError(error, t));
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">
            {t("roles.title")}
          </DialogTitle>
        </DialogHeader>
        {roleStatus === "CanLoadMore" && (
          <button type="button" onClick={() => loadRoles(30)}>
            {t("pagination.loadMore")}
          </button>
        )}

        <div className="space-y-4">
          <p className="text-sm opacity-70">{t("hints.separateRoles")}</p>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("roles.name")}</label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("roles.namePlaceholder")}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("common.description")}
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("roles.descriptionPlaceholder")}
              className="min-h-20 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("roles.level")}</label>

            <input
              type="number"
              value={level}
              min={1}
              onChange={(event) => setLevel(Number(event.target.value))}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            />

            <p className="text-xs opacity-60">{t("hints.roleLevel")}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("roles.permissions")}</p>

            <div className="grid gap-2 sm:grid-cols-2">
              {permissionsList.map((permission) => (
                <label
                  key={permission.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission.value)}
                    onChange={() => handlePermissionChange(permission.value)}
                  />

                  <span>{t(permission.label)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              disabled={pending}
            >
              {editingRole ? t("roles.save") : t("roles.create")}
            </button>

            {editingRole && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border px-4 py-2 text-sm"
                disabled={pending}
              >
                {t("common.cancel")}
              </button>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-semibold">
              {t("roles.existing")}
            </h3>

            {roles === undefined && (
              <p className="text-sm opacity-60">{t("common.loading")}</p>
            )}

            {roles?.length === 0 && (
              <p className="text-sm opacity-60">{t("roles.empty")}</p>
            )}

            <div className="space-y-2">
              {roles?.map((role: Doc<"roles">) => (
                <div key={role._id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{role.name}</p>

                      <p className="text-xs opacity-60">
                        {t("roles.level")}: {role.level}
                      </p>

                      {role.description && (
                        <p className="mt-1 text-sm opacity-70">
                          {role.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditRole(role)}
                        className="rounded-md border px-2 py-1 text-xs"
                        disabled={pending}
                      >
                        {t("common.edit")}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role._id)}
                        className="rounded-md border px-2 py-1 text-xs"
                        disabled={pending}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {role.permissions.map((permission: Permission) => (
                      <span
                        key={permission}
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        {t(`permissions.${permission}`)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border px-4 py-2 text-sm"
            disabled={pending}
          >
            {t("common.close")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
