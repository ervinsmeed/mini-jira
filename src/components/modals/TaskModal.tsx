import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAction } from "../../hooks/useAction";
import { Button, Modal } from "../ui/kit";
import EditTaskModal from "./EditTaskModal";
import TaskActivity from "./TaskActivity";
import TaskActionsMenu from "./task-modal/TaskActionsMenu";
import TaskAssignment from "./task-modal/TaskAssignment";
import TaskComments from "./task-modal/TaskComments";
import TaskDetails from "./task-modal/TaskDetails";
import TaskSubtaskList from "./task-modal/TaskSubtaskList";
import TaskTimer from "./task-modal/TaskTimer";

type TaskModalProps = {
  task: Doc<"tasks">;
  onClose: () => void;
};

export default function TaskModal({ task: initialTask, onClose }: TaskModalProps) {
  const { t } = useTranslation();
  const { pending, run } = useAction();
  const [isEditing, setIsEditing] = useState(false);

  const access = useQuery(api.boards.getCurrentAccess, {
    boardId: initialTask.boardId,
  });
  const liveTask = useQuery(api.tasks.get, { id: initialTask._id });
  const task = liveTask ?? initialTask;

  const columns: Doc<"columns">[] =
    useQuery(api.columns.list, { boardId: task.boardId }) ?? [];
  const members = usePaginatedQuery(
    api.boardMembers.projectMembersPage,
    { boardId: task.boardId },
    { initialNumItems: 30 },
  );

  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);

  const can = (permission: string) =>
    Boolean(
      access?.isOwner ||
        access?.permissions.some((value: string) => value === permission),
    );
  const canUpdate = can("task.update");
  const canDelete = can("task.delete");

  const handleDelete = () =>
    run(async () => {
      await deleteTask({ id: task._id });
      onClose();
      toast.success(t("taskModal.deleted"));
    });

  const handleSubtaskToggle = (index: number) =>
    run(() =>
      updateTask({
        id: task._id,
        subtasks: (task.subtasks ?? []).map((subtask, current) =>
          current === index ? { ...subtask, completed: !subtask.completed } : subtask,
        ),
      }),
    );

  const handleAssigneeChange = (assigneeId: Id<"users"> | null) =>
    run(() => updateTask({ id: task._id, assigneeId }));

  const handleColumnChange = (columnId: Id<"columns">) =>
    run(() => updateTask({ id: task._id, columnId }));

  if (liveTask === null) {
    return (
      <Modal open onClose={onClose} title={t("common.actionError")}>
        <p className="text-sm text-muted-foreground">{t("common.actionError")}</p>
      </Modal>
    );
  }

  if (isEditing && canUpdate) {
    return (
      <EditTaskModal
        key={task._id}
        task={task}
        canUpdate={canUpdate}
        onClose={() => setIsEditing(false)}
      />
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={task.title}
      actions={
        <TaskActionsMenu
          canEdit={canUpdate}
          canDelete={canDelete}
          pending={pending}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDelete}
        />
      }
    >
      <div className="min-w-0 space-y-6">
        <TaskDetails task={task} />
        <TaskTimer task={task} canUpdate={canUpdate} />
        <TaskSubtaskList
          subtasks={task.subtasks ?? []}
          disabled={pending || !canUpdate}
          onToggle={handleSubtaskToggle}
        />
        <TaskAssignment
          task={task}
          assigneeName={liveTask?.assigneeName}
          columns={columns}
          members={members.results}
          disabled={pending || !canUpdate}
          onAssigneeChange={handleAssigneeChange}
          onColumnChange={handleColumnChange}
        />
        {members.status === "CanLoadMore" && (
          <Button variant="ghost" size="sm" onClick={() => members.loadMore(30)}>
            {t("members.loadMore")}
          </Button>
        )}
        <TaskComments taskId={task._id} canComment={canUpdate} />
        <TaskActivity taskId={task._id} />
      </div>
    </Modal>
  );
}
