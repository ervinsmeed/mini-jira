import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
  { value: "project.view", label: "View Projects" },
  { value: "project.create", label: "Create Projects" },
  { value: "project.update", label: "Edit Projects" },
  { value: "project.delete", label: "Delete Projects" },

  { value: "task.view", label: "View Tasks" },
  { value: "task.create", label: "Create Tasks" },
  { value: "task.update", label: "Edit Tasks" },
  { value: "task.delete", label: "Delete Tasks" },

  { value: "members.manage", label: "Manage Members" },
  { value: "roles.manage", label: "Manage Roles" },
  { value: "analytics.view", label: "View Analytics" },
];

export default function RolesModal({ workspace, onClose }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState(10);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editingRole, setEditingRole] = useState<any>(null);

  const roles = useQuery(
    api.roles.list,
    workspace?._id
      ? {
          workspaceId: workspace._id,
        }
      : "skip",
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
    if (!name.trim()) {
      toast.error("Role name is required");
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

        toast.success("Role updated successfully");
      } else {
        await createRole({
          workspaceId: workspace._id,
          name: name.trim(),
          description: description.trim() || undefined,
          level,
          permissions,
        });

        toast.success("Role created successfully");
      }

      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description ?? "");
    setLevel(role.level);
    setPermissions(role.permissions ?? []);
  };

  const handleDeleteRole = async (roleId: any) => {
    try {
      await removeRole({
        id: roleId,
      });

      if (editingRole?._id === roleId) {
        resetForm();
      }

      toast.success("Role deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete role",
      );
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workspace Roles</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role Name</label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Developer"
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Role description"
              className="min-h-20 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Level</label>

            <input
              type="number"
              value={level}
              min={1}
              onChange={(event) => setLevel(Number(event.target.value))}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            />

            <p className="text-xs opacity-60">
              Higher number means higher role level.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Permissions</p>

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

                  <span>{permission.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-md border px-4 py-2 text-sm"
            >
              {editingRole ? "Save Role" : "Create Role"}
            </button>

            {editingRole && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-semibold">Existing Roles</h3>

            {roles === undefined && (
              <p className="text-sm opacity-60">Loading...</p>
            )}

            {roles?.length === 0 && (
              <p className="text-sm opacity-60">No roles yet.</p>
            )}

            <div className="space-y-2">
              {roles?.map((role: any) => (
                <div key={role._id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{role.name}</p>

                      <p className="text-xs opacity-60">Level: {role.level}</p>

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
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role._id)}
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {role.permissions.map((permission: Permission) => (
                      <span
                        key={permission}
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        {permission}
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
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
