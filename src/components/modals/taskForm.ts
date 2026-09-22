import type { Doc, Id } from "../../../convex/_generated/dataModel";

export type Priority = "high" | "medium" | "low";
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 | 21;

export type SubtaskValue = {
  text: string;
  completed: boolean;
};

export type TaskFormValues = {
  title: string;
  description: string;
  priority: Priority;
  storyPoints: string;
  deadline: string;
  columnId: Id<"columns"> | "";
  subtasks: SubtaskValue[];
};

export const emptySubtask = (): SubtaskValue => ({ text: "", completed: false });

export function toDateInput(value: number) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateInput(value: string) {
  return value ? new Date(`${value}T23:59:59`).getTime() : null;
}

export function toStoryPoints(value: string) {
  return value === "none" ? null : (Number(value) as StoryPoints);
}

export function cleanSubtasks(subtasks: SubtaskValue[]) {
  return subtasks
    .filter((subtask) => subtask.text.trim())
    .map((subtask) => ({ text: subtask.text.trim(), completed: subtask.completed }));
}

export function resolveColumnId(columns: Doc<"columns">[], columnId: string) {
  const column = columns.find((item) => item._id === columnId) ?? columns[0];
  return column?._id ?? "";
}

export function getEmptyTaskFormValues(): TaskFormValues {
  return {
    title: "",
    description: "",
    priority: "medium",
    storyPoints: "1",
    deadline: "",
    columnId: "",
    subtasks: [emptySubtask(), emptySubtask()],
  };
}

export function getTaskFormValues(task: Doc<"tasks">): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    priority: (task.priority as Priority | undefined) ?? "medium",
    storyPoints: task.storyPoints ? String(task.storyPoints) : "none",
    deadline: task.deadline ? toDateInput(task.deadline) : "",
    columnId: task.columnId,
    subtasks: task.subtasks?.length
      ? task.subtasks.map((subtask) => ({ ...subtask }))
      : [emptySubtask()],
  };
}
