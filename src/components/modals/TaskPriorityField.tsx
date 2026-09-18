import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Priority = "high" | "medium" | "low";

type TaskPriorityFieldProps = {
  value: string;
  onChange: (value: Priority) => void;
  label: string;
  placeholder: string;
};

const priorities = [
  { value: "high", color: "bg-priority-high" },
  { value: "medium", color: "bg-priority-medium" },
  { value: "low", color: "bg-priority-low" },
] as const;

export default function TaskPriorityField({
  value,
  onChange,
  label,
  placeholder,
}: TaskPriorityFieldProps) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-muted-foreground"
      >
        {label}
      </label>

      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (
            nextValue === "high" ||
            nextValue === "medium" ||
            nextValue === "low"
          ) {
            onChange(nextValue);
          }
        }}
      >
        <SelectTrigger
          id={id}
          className="min-w-0 w-full border-border bg-input text-foreground"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent
          position="popper"
          className="max-w-[calc(100vw-2rem)] border-border bg-popover text-popover-foreground"
        >
          {priorities.map((priority) => (
            <SelectItem key={priority.value} value={priority.value}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${priority.color}`}
                />
                <span>{t(`priority.${priority.value}`)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
