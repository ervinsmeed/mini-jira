import { useEffect, useRef, useState, type FormEvent } from "react";
import { actionError } from "../lib/actionError";
import { ArrowLeft, UserRound } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { api } from "../../convex/_generated/api";

type ProfileProps = {
  theme: "light" | "dark";
  onBack: () => void;
};

export default function Profile({ theme, onBack }: ProfileProps) {
  const { t } = useTranslation();

  const assignedRoles = useQuery(api.users.myRoles);
  const currentUser = useQuery(api.users.getCurrent);
  const updateProfile = useMutation(api.users.updateProfile);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useRef(false);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setFirstName(currentUser.firstName ?? "");
    setLastName(currentUser.lastName ?? "");
    setPosition(currentUser.position ?? "");
    setAvatar(currentUser.avatar ?? "");
  }, [currentUser]);

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
    theme === "dark"
      ? "border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-purple-500"
      : "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-purple-500";

  if (currentUser === undefined) {
    return (
      <div
        className={`flex h-screen items-center justify-center ${
          theme === "dark" ? "bg-slate-950" : "bg-slate-50"
        }`}
      >
        <div className="size-10 animate-spin rounded-full border-4 border-slate-600 border-t-purple-500" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-slate-950 text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      <header
        className={`flex items-center justify-between border-b px-6 py-4 ${
          theme === "dark"
            ? "border-slate-800 bg-slate-950"
            : "border-slate-200 bg-white"
        }`}
      >
        <div>
          <h1 className="text-2xl font-bold">{t("profile.title")}</h1>

          <p
            className={`mt-1 text-sm ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {t("profile.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${
            theme === "dark"
              ? "border-slate-700 bg-slate-900 hover:bg-slate-800"
              : "border-slate-300 bg-white hover:bg-slate-100"
          }`}
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
          className={`rounded-xl border p-6 shadow-sm ${
            theme === "dark"
              ? "border-slate-800 bg-slate-900"
              : "border-slate-200 bg-white"
          }`}
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

              <p
                className={`truncate text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
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
