const fs = require("fs");

const plan = {
  "src/components/modals/TaskStoryPointsField.tsx": [
    [
      "Prop type",
      `  placeholder: string;
};`,
      `  placeholder: string;
  allowNone?: boolean;
};`,
    ],
    [
      "Prop default",
      `  placeholder,
}: TaskStoryPointsFieldProps) {`,
      `  placeholder,
  allowNone = false,
}: TaskStoryPointsFieldProps) {`,
    ],
    [
      "None option",
      `          {storyPointOptions.map((points) => (`,
      `          {allowNone && (
            <SelectItem value="none">{t("common.none")}</SelectItem>
          )}
          {storyPointOptions.map((points) => (`,
    ],
  ],
  "src/components/modals/EditTaskModal.tsx": [
    [
      "Local date helper",
      `export default function EditTaskModal({`,
      `const toDateInput = (value: number) => {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return \`\${date.getFullYear()}-\${month}-\${day}\`;
};

export default function EditTaskModal({`,
    ],
    [
      "Story points initial value",
      `useState(String(task.storyPoints ?? 1));`,
      `useState(
    task.storyPoints ? String(task.storyPoints) : "none",
  );`,
    ],
    [
      "Deadline initial value",
      `task.deadline ? new Date(task.deadline).toISOString().split("T")[0] : "",`,
      `task.deadline ? toDateInput(task.deadline) : "",`,
    ],
    [
      "Story points on submit",
      `storyPoints: Number(storyPoints) as 1 | 2 | 3 | 5 | 8 | 13 | 21,`,
      `storyPoints:
          storyPoints === "none"
            ? null
            : (Number(storyPoints) as 1 | 2 | 3 | 5 | 8 | 13 | 21),`,
    ],
    [
      "Allow clearing story points",
      `                placeholder={t("editTask.selectStoryPoints")}
              />`,
      `                placeholder={t("editTask.selectStoryPoints")}
                allowNone
              />`,
    ],
  ],
  "convex/tasks.ts": [
    [
      "Accept null story points",
      `        v.literal(21),
      ),
    ),

    deadline: v.optional(v.union(v.number(), v.null())),`,
      `        v.literal(21),
        v.null(),
      ),
    ),

    deadline: v.optional(v.union(v.number(), v.null())),`,
    ],
    [
      "Clear story points",
      `updates.storyPoints = args.storyPoints;`,
      `updates.storyPoints = args.storyPoints ?? undefined;`,
    ],
  ],
};

const results = {};
for (const [file, edits] of Object.entries(plan)) {
  const raw = fs.readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  let src = raw.replace(/\r\n/g, "\n");
  for (const [label, from] of edits) {
    const count = src.split(from).length - 1;
    if (count !== 1) {
      console.log(`STOP: ${file}: "${label}" found ${count} times. Nothing changed.`);
      process.exit(1);
    }
  }
  for (const [, from, to] of edits) src = src.replace(from, to);
  results[file] = src.replace(/\n/g, eol);
}
for (const [file, src] of Object.entries(results)) {
  fs.writeFileSync(file, src);
  console.log(`OK: ${file} (${plan[file].length} edits)`);
}
