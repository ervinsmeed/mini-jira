import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { useTranslation } from "react-i18next";

type SortableSubTaskProps = {
  text: string;
  index: number;
  placeholder: string;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
};

export default function SortableSubTask({
  text,
  index,
  placeholder,
  onRemove,
  onChange,
}: SortableSubTaskProps) {
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `subtask-${index}`,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t("common.moveSubtask")}
        title={t("common.moveSubtask")}
        className="cursor-grab p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <GripVertical className="size-4" />
      </button>

      <input
        type="text"
        value={text}
        onChange={(event) => onChange(index, event.target.value)}
        placeholder={placeholder}
        className="min-w-0 w-full rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label={t("common.removeSubtask")}
        title={t("common.removeSubtask")}
        className="p-2 text-muted-foreground transition-colors hover:text-destructive"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
