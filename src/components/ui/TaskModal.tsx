import { useState } from "react";
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
import { Edit, MoreVertical, Trash2 } from "lucide-react";

export default function TaskModal({ task: initialTask, onClose, theme }: any) {
  const { t } = useTranslation();
  const [columnId, setColumnId] = useState(initialTask.columnId);
  const [showActions, setShowActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const task =
    useQuery(api.tasks.list, {
      boardId: initialTask.boardId,
    })?.find((t: any) => t._id === initialTask._id) || initialTask;

  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);

  const columns: any[] = (useQuery(api.columns.list, {
    boardId: task.boardId,
  }) ?? []) as any[];

  const handleColumnChange = async (newColumnId: any) => {
    setColumnId(newColumnId);

    await updateTask({
      id: task._id,
      columnId: newColumnId,
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
        className={`max-w-lg max-h-[600px] overflow-auto transition-colors border ${
          theme === "dark"
            ? "bg-slate-950 text-slate-100 border-slate-800"
            : "bg-white text-slate-900 border-slate-200"
        }`}
      >
        <DialogHeader>
          <div className="relative flex items-start justify-between">
            <DialogTitle
              className={`!text-xl font-semibold pr-8 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {task.title}
            </DialogTitle>

            <button
              onClick={() => setShowActions(!showActions)}
              className={`p-1 transition-colors ${
                theme === "dark"
                  ? "text-slate-400 hover:text-slate-100"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <MoreVertical className="size-4" />
            </button>

            {showActions && (
              <div
                className={`absolute right-0 top-8 rounded-lg shadow-lg py-1 z-10 min-w-[120px] border transition-colors ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700"
                    : "bg-white border-slate-200"
                }`}
              >
                <button
                  onClick={() => {
                    setShowEditModal(true);
                    setShowActions(false);
                  }}
                  className={`flex items-center space-x-2 w-full px-3 py-2 text-sm transition-colors ${
                    theme === "dark"
                      ? "text-slate-100 hover:bg-slate-900"
                      : "text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Edit className="size-3" />
                  {t("taskModal.editTask")}
                </button>

                {showDeleteConfirm ? (
                  <div className="px-3 py-2">
                    <p
                      className={`text-xs py-2 ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {t("taskModal.deleteQuestion")}
                    </p>

                    <div className="flex space-x-2">
                      <button
                        onClick={handleDeleteTask}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        {t("common.yes")}
                      </button>

                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          theme === "dark"
                            ? "bg-slate-950 text-slate-100 hover:bg-slate-900"
                            : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                        }`}
                      >
                        {t("common.no")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className={`flex items-center space-x-2 w-full py-2 px-3 text-sm transition-colors ${
                      theme === "dark"
                        ? "text-red-400 hover:bg-red-900"
                        : "text-red-500 hover:bg-red-50"
                    }`}
                  >
                    <Trash2 className="size-3" />
                    {t("taskModal.deleteTask")}
                  </button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
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
                      onClick={() => handleSubtaskToggle(index)}
                    >
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => handleSubtaskToggle(index)}
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
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {t("taskModal.column")}
            </label>

            <Select value={columnId} onValueChange={handleColumnChange}>
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
