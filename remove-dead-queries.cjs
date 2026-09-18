const fs = require("fs");

const targets = {
  "convex/tasks.ts": ["list", "listPaginated", "listActivity", "listComments"],
  "convex/boards.js": ["list", "listByWorkspace"],
  "convex/boardMembers.js": ["list"],
  "convex/favorites.js": ["listProjectIds", "listTaskIds"],
  "convex/roles.js": ["list"],
  "convex/taskTemplates.js": ["list", "update"],
  "convex/workspaceMembers.js": ["list"],
  "convex/workspaces.js": ["list"],
};
const maybeUnused = ["query", "paginationOptsValidator", "getParentWorkspaceAccess"];

function matchParen(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === "\\") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "(") depth++;
    if (c === ")" && --depth === 0) return i;
  }
  return -1;
}

let removed = 0;
for (const [file, names] of Object.entries(targets)) {
  let src = fs.readFileSync(file, "utf8");
  const before = src.split("\n").length;
  for (const name of names) {
    const start = src.search(new RegExp(`export const ${name} = (query|mutation)\\(`));
    if (start < 0) {
      console.log(`SKIP ${file}: ${name} not found`);
      continue;
    }
    const end = matchParen(src, src.indexOf("(", start));
    if (end < 0) throw new Error(`Cannot parse ${name} in ${file}`);
    let stop = end + 1;
    if (src[stop] === ";") stop++;
    while (src[stop] === "\r" || src[stop] === "\n") stop++;
    src = src.slice(0, start) + src.slice(stop);
  }
  src = src.replace(/import\s*\{([^}]*)\}\s*from\s*("[^"]+");?[ \t]*\r?\n/g, (full, list, from) => {
    const rest = src.replace(full, "");
    const kept = list
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((n) => !maybeUnused.includes(n) || new RegExp(`(?<![.\\w])${n}\\b`).test(rest));
    if (kept.length === list.split(",").map((s) => s.trim()).filter(Boolean).length) return full;
    if (kept.length === 0) return "";
    const eol = full.endsWith("\r\n") ? "\r\n" : "\n";
    return `import { ${kept.join(", ")} } from ${from};${eol}`;
  });
  fs.writeFileSync(file, src);
  const diff = before - src.split("\n").length;
  removed += diff;
  console.log(`${file}: -${diff}`);
}
console.log("Removed lines:", removed);
