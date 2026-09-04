import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";
import TaskCard from "../TaskCard";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

import { Button } from "./Button";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";

import { toast } from "sonner";
export default function Column({
  column,
  taskCount,
  tasks,
  allTasks,
  onTaskClick,
  onEditColumn,
  selectedTaskIds,
  onToggleTaskSelection,
  theme,
}: any) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteColumn = useMutation(api.columns.remove);

  const { setNodeRef } = useDroppable({
    id: column._id,
  });

  const handleDeleteColumn = async () => {
    await deleteColumn({
      id: column._id,
    });

    setShowDeleteConfirm(false);
    toast.success(t("column.deleted"));
  };

  return (
    <div
      className={`w-72 shrink-0 rounded-lg border p-3 ${
        theme === "dark"
          ? "border-slate-800 bg-slate-950"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="group mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="size-4 rounded-full"
            style={{ backgroundColor: column.color }}
          ></div>

          <h3
            className={`text-xs font-semibold uppercase tracking-wider ${
              theme === "dark" ? "text-slate-400" : "text-slate-700"
            }`}
          >
            {column.name} ({taskCount})
          </h3>
        </div>

        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MoreHorizontal
                className={`size-4 cursor-pointer ${
                  theme === "dark"
                    ? "text-slate-400 hover:text-slate-100"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className={`w-auto rounded-md border shadow-lg ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-900 text-slate-100"
                  : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              <DropdownMenuItem
                onClick={() => onEditColumn(column)}
                className={`cursor-pointer ${
                  theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <Edit className="mr-2 size-3" />
                <span>{t("column.edit")}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator
                className={theme === "dark" ? "bg-slate-800" : "bg-slate-200"}
              />

              <Dialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
              >
                <DialogTrigger
                  className={`flex items-center cursor-pointer ${
                    theme === "dark"
                      ? "text-red-400 hover:bg-red-900"
                      : "text-red-600 hover:bg-red-100"
                  }`}
                >
                  <Trash2 className="mr-2 size-3" />
                  <span>{t("column.delete")}</span>
                </DialogTrigger>

                <DialogContent
                  className={`max-w-md border ${
                    theme === "dark"
                      ? "bg-slate-950 border-slate-800 text-slate-100"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <DialogHeader>
                    <DialogTitle className="text-lg!">
                      {t("column.deleteTitle")}
                    </DialogTitle>
                  </DialogHeader>

                  <DialogDescription
                    className={
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }
                  >
                    {t("column.deleteDescription")}
                  </DialogDescription>

                  <DialogFooter>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={handleDeleteColumn}
                        variant="destructive"
                      >
                        {t("common.yes")}
                      </Button>

                      <DialogClose asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className={
                            theme === "dark"
                              ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }
                        >
                          {t("common.no")}
                        </Button>
                      </DialogClose>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-4 min-h-[200px] p-2 rounded-lg ${
          theme === "dark" ? "bg-slate-900" : "bg-slate-200"
        }`}
      >
        <SortableContext
          items={tasks.map((t: any) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task: any) => (
            <TaskCard
              key={task._id}
              task={task}
              epic={
                task.epicId
                  ? allTasks.find((item: any) => item._id === task.epicId)
                  : null
              }
              onClick={() => onTaskClick(task)}
              isSelected={selectedTaskIds.includes(task._id)}
              onToggleSelect={() => onToggleTaskSelection(task._id)}
              theme={theme}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
