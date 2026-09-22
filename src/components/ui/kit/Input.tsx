import type { ComponentProps } from "react";
import styles from "./Input.module.scss";

type InputProps = ComponentProps<"input">;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={[styles.input, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

type InputNumberProps = Omit<InputProps, "type">;

export function InputNumber(props: InputNumberProps) {
  return <Input type="number" inputMode="numeric" {...props} />;
}

type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={[styles.textarea, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = Omit<ComponentProps<"select">, "children"> & {
  options: SelectOption[];
};

export function Select({ options, className, ...props }: SelectProps) {
  return (
    <select
      className={[styles.select, className].filter(Boolean).join(" ")}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
