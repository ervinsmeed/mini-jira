import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";

export default function WorkspaceMembersModal({ workspace, onClose }: any) {
  const { t } = useTranslation();
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
      toast.success(t("members.added"));
    } catch (error: any) {
      toast.error(error.message || t("members.addError"));
    }
  };

  const handleRemoveMember = async (userId: any) => {
    if (!canManageMembers) return;
    try {
      await removeMember({
        workspaceId: workspace._id,
        userId,
      });

      toast.success(t("members.removed"));
    } catch (error: any) {
      toast.error(error.message || t("members.removeError"));
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

      toast.success(t("members.roleChanged"));
    } catch (error: any) {
      toast.error(error.message || t("members.roleError"));
    }
  };
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">{t("members.workspaceTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm opacity-70">{t("hints.separateRoles")}</p>
          {canManageMembers && (
            <p className="text-sm opacity-70">{t("hints.registerFirst")}</p>
          )}
          {canManageMembers && (
            <p className="text-sm opacity-70">
              {t("hints.removeWorkspaceMember")}
            </p>
          )}
          {canManageMembers && (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("members.email")}
                aria-label={t("members.email")}
                className="min-w-0 w-full flex-1 rounded-md border px-3 py-2"
              />

              <button
                type="button"
                onClick={handleAddMember}
                className="rounded-md bg-purple-500 px-4 py-2 text-white"
              >
                {t("common.add")}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {access !== undefined && !canViewMembers ? (
              <div className="text-sm opacity-70">{t("members.denied")}</div>
            ) : members === undefined ? (
              <div className="text-sm opacity-70">{t("common.loading")}</div>
            ) : members.length === 0 ? (
              <div className="text-sm opacity-70">{t("members.empty")}</div>
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
                      <div className="text-xs text-purple-500">
                        {t("members.owner")}
                      </div>
                    )}
                  </div>

                  {canManageMembers && !member.isOwner && (
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <select
                        aria-label={t("members.selectRole")}
                        value={member.roleId ?? ""}
                        onChange={(event) => {
                          if (!event.target.value) return;

                          handleChangeRole(member._id, event.target.value);
                        }}
                        className="min-w-0 max-w-full flex-1 rounded-md border bg-transparent px-2 py-1 text-sm"
                      >
                        <option value="">{t("members.noRole")}</option>

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
                        {t("common.remove")}
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
            {t("common.close")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
