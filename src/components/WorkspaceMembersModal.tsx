import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";

export default function WorkspaceMembersModal({ workspace, onClose }: any) {
  const [email, setEmail] = useState("");

  const access = useQuery(
    api.workspaceMembers.getCurrentAccess,
    workspace?._id ? { workspaceId: workspace._id } : "skip",
  );
  const canManageMembers = Boolean(
    access?.isOwner || access?.permissions.includes("members.manage"),
  );
  const canViewMembers = canManageMembers;

  const members = useQuery(
    api.workspaceMembers.list,
    canViewMembers ? { workspaceId: workspace._id } : "skip",
  );

  const roles = useQuery(
    api.roles.list,
    canManageMembers ? { workspaceId: workspace._id } : "skip",
  );

  const addMember = useMutation(api.workspaceMembers.addByEmail);
  const removeMember = useMutation(api.workspaceMembers.remove);
  const changeRole = useMutation(api.workspaceMembers.changeRole);

  const handleAddMember = async () => {
    if (!canManageMembers || !email.trim()) return;

    try {
      await addMember({
        workspaceId: workspace._id,
        email: email.trim(),
      });

      setEmail("");
      toast.success("Member added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: any) => {
    if (!canManageMembers) return;
    try {
      await removeMember({
        workspaceId: workspace._id,
        userId,
      });

      toast.success("Member removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    }
  };
  const handleChangeRole = async (userId: any, roleId: any) => {
    if (!canManageMembers) return;
    try {
      await changeRole({
        workspaceId: workspace._id,
        userId,
        roleId,
      });

      toast.success("Role changed");
    } catch (error: any) {
      toast.error(error.message || "Failed to change role");
    }
  };
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workspace Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {canManageMembers && <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter user email"
              className="flex-1 rounded-md border px-3 py-2"
            />

            <button
              type="button"
              onClick={handleAddMember}
              className="rounded-md bg-purple-500 px-4 py-2 text-white"
            >
              Add
            </button>
          </div>}

          <div className="space-y-2">
            {access !== undefined && !canViewMembers ? (
              <div className="text-sm opacity-70">Access denied</div>
            ) : members === undefined ? (
              <div className="text-sm opacity-70">Loading...</div>
            ) : members.length === 0 ? (
              <div className="text-sm opacity-70">No members</div>
            ) : (
              members.map((member: any) => (
                <div
                  key={member._id}
                  className="flex min-w-0 flex-col gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{member.name}</div>

                    <div className="break-all text-sm opacity-70">
                      {member.email}
                    </div>

                    {member.isOwner && (
                      <div className="text-xs text-purple-500">Owner</div>
                    )}
                  </div>

                  {canManageMembers && !member.isOwner && (
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <select
                        value={member.roleId ?? ""}
                        onChange={(event) => {
                          if (!event.target.value) return;

                          handleChangeRole(member._id, event.target.value);
                        }}
                        className="min-w-0 max-w-full flex-1 rounded-md border bg-transparent px-2 py-1 text-sm"
                      >
                        <option value="">No role</option>

                        {roles?.map((role: any) => (
                          <option key={role._id} value={role._id}>
                            {role.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member._id)}
                        className="shrink-0 text-sm text-red-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border px-4 py-2"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
