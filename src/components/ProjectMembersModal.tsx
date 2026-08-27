import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";

export default function ProjectMembersModal({ project, onClose }: any) {
  const [email, setEmail] = useState("");

  const members = useQuery(
    api.boardMembers.list,
    project?._id ? { boardId: project._id } : "skip",
  );

  const roles = useQuery(
    api.roles.list,
    project?.workspaceId
      ? {
          workspaceId: project.workspaceId,
        }
      : "skip",
  );

  const addMember = useMutation(api.boardMembers.addByEmail);
  const removeMember = useMutation(api.boardMembers.remove);
  const changeRole = useMutation(api.boardMembers.changeRole);

  const handleAddMember = async () => {
    if (!email.trim()) return;

    try {
      await addMember({
        boardId: project._id,
        email: email.trim(),
      });

      setEmail("");
      toast.success("Member added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: any) => {
    try {
      await removeMember({
        boardId: project._id,
        userId,
      });

      toast.success("Member removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    }
  };

  const handleChangeRole = async (userId: any, roleId: any) => {
    try {
      await changeRole({
        boardId: project._id,
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
          <DialogTitle>Project Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
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
          </div>

          <div className="space-y-2">
            {members === undefined ? (
              <div className="text-sm opacity-70">Loading...</div>
            ) : members.length === 0 ? (
              <div className="text-sm opacity-70">No members</div>
            ) : (
              members.map((member: any) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{member.name}</div>

                    <div className="truncate text-sm opacity-70">
                      {member.email}
                    </div>

                    {member.isOwner && (
                      <div className="text-xs text-purple-500">Owner</div>
                    )}
                  </div>

                  {!member.isOwner && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.roleId ?? undefined}
                        onValueChange={(roleId) =>
                          handleChangeRole(member._id, roleId)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>

                        <SelectContent>
                          {(roles ?? []).map((role: any) => (
                            <SelectItem key={role._id} value={role._id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member._id)}
                        className="text-sm text-red-400 hover:text-red-500"
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
