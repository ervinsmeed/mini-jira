type ColumnColorFieldProps = {
  value: string;
  onChange: (color: string) => void;
  label: string;
};

const PRESET_COLORS = [
  "#5b7cfa",
  "#8b7cf6",
  "#4fb886",
  "#e0a54a",
  "#e5646b",
  "#4aa8d8",
  "#d46fa8",
  "#7c8594",
];

export default function ColumnColorField({
  value,
  onChange,
  label,
}: ColumnColorFieldProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </legend>

      <div className="grid grid-cols-4 gap-4">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${label}: ${color}`}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            className={`size-12 rounded-lg border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              value === color
                ? "scale-110 border-ring"
                : "border-border hover:scale-105"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </fieldset>
  );
}
