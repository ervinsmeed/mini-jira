import { getColumnLabel } from "../../lib/columnLabel";
import { useAction } from "../../hooks/useAction";
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import TaskCard from "./TaskCard";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type ColumnProps = {
  column: Doc<"columns">;
  taskCount: number;
  tasks: Doc<"tasks">[];
  allTasks: Doc<"tasks">[];
  onTaskClick: (task: Doc<"tasks">) => void;
  onEditColumn: (column: Doc<"columns">) => void;
  selectedTaskIds: Id<"tasks">[];
  onToggleTaskSelection?: (id: Id<"tasks">) => void;
  favoriteTaskIdSet: Set<Id<"tasks">>;
  onToggleTaskFavorite: (id: Id<"tasks">) => void;
  canEditColumn: boolean;
  canDeleteColumn: boolean;
  canDragTasks: boolean;
};

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { Button } from "../ui/Button";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/Dialog";

export default function Column({
  column,
  taskCount,
  tasks,
  allTasks,
  onTaskClick,
  onEditColumn,
  selectedTaskIds,
  onToggleTaskSelection,
  favoriteTaskIdSet,
  onToggleTaskFavorite,
  canEditColumn,
  canDeleteColumn,
  canDragTasks,
}: ColumnProps) {
  const { t } = useTranslation();
  const { pending, run } = useAction();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteColumn = useMutation(api.columns.remove);

  const { setNodeRef } = useDroppable({
    id: column._id,
    disabled: !canDragTasks,
  });

  const displayedColumnName = getColumnLabel(column.name, t);

  const handleDeleteColumn = async () => {
    if (!canDeleteColumn) return;
    await run(async () => {
      await deleteColumn({
        id: column._id,
      });

      setShowDeleteConfirm(false);
      toast.success(t("column.deleted"));
    });
  };

  return (
    <div className="w-72 shrink-0 rounded-lg border border-border bg-card p-3 text-card-foreground">
      <div className="group mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="size-4 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {displayedColumnName} ({taskCount})
          </h3>
        </div>

        {(canEditColumn || canDeleteColumn) && (
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <MoreHorizontal className="size-4 cursor-pointer text-muted-foreground hover:text-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
              >
                {canEditColumn && (
                  <DropdownMenuItem
                    onClick={() => onEditColumn(column)}
                    className="cursor-pointer hover:bg-muted"
                  >
                    <Edit className="mr-2 size-3" />
                    <span>{t("column.edit")}</span>
                  </DropdownMenuItem>
                )}

                {canEditColumn && canDeleteColumn && (
                  <DropdownMenuSeparator className="bg-border" />
                )}

                {canDeleteColumn && (
                  <Dialog
                    open={showDeleteConfirm}
                    onOpenChange={setShowDeleteConfirm}
                  >
                    <DialogTrigger className="flex cursor-pointer items-center text-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-2 size-3" />
                      <span>{t("column.delete")}</span>
                    </DialogTrigger>

                    <DialogContent className="max-w-md border border-border bg-card text-card-foreground">
                      <DialogHeader>
                        <DialogTitle className="text-lg!">
                          {t("column.deleteTitle")}
                        </DialogTitle>
                      </DialogHeader>

                      <DialogDescription className="text-muted-foreground">
                        {t("column.deleteDescription")}
                      </DialogDescription>

                      <DialogFooter>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={handleDeleteColumn}
                            disabled={pending}
                            variant="destructive"
                          >
                            {t("common.yes")}
                          </Button>

                          <DialogClose asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            >
                              {t("common.no")}
                            </Button>
                          </DialogClose>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        className="min-h-[200px] space-y-4 rounded-lg bg-muted p-2"
      >
        <SortableContext
          items={tasks.map((task) => task._id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              epic={
                task.epicId
                  ? allTasks.find((item) => item._id === task.epicId)
                  : null
              }
              onClick={() => onTaskClick(task)}
              isSelected={
                Boolean(onToggleTaskSelection) &&
                selectedTaskIds.includes(task._id)
              }
              onToggleSelect={
                onToggleTaskSelection
                  ? () => onToggleTaskSelection(task._id)
                  : undefined
              }
              isFavorite={favoriteTaskIdSet.has(task._id)}
              onToggleFavorite={() => onToggleTaskFavorite(task._id)}
              canDrag={canDragTasks}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
