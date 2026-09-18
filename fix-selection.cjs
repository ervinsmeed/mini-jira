const fs = require("fs");
const file = "src/components/layout/AuthenticatedApp.tsx";
const raw = fs.readFileSync(file, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
let src = raw.replace(/\r\n/g, "\n");

const edits = [
  [
    "Store selected ids",
    `  const [currentBoard, setCurrentBoard] = useState<Doc<"boards"> | null>(null);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<Doc<"workspaces"> | null>(null);`,
    `  const [currentBoardId, setCurrentBoardId] = useState<Id<"boards"> | null>(
    null,
  );
  const [currentWorkspaceId, setCurrentWorkspaceId] =
    useState<Id<"workspaces"> | null>(null);`,
  ],
  [
    "Live workspace from list",
    `  const displayWorkspace =
    currentWorkspace ??
    (workspaces && workspaces.length > 0 ? workspaces[0] : null);`,
    `  const displayWorkspace =
    workspaces.find((workspace) => workspace._id === currentWorkspaceId) ??
    workspaces[0] ??
    null;`,
  ],
  [
    "Live board from list",
    `  const displayBoard =
    currentBoard ?? (boards && boards.length > 0 ? boards[0] : null);`,
    `  const displayBoard =
    boards.find((board) => board._id === currentBoardId) ?? boards[0] ?? null;`,
  ],
  [
    "Created board",
    `    setCurrentBoard(board);

    if (board && board._id) {`,
    `    setCurrentBoardId(board._id);

    if (board && board._id) {`,
  ],
  [
    "Selected board",
    `  const handleBoardSelect = (board: Doc<"boards"> | null) => {
    setCurrentBoard(board);`,
    `  const handleBoardSelect = (board: Doc<"boards"> | null) => {
    setCurrentBoardId(board?._id ?? null);`,
  ],
  [
    "Updated project",
    `    setCurrentBoard(updatedProject);`,
    `    setCurrentBoardId(updatedProject._id);`,
  ],
  [
    "Deleted workspace",
    `    setCurrentWorkspace(remainingWorkspaces[0] ?? null);`,
    `    setCurrentWorkspaceId(remainingWorkspaces[0]?._id ?? null);`,
  ],
];

for (const [label, from] of edits) {
  const count = src.split(from).length - 1;
  if (count !== 1) {
    console.log(`STOP: "${label}" found ${count} times. File unchanged.`);
    process.exit(1);
  }
}
for (const [label, from, to] of edits) {
  src = src.replace(from, to);
  console.log(`OK: ${label}`);
}

const workspaceSets = src.split("    setCurrentWorkspace(workspace);").length - 1;
const boardResets = src.split("    setCurrentBoard(null);").length - 1;
src = src
  .split("    setCurrentWorkspace(workspace);")
  .join("    setCurrentWorkspaceId(workspace._id);")
  .split("    setCurrentBoard(null);")
  .join("    setCurrentBoardId(null);");
console.log(`OK: workspace selections (${workspaceSets}), board resets (${boardResets})`);

if (/setCurrentBoard\(|setCurrentWorkspace\(|\bcurrentBoard\b(?!=)|\bcurrentWorkspace\b(?!=)/.test(src.replace(/currentBoard=\{|currentWorkspace=\{/g, ""))) {
  console.log("STOP: old state is still referenced. File unchanged.");
  process.exit(1);
}
fs.writeFileSync(file, src.replace(/\n/g, eol));
console.log("AuthenticatedApp.tsx updated");
