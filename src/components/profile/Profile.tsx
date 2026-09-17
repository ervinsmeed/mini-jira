import { useRef, useState, type FormEvent } from "react";
import { actionError } from "../../lib/actionError";
import { ArrowLeft, UserRound } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";

type ProfileProps = {
  onBack: () => void;
};
export default function Profile({ onBack }: ProfileProps) {
  const { t } = useTranslation();
  const currentUser = useQuery(api.users.getCurrent);

  if (currentUser === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="size-10 animate-spin rounded-full border-4 border-slate-600 border-t-purple-500" />
      </div>
    );
  }

  if (currentUser === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p>{t("common.actionError")}</p>
        <button type="button" onClick={onBack}>
          {t("navigation.backToBoard")}
        </button>
      </div>
    );
  }

  return (
    <ProfileContent
      key={currentUser._id}
      currentUser={currentUser}
      onBack={onBack}
    />
  );
}

type ProfileContentProps = ProfileProps & {
  currentUser: Doc<"users">;
};

function ProfileContent({ currentUser, onBack }: ProfileContentProps) {
  const { t } = useTranslation();
  const assignedRoles = useQuery(api.users.myRoles);
  const updateProfile = useMutation(api.users.updateProfile);

  const [firstName, setFirstName] = useState(currentUser.firstName ?? "");
  const [lastName, setLastName] = useState(currentUser.lastName ?? "");
  const [position, setPosition] = useState(currentUser.position ?? "");
  const [avatar, setAvatar] = useState(currentUser.avatar ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saveLock.current) return;
    saveLock.current = true;
    setIsSaving(true);

    try {
      await updateProfile({
        firstName,
        lastName,
        position,
        avatar,
      });

      toast.success(t("profile.updated"));
    } catch (error) {
      toast.error(actionError(error, t));
    } finally {
      saveLock.current = false;
      setIsSaving(false);
    }
  };

  const inputClass =
    "border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-primary";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">{t("profile.title")}</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("profile.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          {t("navigation.backToBoard")}
        </button>
      </header>

      <main className="mx-auto w-full max-w-3xl p-6">
        <section className="mb-6 rounded-lg border border-border bg-card p-4">
          <h2>{t("profile.assignedRoles")}</h2>
          {assignedRoles === undefined ? (
            <p>{t("common.loading")}</p>
          ) : assignedRoles.length === 0 ? (
            <p>{t("profile.noRoles")}</p>
          ) : (
            assignedRoles.map((entry) => (
              <p key={entry.id}>
                {entry.workspace}
                {entry.project ? ` / ${entry.project}` : ""}:{" "}
                {entry.owner
                  ? t("members.owner")
                  : (entry.role ?? t("profile.noRole"))}
              </p>
            ))
          )}
        </section>
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-6 text-foreground shadow-sm"
        >
          <div className="mb-8 flex items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt={currentUser.name}
                className="size-20 rounded-full border border-slate-700 object-cover"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                <UserRound className="size-10" />
              </div>
            )}

            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">
                {currentUser.name}
              </h2>

              <p className="truncate text-sm text-muted-foreground">
                {currentUser.email}
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">
                {t("profile.firstName")}
              </span>

              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder={t("profile.firstName")}
                maxLength={60}
                className={`w-full rounded-md border px-3 py-2 outline-none ${inputClass}`}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">
                {t("profile.lastName")}
              </span>

              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder={t("profile.lastName")}
                maxLength={60}
                className={`w-full rounded-md border px-3 py-2 outline-none ${inputClass}`}
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">
                {t("profile.position")}
              </span>

              <input
                type="text"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                placeholder={t("profile.positionPlaceholder")}
                maxLength={100}
                className={`w-full rounded-md border px-3 py-2 outline-none ${inputClass}`}
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">
                {t("profile.avatarUrl")}
              </span>

              <input
                type="url"
                value={avatar}
                onChange={(event) => setAvatar(event.target.value)}
                placeholder={t("profile.avatarPlaceholder")}
                className={`w-full rounded-md border px-3 py-2 outline-none ${inputClass}`}
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium">{t("profile.email")}</span>

              <input
                type="email"
                value={currentUser.email}
                readOnly
                className={`w-full cursor-not-allowed rounded-md border px-3 py-2 opacity-70 ${inputClass}`}
              />
            </label>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-purple-500 px-5 py-2 font-medium text-white hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? t("profile.saving") : t("profile.save")}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
