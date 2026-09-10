import HistoryValue from "./HistoryValue";
import { actionError } from "../../lib/actionError";
import type { Doc } from "../../../convex/_generated/dataModel";
import { getColumnLabel } from "../../lib/columnLabel";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import EditTaskModal from "../EditTaskModal";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./Dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

import { Checkbox } from "./checkbox";
import { Edit, MoreVertical, Trash2, CalendarDays, X } from "lucide-react";

export default function TaskModal({
  task: initialTask,
  onClose,
  theme,
}: {
  task: Doc<"tasks">;
  onClose: () => void;
  theme: "light" | "dark";
  can?: (permission: string) => boolean;
}) {
  const { t, i18n } = useTranslation();
  const access = useQuery(api.boards.getCurrentAccess, {
    boardId: initialTask.boardId,
  });
  const can = (permission: string) =>
    Boolean(
      access?.isOwner ||
      access?.permissions.some((value: string) => value === permission),
    );

  const [showActions, setShowActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const liveTask = useQuery(api.tasks.get, { id: initialTask._id });
  const task = liveTask ?? initialTask;
  const columnId = task.columnId;
  const assigneeId = task.assigneeId ?? "";
  const [actionPending, setActionPending] = useState(false);
  const actionLock = useRef(false);
  const runAction = async (action: () => Promise<unknown>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setActionPending(true);
    try {
      await action();
    } catch (error) {
      toast.error(actionError(error, t));
    } finally {
      actionLock.current = false;
      setActionPending(false);
    }
  };

  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);
  const startTimer = useMutation(api.tasks.startTimer);
  const pauseTimer = useMutation(api.tasks.pauseTimer);
  const stopTimer = useMutation(api.tasks.stopTimer);

  const [isTimerPending, setIsTimerPending] = useState(false);
  const timerCommandInFlight = useRef(false);

  const [now, setNow] = useState(Date.now());

  const columns: Doc<"columns">[] =
    useQuery(api.columns.list, {
      boardId: task.boardId,
    }) ?? [];

  const {
    results: projectMembers,
    status: memberStatus,
    loadMore: loadMembers,
  } = usePaginatedQuery(
    api.boardMembers.projectMembersPage,
    { boardId: task.boardId },
    { initialNumItems: 30 },
  );
  const {
    results: activityLogs,
    status: activityStatus,
    loadMore: loadActivity,
  } = usePaginatedQuery(
    api.tasks.activityPage,
    { taskId: task._id },
    { initialNumItems: 20 },
  );
  const {
    results: comments,
    status: commentStatus,
    loadMore: loadComments,
  } = usePaginatedQuery(
    api.tasks.commentsPage,
    { taskId: task._id },
    { initialNumItems: 20 },
  );

  const addComment = useMutation(api.tasks.addComment);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (task.timerStatus !== "running") {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [task.timerStatus, task.timerStartedAt]);

  const handleColumnChange = async (value: string) => {
    const newColumnId = columns.find((column) => column._id === value)?._id;
    if (!newColumnId) return;

    await updateTask({
      id: task._id,
      columnId: newColumnId,
    });
  };

  const handleAssigneeChange = async (value: string) => {
    const newAssigneeId =
      value === "unassigned"
        ? null
        : projectMembers.find((member) => member._id === value)?._id;
    if (newAssigneeId === undefined) return;

    await updateTask({
      id: task._id,
      assigneeId: newAssigneeId,
    });
  };

  const handleSubtaskToggle = async (subtaskIndex: number) => {
    const updatedSubtasks = (task.subtasks ?? []).map(
      (subtask, index: number) =>
        index === subtaskIndex
          ? {
              ...subtask,
              completed: !subtask.completed,
            }
          : subtask,
    );

    await updateTask({
      id: task._id,
      subtasks: updatedSubtasks,
    });
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      return;
    }

    await addComment({
      taskId: task._id,
      text: commentText.trim(),
    });

    setCommentText("");
  };

  const handleDeleteTask = async () => {
    if (!can("task.delete")) return;
    await deleteTask({
      id: task._id,
    });

    onClose();

    toast.success(t("taskModal.deleted"));
  };

  const completedSubtasks = task.subtasks
    ? task.subtasks.filter((st) => st.completed).length
    : 0;

  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  const isOverdue = task.deadline !== undefined && task.deadline < Date.now();

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString(i18n.resolvedLanguage)
    : "";
  const timerElapsedMs =
    (task.timerElapsedMs ?? 0) +
    (task.timerStatus === "running" && task.timerStartedAt !== undefined
      ? Math.max(0, now - task.timerStartedAt)
      : 0);

  const formatTimer = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  };

  const runTimerCommand = async (command: "start" | "pause" | "stop") => {
    if (!can("task.update") || timerCommandInFlight.current) return;

    // The ref also blocks a second click before React renders the pending state.
    timerCommandInFlight.current = true;
    setIsTimerPending(true);
    try {
      const mutations = {
        start: startTimer,
        pause: pauseTimer,
        stop: stopTimer,
      };
      await mutations[command]({ id: task._id });
    } catch {
      toast.error(t(`taskModal.timerErrors.${command}`));
    } finally {
      timerCommandInFlight.current = false;
      setIsTimerPending(false);
    }
  };

  const handleStartTimer = () => runTimerCommand("start");
  const handlePauseTimer = () => runTimerCommand("pause");
  const handleStopTimer = () => runTimerCommand("stop");

  if (liveTask === null)
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <p>{t("common.actionError")}</p>
        </DialogContent>
      </Dialog>
    );

  if (showEditModal && can("task.update")) {
    return (
      <EditTaskModal
        task={task}
        onClose={() => setShowEditModal(false)}
        canUpdate={can("task.update")}
        theme={theme}
      />
    );
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`w-[calc(100%-2rem)] min-w-0 max-w-lg sm:max-w-lg max-h-[min(600px,calc(100dvh-2rem))] overflow-y-auto wrap-anywhere [&>*]:min-w-0 transition-colors border ${
          theme === "dark"
            ? "bg-slate-950 text-slate-100 border-slate-800"
            : "bg-white text-slate-900 border-slate-200"
        }`}
      >
        <DialogHeader>
          <div className="relative flex min-w-0 items-start justify-between gap-4 pr-20">
            <DialogTitle
              className={`min-w-0 flex-1 !text-xl font-semibold pr-2 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {task.title}
            </DialogTitle>

            <div className="absolute right-0 top-0 z-20 flex items-center gap-[10px]">
              {(can("task.update") || can("task.delete")) && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowActions(!showActions)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-colors outline-none focus-visible:ring-1 focus-visible:ring-slate-500 focus-visible:ring-offset-0 ${
                      theme === "dark"
                        ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                    aria-label={t("taskModal.actions")}
                  >
                    <MoreVertical className="size-4" />
                  </button>

                  {showActions && (
                    <div
                      className={`absolute right-0 top-8 z-20 w-[210px] max-w-[calc(100vw-7rem)] rounded-lg border shadow-lg ${
                        theme === "dark"
                          ? "border-slate-700 bg-slate-900"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {can("task.update") && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditModal(true);
                            setShowActions(false);
                          }}
                          className={`flex min-w-0 w-full items-center gap-3 whitespace-normal rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            theme === "dark"
                              ? "text-slate-100 hover:bg-slate-800"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <Edit
                            className={`size-3.5 shrink-0 ${
                              theme === "dark"
                                ? "text-slate-400"
                                : "text-slate-500"
                            }`}
                          />
                          <span>{t("taskModal.editTask")}</span>
                        </button>
                      )}

                      {can("task.delete") && (
                        <>
                          <div className="border-t border-slate-700" />

                          {showDeleteConfirm ? (
                            <div className="px-3 py-2">
                              <p
                                className={`text-xs py-2 ${
                                  theme === "dark"
                                    ? "text-slate-400"
                                    : "text-slate-500"
                                }`}
                              >
                                {t("taskModal.deleteQuestion")}
                              </p>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={actionPending}
                                  onClick={() =>
                                    void runAction(handleDeleteTask)
                                  }
                                  className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  {t("common.yes")}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setShowDeleteConfirm(false)}
                                  className={`text-xs px-2 py-1 rounded transition-colors ${
                                    theme === "dark"
                                      ? "bg-slate-950 text-slate-100 hover:bg-slate-800"
                                      : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                                  }`}
                                >
                                  {t("common.no")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirm(true)}
                              className={`flex min-w-0 w-full items-center gap-3 whitespace-normal rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                                theme === "dark"
                                  ? "text-red-400 hover:bg-red-950/50"
                                  : "text-red-500 hover:bg-red-50"
                              }`}
                            >
                              <Trash2
                                className={`size-3.5 shrink-0 ${
                                  theme === "dark"
                                    ? "text-red-400"
                                    : "text-red-500"
                                }`}
                              />
                              <span>{t("taskModal.deleteTask")}</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  theme === "dark"
                    ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
                aria-label={t("taskModal.close")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </DialogHeader>
        <p>
          {t("taskModal.createdAt")}:{" "}
          {new Date(task.createdAt).toLocaleString(i18n.resolvedLanguage)}
          <br />
          {t("taskModal.updatedAt")}:{" "}
          {new Date(task.updatedAt ?? task.createdAt).toLocaleString(
            i18n.resolvedLanguage,
          )}
        </p>
        {memberStatus === "CanLoadMore" && (
          <button type="button" onClick={() => loadMembers(30)}>
            {t("members.loadMore")}
          </button>
        )}

        <div className="min-w-0 space-y-6 [&>*]:min-w-0">
          <div>
            <h4
              className={`text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {t("taskModal.timer")}
            </h4>

            <div
              className={`rounded-lg border p-4 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900"
                  : "border-slate-200 bg-slate-100"
              }`}
            >
              <div className="mb-4 max-w-full text-2xl sm:text-3xl font-mono font-semibold">
                <span>
                  {t("taskModal.totalTime")}: {formatTimer(timerElapsedMs)}
                </span>
                <p>
                  {t("taskModal.sessionTime")}:{" "}
                  {task.timerSessionElapsedMs === undefined
                    ? t("taskModal.legacySession")
                    : formatTimer(
                        task.timerSessionElapsedMs +
                          (task.timerStatus === "running" &&
                          task.timerStartedAt !== undefined
                            ? Math.max(0, now - task.timerStartedAt)
                            : 0),
                      )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2" aria-busy={isTimerPending}>
                {task.timerStatus !== "running" && (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    disabled={!can("task.update") || isTimerPending}
                    className="min-w-0 max-w-full whitespace-normal rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {t("taskModal.start")}
                  </button>
                )}

                {task.timerStatus === "running" && (
                  <button
                    type="button"
                    onClick={handlePauseTimer}
                    disabled={!can("task.update") || isTimerPending}
                    className="min-w-0 max-w-full whitespace-normal rounded-md bg-yellow-500 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {t("taskModal.pause")}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStopTimer}
                  disabled={!can("task.update") || isTimerPending}
                  className="min-w-0 max-w-full whitespace-normal rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {t("taskModal.stop")}
                </button>
              </div>
              {isTimerPending && (
                <p role="status" className="mt-2 text-sm opacity-70">
                  {t("taskModal.timerPending")}
                </p>
              )}
            </div>
          </div>
          {task.description && (
            <div>
              <p
                className={`whitespace-pre-wrap text-sm leading-relaxed ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {task.description}
              </p>
            </div>
          )}

          {task.storyPoints !== undefined && (
            <div>
              <h4
                className={`text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}
              >
                {t("taskModal.storyPoints")}
                <span className="block text-xs font-normal opacity-70">
                  {t("hints.storyPoints")}
                </span>
              </h4>

              <span
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold ${
                  theme === "dark"
                    ? "bg-slate-800 text-purple-300"
                    : "bg-slate-100 text-purple-700"
                }`}
              >
                {task.storyPoints} SP
              </span>
            </div>
          )}

          {task.deadline !== undefined && (
            <div>
              <h4
                className={`text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}
              >
                {t("taskModal.deadline")}
              </h4>

              <div
                className={`flex items-center gap-2 text-sm font-medium ${
                  isOverdue
                    ? "text-red-500"
                    : theme === "dark"
                      ? "text-slate-400"
                      : "text-slate-600"
                }`}
              >
                <CalendarDays className="size-4" />
                <span>{formattedDeadline}</span>
              </div>
            </div>
          )}

          {totalSubtasks > 0 && (
            <div className="space-y-4">
              <div>
                <h4
                  className={`text-sm font-medium mb-4 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {t("taskModal.subtasks", {
                    completed: completedSubtasks,
                    total: totalSubtasks,
                  })}
                </h4>

                <div className="space-y-3">
                  {(task.subtasks ?? []).map((subtask, index: number) => (
                    <div
                      key={index}
                      className={`flex min-w-0 items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                        theme === "dark"
                          ? "bg-slate-900 hover:bg-slate-800"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                      onClick={() => {
                        if (!can("task.update")) return;

                        void runAction(() => handleSubtaskToggle(index));
                      }}
                    >
                      <Checkbox
                        className="shrink-0"
                        disabled={actionPending || !can("task.update")}
                        onClick={(event) => event.stopPropagation()}
                        checked={subtask.completed}
                        onCheckedChange={() => {
                          if (!can("task.update")) return;

                          void runAction(() => handleSubtaskToggle(index));
                        }}
                      />{" "}
                      <span
                        className={`min-w-0 flex-1 whitespace-pre-wrap text-sm ${
                          subtask.completed
                            ? "text-emerald-500 line-through"
                            : theme === "dark"
                              ? "text-slate-100"
                              : "text-slate-900"
                        }`}
                      >
                        {subtask.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div>
            <h4
              className={`text-sm font-medium mb-3 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {t("taskModal.comments")}
            </h4>

            <div className="space-y-3">
              {commentStatus === "CanLoadMore" && (
                <button onClick={() => loadComments(20)}>
                  {t("pagination.loadMore")}
                </button>
              )}
              {commentStatus === "LoadingFirstPage" ? (
                <p>{t("common.loading")}</p>
              ) : comments.length === 0 ? (
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}
                >
                  {t("taskModal.noComments")}
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment._id}
                    className={`rounded-lg border p-3 ${
                      theme === "dark"
                        ? "border-slate-800 bg-slate-900"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
                      <div className="min-w-0 w-full sm:flex-1">
                        <p
                          className={`text-sm font-medium ${
                            theme === "dark"
                              ? "text-slate-100"
                              : "text-slate-900"
                          }`}
                        >
                          {comment.userName}
                        </p>

                        <p
                          className={`mt-1 whitespace-pre-wrap text-sm ${
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        >
                          {comment.text}
                        </p>
                      </div>

                      <span
                        className={`max-w-full sm:shrink-0 text-xs ${
                          theme === "dark" ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {new Date(comment.createdAt).toLocaleString(
                          i18n.resolvedLanguage,
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t("taskModal.commentPlaceholder")}
                disabled={actionPending || !can("task.update")}
                className={`min-w-0 w-full sm:w-auto sm:flex-1 rounded-md border px-3 py-2 text-sm outline-none ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-900 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              />

              <button
                type="button"
                onClick={() => void runAction(handleAddComment)}
                disabled={
                  actionPending || !can("task.update") || !commentText.trim()
                }
                className="min-w-0 max-w-full whitespace-normal rounded-md bg-purple-500 px-3 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
              >
                {t("taskModal.addComment")}
              </button>
            </div>
          </div>
          <div>
            <h4
              className={`text-sm font-medium mb-3 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {t("taskModal.activity")}
            </h4>

            <div className="space-y-3">
              {activityStatus === "CanLoadMore" && (
                <button onClick={() => loadActivity(20)}>
                  {t("pagination.loadMore")}
                </button>
              )}
              {activityStatus === "LoadingFirstPage" ? (
                <p>{t("common.loading")}</p>
              ) : activityLogs.length === 0 ? (
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}
                >
                  {t("taskModal.noActivity")}
                </p>
              ) : (
                activityLogs.map((log) => (
                  <div
                    key={log._id}
                    className={`rounded-lg border p-3 ${
                      theme === "dark"
                        ? "border-slate-800 bg-slate-900"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
                      <div className="min-w-0 w-full sm:flex-1">
                        <p
                          className={`text-sm font-medium ${
                            theme === "dark"
                              ? "text-slate-100"
                              : "text-slate-900"
                          }`}
                        >
                          {log.userName}
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {t(`taskModal.activityEvents.${log.action}`, {
                            defaultValue: log.action,
                          })}
                        </p>

                        <p
                          className={`mt-1 whitespace-pre-wrap text-sm ${
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        >
                          {log.details}
                          {log.changes?.map(
                            (
                              change: {
                                field: string;
                                before: string | number | null;
                                after: string | number | null;
                              },
                              index: number,
                            ) => (
                              <span className="block" key={index}>
                                {t(`historyFields.${change.field}`)}:{" "}
                                <HistoryValue
                                  field={change.field}
                                  value={change.before}
                                />{" "}
                                ?{" "}
                                <HistoryValue
                                  field={change.field}
                                  value={change.after}
                                />
                              </span>
                            ),
                          )}
                        </p>
                      </div>

                      <span
                        className={`max-w-full sm:shrink-0 text-xs ${
                          theme === "dark" ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {new Date(log.createdAt).toLocaleString(
                          i18n.resolvedLanguage,
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {t("createTask.assignee")}
            </label>

            <Select
              value={assigneeId || "unassigned"}
              onValueChange={(value) =>
                void runAction(() => handleAssigneeChange(value))
              }
              disabled={actionPending || !can("task.update")}
            >
              <SelectTrigger
                className={`min-w-0 w-full data-[size=default]:h-auto min-h-8 whitespace-normal [&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:line-clamp-none [&>[data-slot=select-value]]:wrap-anywhere border transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 text-slate-100 border-slate-700"
                    : "bg-white text-slate-900 border-slate-300"
                }`}
              >
                <SelectValue placeholder={t("createTask.selectAssignee")} />
              </SelectTrigger>

              <SelectContent
                position="popper"
                className={`w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] [&_[data-slot=select-item]]:whitespace-normal [&_[data-slot=select-item]]:wrap-anywhere [&_[data-slot=select-item]>span]:min-w-0 transition-colors border ${
                  theme === "dark"
                    ? "bg-slate-900 text-slate-100 border-slate-700"
                    : "bg-white text-slate-900 border-slate-200"
                }`}
              >
                <SelectItem value="unassigned">{t("unassigned")}</SelectItem>

                {task.assigneeId &&
                  !projectMembers.some(
                    (member) => member._id === task.assigneeId,
                  ) && (
                    <SelectItem value={task.assigneeId}>
                      {liveTask?.assigneeName ?? t("common.loading")}
                    </SelectItem>
                  )}
                {projectMembers.map((member) => (
                  <SelectItem key={member._id} value={member._id}>
                    {member.name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {t("taskModal.column")}
            </label>

            <Select
              value={columnId}
              onValueChange={(value) =>
                void runAction(() => handleColumnChange(value))
              }
              disabled={actionPending || !can("task.update")}
            >
              <SelectTrigger
                className={`min-w-0 w-full data-[size=default]:h-auto min-h-8 whitespace-normal [&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:line-clamp-none [&>[data-slot=select-value]]:wrap-anywhere border transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 text-slate-100 border-slate-700"
                    : "bg-white text-slate-900 border-slate-300"
                }`}
              >
                <SelectValue placeholder={t("taskModal.selectColumn")} />
              </SelectTrigger>

              <SelectContent
                position="popper"
                className={`w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] [&_[data-slot=select-item]]:whitespace-normal [&_[data-slot=select-item]]:wrap-anywhere [&_[data-slot=select-item]>span]:min-w-0 transition-colors border ${
                  theme === "dark"
                    ? "bg-slate-900 text-slate-100 border-slate-700"
                    : "bg-white text-slate-900 border-slate-200"
                }`}
              >
                {columns.map((column) => (
                  <SelectItem
                    key={column._id}
                    value={column._id}
                    className={`transition-colors ${
                      theme === "dark"
                        ? "hover:bg-slate-800 text-slate-100"
                        : "hover:bg-slate-100 text-slate-900"
                    }`}
                  >
                    {getColumnLabel(column.name, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
