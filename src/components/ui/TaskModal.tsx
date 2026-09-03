import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
  can,
}: any) {
  const { t } = useTranslation();

  const [columnId, setColumnId] = useState(initialTask.columnId);
  const [assigneeId, setAssigneeId] = useState(initialTask.assigneeId ?? "");
  const [showActions, setShowActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const task =
    useQuery(api.tasks.list, {
      boardId: initialTask.boardId,
    })?.find((t: any) => t._id === initialTask._id) || initialTask;

  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);
  const startTimer = useMutation(api.tasks.startTimer);
  const pauseTimer = useMutation(api.tasks.pauseTimer);
  const stopTimer = useMutation(api.tasks.stopTimer);

  const [now, setNow] = useState(Date.now());

  const columns: any[] = (useQuery(api.columns.list, {
    boardId: task.boardId,
  }) ?? []) as any[];

  const projectMembers: any[] = (useQuery(api.boardMembers.list, {
    boardId: task.boardId,
  }) ?? []) as any[];
  const activityLogs =
    useQuery(api.tasks.listActivity, {
      taskId: task._id,
    }) ?? [];

  const comments =
    useQuery(api.tasks.listComments, {
      taskId: task._id,
    }) ?? [];

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

  const handleColumnChange = async (newColumnId: any) => {
    setColumnId(newColumnId);

    await updateTask({
      id: task._id,
      columnId: newColumnId,
    });
  };

  const handleAssigneeChange = async (value: any) => {
    const newAssigneeId = value === "unassigned" ? "" : value;

    setAssigneeId(newAssigneeId);

    await updateTask({
      id: task._id,
      assigneeId: value === "unassigned" ? null : value,
    });
  };

  const handleSubtaskToggle = async (subtaskIndex: number) => {
    const updatedSubtasks = (task.subtasks ?? []).map(
      (subtask: any, index: number) =>
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
    await deleteTask({
      id: task._id,
    });

    onClose();

    toast.success(t("taskModal.deleted"));
  };

  const completedSubtasks = task.subtasks
    ? task.subtasks.filter((st: any) => st.completed).length
    : 0;

  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  const isOverdue = task.deadline !== undefined && task.deadline < Date.now();

  const formattedDeadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString()
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

  const handleStartTimer = async () => {
    await startTimer({
      id: task._id,
    });
  };

  const handlePauseTimer = async () => {
    await pauseTimer({
      id: task._id,
    });
  };

  const handleStopTimer = async () => {
    await stopTimer({
      id: task._id,
    });
  };

  if (showEditModal) {
    return (
      <EditTaskModal
        task={task}
        onClose={() => setShowEditModal(false)}
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
        className={`max-w-lg max-h-[600px] overflow-auto transition-colors border ${
          theme === "dark"
            ? "bg-slate-950 text-slate-100 border-slate-800"
            : "bg-white text-slate-900 border-slate-200"
        }`}
      >
        <DialogHeader>
          <div className="relative flex items-start justify-between gap-4 pr-12">
            <DialogTitle
              className={`!text-xl font-semibold pr-2 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {task.title}
            </DialogTitle>

            <div className="absolute right-0 top-0 z-20 flex items-center gap-[10px]">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowActions(!showActions)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-colors outline-none focus-visible:ring-1 focus-visible:ring-slate-500 focus-visible:ring-offset-0 ${
                    theme === "dark"
                      ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  aria-label="Open task actions"
                >
                  <MoreVertical className="size-4" />
                </button>

                {showActions && (
                  <div
                    className={`absolute right-0 top-8 z-20 w-[210px] rounded-lg border shadow-lg ${
                      theme === "dark"
                        ? "border-slate-700 bg-slate-900"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(true);
                        setShowActions(false);
                      }}
                      className={`flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        theme === "dark"
                          ? "text-slate-100 hover:bg-slate-800"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Edit
                        className={`size-3.5 shrink-0 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-500"
                        }`}
                      />
                      <span>{t("taskModal.editTask")}</span>
                    </button>

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

                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={handleDeleteTask}
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
                            className={`flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
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

              <button
                type="button"
                onClick={onClose}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                  theme === "dark"
                    ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
                aria-label="Close task modal"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4
              className={`text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Timer
            </h4>

            <div
              className={`rounded-lg border p-4 ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900"
                  : "border-slate-200 bg-slate-100"
              }`}
            >
              <div className="mb-4 text-3xl font-mono font-semibold">
                {formatTimer(timerElapsedMs)}
              </div>

              <div className="flex gap-2">
                {task.timerStatus !== "running" && (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    disabled={!can("task.update")}
                    className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    Start
                  </button>
                )}

                {task.timerStatus === "running" && (
                  <button
                    type="button"
                    onClick={handlePauseTimer}
                    disabled={!can("task.update")}
                    className="rounded-md bg-yellow-500 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                  >
                    Pause
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStopTimer}
                  disabled={!can("task.update")}
                  className="rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
          {task.description && (
            <div>
              <p
                className={`text-sm leading-relaxed ${
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
                  {(task.subtasks ?? []).map((subtask: any, index: number) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-colors cursor-pointer ${
                        theme === "dark"
                          ? "bg-slate-900 hover:bg-slate-800"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                      onClick={() => {
                        if (!can("task.update")) return;

                        handleSubtaskToggle(index);
                      }}
                    >
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => {
                          if (!can("task.update")) return;

                          handleSubtaskToggle(index);
                        }}
                      />{" "}
                      <span
                        className={`text-sm ${
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
              Comments
            </h4>

            <div className="space-y-3">
              {comments.length === 0 ? (
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}
                >
                  No comments yet
                </p>
              ) : (
                comments.map((comment: any) => (
                  <div
                    key={comment._id}
                    className={`rounded-lg border p-3 ${
                      theme === "dark"
                        ? "border-slate-800 bg-slate-900"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
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
                          className={`mt-1 text-sm ${
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        >
                          {comment.text}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 text-xs ${
                          theme === "dark" ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                disabled={!can("task.update")}
                className={`flex-1 rounded-md border px-3 py-2 text-sm outline-none ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-900 text-slate-100"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              />

              <button
                type="button"
                onClick={handleAddComment}
                disabled={!can("task.update") || !commentText.trim()}
                className="rounded-md bg-purple-500 px-3 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
          <div>
            <h4
              className={`text-sm font-medium mb-3 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Activity
            </h4>

            <div className="space-y-3">
              {activityLogs.length === 0 ? (
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}
                >
                  No activity yet
                </p>
              ) : (
                activityLogs.map((log: any) => (
                  <div
                    key={log._id}
                    className={`rounded-lg border p-3 ${
                      theme === "dark"
                        ? "border-slate-800 bg-slate-900"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            theme === "dark"
                              ? "text-slate-100"
                              : "text-slate-900"
                          }`}
                        >
                          {log.userName}
                        </p>

                        <p
                          className={`mt-1 text-sm ${
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        >
                          {log.details}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 text-xs ${
                          theme === "dark" ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {new Date(log.createdAt).toLocaleString()}
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
              Assignee
            </label>

            <Select
              value={assigneeId || "unassigned"}
              onValueChange={handleAssigneeChange}
              disabled={!can("task.update")}
            >
              <SelectTrigger
                className={`w-1/2 border transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 text-slate-100 border-slate-700"
                    : "bg-white text-slate-900 border-slate-300"
                }`}
              >
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>

              <SelectContent
                className={`transition-colors border ${
                  theme === "dark"
                    ? "bg-slate-900 text-slate-100 border-slate-700"
                    : "bg-white text-slate-900 border-slate-200"
                }`}
              >
                <SelectItem value="unassigned">Unassigned</SelectItem>

                {projectMembers.map((member: any) => (
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
              onValueChange={handleColumnChange}
              disabled={!can("task.update")}
            >
              <SelectTrigger
                className={`w-1/2 border transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 text-slate-100 border-slate-700"
                    : "bg-white text-slate-900 border-slate-300"
                }`}
              >
                <SelectValue placeholder={t("taskModal.selectColumn")} />
              </SelectTrigger>

              <SelectContent
                className={`transition-colors border ${
                  theme === "dark"
                    ? "bg-slate-900 text-slate-100 border-slate-700"
                    : "bg-white text-slate-900 border-slate-200"
                }`}
              >
                {columns.map((column: any) => (
                  <SelectItem
                    key={column._id}
                    value={column._id}
                    className={`transition-colors ${
                      theme === "dark"
                        ? "hover:bg-slate-800 text-slate-100"
                        : "hover:bg-slate-100 text-slate-900"
                    }`}
                  >
                    {column.name}
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
