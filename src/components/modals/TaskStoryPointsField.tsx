import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type TaskStoryPointsFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
};

const storyPointOptions = [1, 2, 3, 5, 8, 13, 21];

export default function TaskStoryPointsField({
  value,
  onChange,
  label,
  placeholder,
}: TaskStoryPointsFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <p id={hintId} className="mb-2 text-xs text-muted-foreground">
        {t("hints.storyPoints")}
      </p>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-describedby={hintId}
          className="min-w-0 w-full border-border bg-input text-foreground"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent
          position="popper"
          className="max-w-[calc(100vw-2rem)] border-border bg-popover text-popover-foreground"
        >
          {storyPointOptions.map((points) => (
            <SelectItem key={points} value={String(points)}>
              {points} SP
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
