import { useState } from "react";
import { useMutation } from "convex/react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type Task = Doc<"tasks">;

type UseBoardDndOptions = {
  tasks: Task[];
  columns: Doc<"columns">[];
  tasksByColumn: Map<Id<"columns">, Task[]>;
  canUpdateTask: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
};

export function calculateNewOrder(destinationTasks: Task[], targetTask?: Task) {
  if (destinationTasks.length === 0) return 0;

  if (!targetTask) {
    return destinationTasks[destinationTasks.length - 1].order + 1;
  }

  const index = destinationTasks.findIndex(
    (item) => item._id === targetTask._id,
  );

  if (index <= 0) return destinationTasks[0].order - 1;

  return (
    (destinationTasks[index - 1].order + destinationTasks[index].order) / 2
  );
}

export function useBoardDnd({
  tasks,
  columns,
  tasksByColumn,
  canUpdateTask,
  run,
}: UseBoardDndOptions) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const updateTaskOrder = useMutation(api.tasks.updateOrder);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!canUpdateTask) return;
    setActiveTask(tasks.find((item) => item._id === event.active.id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!canUpdateTask || !over || over.id === active.id) return;

    await run(async () => {
      const task = tasks.find((item) => item._id === active.id);
      if (!task) return;

      const targetTask = tasks.find((item) => item._id === over.id);
      const targetColumnId =
        targetTask?.columnId ??
        columns.find((column) => column._id === over.id)?._id;

      if (!targetColumnId) return;
      if (task.columnId === targetColumnId && !targetTask) return;

      const destinationTasks = (tasksByColumn.get(targetColumnId) ?? []).filter(
        (item) => item._id !== task._id,
      );

      await updateTaskOrder({
        taskId: task._id,
        newColumnId: targetColumnId,
        newOrder: calculateNewOrder(destinationTasks, targetTask),
        beforeTaskId: targetTask?._id,
        append: !targetTask,
      });
    });
  };

  return { sensors, activeTask, handleDragStart, handleDragEnd };
}
