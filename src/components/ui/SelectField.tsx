import type { SelectHTMLAttributes } from "react";
type SelectOption = {
  label: string;
  value: string;
};

type SelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  data: SelectOption[];
};

export default function SelectField({
  data,
  className = "",
  ...props
}: SelectFieldProps) {
  return (
    <select
      {...props}
      className={`rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none ${className}`}
    >
      {data.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
