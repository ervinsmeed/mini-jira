const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Execute actual modules with registration/validators replaced, never a live deployment.
function load(file) {
  const full = path.resolve(file);
  const code = ts.transpileModule(fs.readFileSync(full, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  const validator = new Proxy(() => validator, { get: () => validator });
  const localRequire = (name) => {
    if (name.includes("_generated/server"))
      return { mutation: (x) => x, query: (x) => x };
    if (name === "convex/values")
      return {
        v: validator,
        ConvexError: require("convex/values").ConvexError,
      };
    if (name === "convex/server") return { paginationOptsValidator: validator };
    const target = path.resolve(path.dirname(full), name);
    return load(
      fs.existsSync(target + ".ts") ? target + ".ts" : target + ".js",
    );
  };
  Function("require", "exports", code)(localRequire, exports);
  return exports;
}
function fixture() {
  const rows = new Map();
  const pageReads = [];
  let seq = 0;
  const put = (table, row) => {
    const id = row._id ?? `${table}:${++seq}`;
    rows.set(id, { table, ...structuredClone(row), _id: id });
    return id;
  };
  put("users", {
    _id: "u",
    clerkId: "clerk",
    email: "test@example.invalid",
    name: "Edited",
    firstName: "Edited",
  });
  put("workspaces", { _id: "w", ownerId: "u", name: "Workspace" });
  put("boards", { _id: "b", userId: "u", workspaceId: "w", name: "Board" });
  put("columns", { _id: "c", userId: "u", boardId: "b", name: "Backlog" });
  const ctx = {
    auth: {
      getUserIdentity: async () => ({
        subject: "clerk",
        email: "test@example.invalid",
        emailVerified: true,
        name: "Clerk name",
      }),
    },
    db: {
      get: async (...args) => {
        const row = rows.get(args.at(-1));
        return row ? structuredClone(row) : null;
      },
      patch: async (...args) => {
        const patch = args.pop(),
          id = args.pop();
        Object.assign(rows.get(id), patch);
      },
      delete: async (...args) => rows.delete(args.at(-1)),
      insert: async (table, row) => put(table, row),
      query(table) {
        let predicates = [],
          fields = [],
          direction = 1;
        const compare = (a, b) =>
          a === b
            ? 0
            : a === undefined
              ? -1
              : b === undefined
                ? 1
                : a < b
                  ? -1
                  : 1;
        return {
          withIndex(name, cb) {
            fields =
              {
                by_board_order: ["order"],
                by_board_column_order: ["order"],
                by_workspace_order: ["order"],
                by_user_order: ["order"],
                by_workspace_level: ["level"],
                by_board_created: ["createdAt"],
                by_board_title: ["title"],
                by_board_deadline: ["deadline"],
                by_board_sp: ["storyPoints"],
                by_board_priority: ["order"],
              }[name] ?? [];
            const q = {
              eq(key, value) {
                predicates.push((row) => row[key] === value);
                return q;
              },
              gt(key, value) {
                predicates.push((row) => compare(row[key], value) > 0);
                return q;
              },
              lt(key, value) {
                predicates.push((row) => compare(row[key], value) < 0);
                return q;
              },
            };
            cb(q);
            return this;
          },
          filter(cb) {
            const q = {
              field: (key) => (row) => row[key],
              eq: (field, value) => (row) => field(row) === value,
              neq: (field, value) => (row) => field(row) !== value,
              lt: (field, value) => (row) => compare(field(row), value) < 0,
              gte: (field, value) => (row) => compare(field(row), value) >= 0,
              and:
                (...tests) =>
                (row) =>
                  tests.every((fn) => (typeof fn === "boolean" ? fn : fn(row))),
              or:
                (...tests) =>
                (row) =>
                  tests.some((fn) => (typeof fn === "boolean" ? fn : fn(row))),
            };
            predicates.push(cb(q));
            return this;
          },
          order(value) {
            direction = value === "desc" ? -1 : 1;
            return this;
          },
          async collect() {
            return [...rows.values()]
              .filter(
                (row) =>
                  row.table === table && predicates.every((fn) => fn(row)),
              )
              .sort((a, b) => {
                for (const f of fields) {
                  const c = compare(a[f], b[f]);
                  if (c) return c * direction;
                }
                return 0;
              })
              .map((row) => structuredClone(row));
          },
          async unique() {
            return (await this.collect())[0] ?? null;
          },
          async first() {
            return (await this.collect())[0] ?? null;
          },
          async paginate(options) {
            pageReads.push({ table, options: structuredClone(options) });
            const all = await this.collect(),
              start = Number(options.cursor ?? 0),
              end = start + options.numItems;
            return {
              page: all.slice(start, end),
              isDone: end >= all.length,
              continueCursor: String(end),
            };
          },
        };
      },
    },
  };
  return { ctx, rows, put, pageReads };
}
test("column deletion detaches surviving children and cleans only related records", async () => {
  const { ctx, rows, put } = fixture();
  put("tasks", { _id: "e", boardId: "b", columnId: "c", taskType: "epic" });
  put("tasks", { _id: "child", boardId: "b", columnId: "other", epicId: "e" });
  for (const table of [
    "comments",
    "activityLogs",
    "favorites",
    "recentTasks",
  ]) {
    put(table, { _id: table + "deleted", taskId: "e", boardId: "b" });
    put(table, { _id: table + "kept", taskId: "foreign", boardId: "foreign" });
  }
  await load("convex/columns.js").remove.handler(ctx, { id: "c" });
  assert.equal(rows.has("e"), false);
  assert.equal(rows.get("child").epicId, undefined);
  for (const table of [
    "comments",
    "activityLogs",
    "favorites",
    "recentTasks",
  ]) {
    assert.equal(rows.has(table + "deleted"), false);
    assert.equal(rows.has(table + "kept"), true);
  }
});
test("deadline setting, changing, clearing and unchanged omission", async () => {
  const { ctx, rows, put } = fixture();
  put("tasks", { _id: "t", boardId: "b", columnId: "c", title: "Task" });
  const update = load("convex/tasks.ts").update.handler;
  for (const deadline of [10, 20, null]) {
    await update(ctx, { id: "t", deadline });
    assert.equal(rows.get("t").deadline, deadline ?? undefined);
  }
  await update(ctx, { id: "t", deadline: 30 });
  await update(ctx, { id: "t", title: "New" });
  assert.equal(rows.get("t").deadline, 30);
});
test("profile name survives Clerk synchronization", async () => {
  const { ctx, rows } = fixture();
  await load("convex/users.ts").create.handler(ctx, {});
  assert.equal(rows.get("u").name, "Edited");
});

test("single and bulk deletion, demotion of epic, and workspace cascades", async () => {
  for (const mode of ["single", "bulk", "demote", "workspace"]) {
    const { ctx, rows, put } = fixture();
    put("tasks", { _id: "e", boardId: "b", columnId: "c", taskType: "epic" });
    put("tasks", {
      _id: "child",
      boardId: "b",
      columnId: "other",
      epicId: "e",
    });
    put("tasks", { _id: "foreign", boardId: "foreign", columnId: "elsewhere" });
    put("taskTemplates", { _id: "template", boardId: "b" });
    put("recentTasks", { _id: "recent", boardId: "b", taskId: "e" });
    const api = load("convex/tasks.ts");
    if (mode === "single") await api.remove.handler(ctx, { id: "e" });
    if (mode === "bulk")
      await api.bulkRemove.handler(ctx, { taskIds: ["e", "e"] });
    if (mode === "demote")
      await api.update.handler(ctx, { id: "e", taskType: "task" });
    if (mode === "workspace")
      await load("convex/workspaces.js").remove.handler(ctx, { id: "w" });
    assert.equal(rows.has("foreign"), true);
    if (mode === "workspace") {
      assert.equal(rows.has("child"), false);
      assert.equal(rows.has("template"), false);
    } else {
      assert.equal(rows.has("child"), true);
      assert.equal(rows.get("child").epicId, undefined);
    }
    if (mode !== "demote") assert.equal(rows.has("recent"), false);
  }
});
test("session + total timer: pause preserves session, stop then start creates next session", async () => {
  const original = Date.now;
  let clock = 1000;
  Date.now = () => clock;
  try {
    const { ctx, rows, put } = fixture();
    put("tasks", { _id: "t", boardId: "b", columnId: "c" });
    const api = load("convex/tasks.ts"),
      call = (name) => api[name].handler(ctx, { id: "t" });
    await call("startTimer");
    clock += 10000;
    await call("pauseTimer");
    clock += 5000;
    await call("startTimer");
    clock += 3000;
    await call("stopTimer");
    assert.equal(rows.get("t").timerElapsedMs, 13000);
    assert.equal(rows.get("t").timerSessionElapsedMs, 13000);
    const stopped = structuredClone(rows.get("t"));
    clock += 5000;
    await call("stopTimer");
    assert.deepEqual(rows.get("t"), stopped);
    await call("startTimer");
    clock += 2000;
    await call("stopTimer");
    assert.equal(rows.get("t").timerElapsedMs, 15000);
    assert.equal(rows.get("t").timerSessionElapsedMs, 2000);
    put("tasks", {
      _id: "legacy",
      boardId: "b",
      timerStatus: "paused",
      timerElapsedMs: 9000,
    });
    await api.startTimer.handler(ctx, { id: "legacy" });
    clock += 1000;
    await api.stopTimer.handler(ctx, { id: "legacy" });
    assert.equal(rows.get("legacy").timerElapsedMs, 10000);
    assert.equal(rows.get("legacy").timerSessionElapsedMs, undefined);
  } finally {
    Date.now = original;
  }
});
test("actual changes create structured history; no-op does not update timestamp or log", async () => {
  const { ctx, rows, put } = fixture();
  put("tasks", {
    _id: "t",
    boardId: "b",
    columnId: "c",
    title: "Old",
    updatedAt: 1,
  });
  const api = load("convex/tasks.ts");
  await api.update.handler(ctx, { id: "t", title: "Old" });
  assert.equal(rows.get("t").updatedAt, 1);
  const before = [...rows.values()].filter(
    (r) => r.table === "activityLogs",
  ).length;
  await api.update.handler(ctx, {
    id: "t",
    title: "New",
    description: "Description",
    subtasks: [{ text: "Child", completed: false }],
    deadline: 25,
    storyPoints: 3,
    priority: "high",
  });
  const log = [...rows.values()]
    .filter((r) => r.table === "activityLogs")
    .at(-1);
  assert.equal(log.changes.length, 6);
  assert.equal(log.userId, "u");
  assert.equal(log.action, "task.updated");
  await api.bulkUpdate.handler(ctx, { taskIds: ["t"], priority: "high" });
  assert.equal(
    [...rows.values()].filter((r) => r.table === "activityLogs").length,
    before + 1,
  );
  await api.bulkUpdate.handler(ctx, { taskIds: ["t"], priority: "low" });
  assert.equal(
    [...rows.values()].filter((r) => r.table === "activityLogs").at(-1)
      .changes[0].after,
    "low",
  );
  rows.get("t").updatedAt = 1;
  await api.addComment.handler(ctx, { taskId: "t", text: "Comment" });
  assert.ok(rows.get("t").updatedAt > 1);
});
test("closed project analytics and revoked membership do not leak; task permission uses its own project", async () => {
  const { ctx, rows, put } = fixture();
  put("workspaces", { _id: "w", ownerId: "other", name: "Workspace" });
  put("workspaceMembers", { _id: "wm", workspaceId: "w", userId: "u" });
  put("boards", {
    _id: "closed",
    workspaceId: "w",
    userId: "other",
    name: "Secret",
  });
  put("tasks", {
    _id: "secret",
    boardId: "closed",
    columnId: "x",
    title: "Secret",
  });
  const analytics = await load(
    "convex/analytics.ts",
  ).getWorkspaceAnalytics.handler(ctx, { workspaceId: "w" });
  assert.deepEqual(
    analytics.map((x) => x.boardId),
    ["b"],
  );
  await assert.rejects(() =>
    load("convex/tasks.ts").startTimer.handler(ctx, { id: "secret" }),
  );
  put("roles", {
    _id: "viewer",
    workspaceId: "w",
    permissions: ["project.view", "task.view"],
    level: 1,
  });
  put("boardMembers", {
    _id: "bm",
    boardId: "closed",
    userId: "u",
    roleId: "viewer",
  });
  assert.equal(
    (await load("convex/tasks.ts").get.handler(ctx, { id: "secret" }))._id,
    "secret",
  );
  await assert.rejects(() =>
    load("convex/tasks.ts").startTimer.handler(ctx, { id: "secret" }),
  );
  rows.delete("wm");
  await assert.rejects(() =>
    load("convex/tasks.ts").get.handler(ctx, { id: "secret" }),
  );
});

test("bounded task pages search past first page and apply all filters and indexed sort modes", async () => {
  const { ctx, put } = fixture();
  for (let i = 0; i < 35; i++)
    put("tasks", {
      _id: "t" + i,
      boardId: "b",
      columnId: "c",
      userId: "u",
      title: "Task " + String(i).padStart(2, "0"),
      order: i,
      createdAt: i,
      priority: "medium",
    });
  put("users", {
    _id: "former",
    name: "Former Person",
    email: "former@example.invalid",
  });
  put("tasks", {
    _id: "needle",
    boardId: "b",
    columnId: "target",
    userId: "former",
    assigneeId: "former",
    title: "Alpha",
    description: "Unique description",
    order: 99,
    createdAt: 99,
    priority: "high",
    storyPoints: 21,
    deadline: 150,
  });
  const query = load("convex/tasks.ts").page.handler;
  const base = {
    boardId: "b",
    search: "",
    sort: "manual",
    deadline: "all",
    today: 100,
    tomorrow: 200,
  };
  async function all(options) {
    let cursor = null,
      items = [],
      steps = 0;
    do {
      const page = await query(ctx, {
        ...base,
        ...options,
        paginationOpts: { cursor, numItems: 12 },
      });
      assert.ok(page.page.length <= 12);
      items.push(...page.page);
      cursor = page.isDone ? null : page.continueCursor;
      assert.ok(++steps < 30);
    } while (cursor);
    return items;
  }
  for (const search of [
    "unique",
    "alpha",
    "former person",
    "former@example.invalid",
  ])
    assert.deepEqual(
      (await all({ search })).map((t) => t._id),
      ["needle"],
    );
  for (const options of [
    { columnId: "target" },
    { assigneeId: "former" },
    { priority: "high" },
    { storyPoints: 21 },
    { deadline: "today" },
  ])
    assert.deepEqual(
      (await all(options)).map((t) => t._id),
      ["needle"],
    );
  for (const sort of [
    "title",
    "created",
    "deadline",
    "storyPoints",
    "priority",
  ])
    assert.equal((await all({ sort }))[0]._id, "needle");
  assert.equal((await all({ assigneeId: null })).length, 35);
  assert.equal((await all({ deadline: "none" })).length, 35);
  assert.equal((await all({})).length, 36);
  put("tasks", {
    _id: "legacy",
    boardId: "b",
    columnId: "c",
    title: "Legacy",
    order: 100,
    priority: "legacy-priority",
  });
  assert.equal((await all({ sort: "priority" })).at(-1)._id, "legacy");
});

test("directory pages continue past first page, protect memberships and tolerate user bootstrap", async () => {
  const { ctx, put, rows } = fixture();
  const directory = load("convex/lib/directoryQueries.ts");
  async function all(name, args) {
    let cursor = null;
    const items = [];
    for (let i = 0; i < 100; i++) {
      const result = await directory[name].handler(ctx, {
        ...args,
        paginationOpts: { cursor, numItems: 10 },
      });
      items.push(...result.page);
      if (result.isDone) return items;
      cursor = result.continueCursor;
    }
    assert.fail("pagination did not finish");
  }
  for (let i = 0; i < 35; i++) {
    put("boards", {
      _id: "board" + i,
      workspaceId: "w",
      userId: "u",
      order: i,
    });
    put("roles", {
      _id: "role" + i,
      workspaceId: "w",
      name: "Role " + i,
      level: i,
      permissions: [],
    });
    put("users", { _id: "member" + i, name: "Member " + i });
    put("workspaceMembers", { workspaceId: "w", userId: "member" + i });
    put("boardMembers", { boardId: "b", userId: "member" + i });
  }
  assert.equal((await all("projectsPage", { workspaceId: "w" })).length, 36);
  assert.equal((await all("rolesPage", { workspaceId: "w" })).length, 35);
  for (const [name, args] of [
    ["workspaceMembersPage", { workspaceId: "w" }],
    ["projectMembersPage", { boardId: "b" }],
  ]) {
    const members = await all(name, args);
    assert.equal(members.length, 36);
    assert.equal(members.filter((m) => m.isOwner).length, 1);
  }
  put("workspaces", { _id: "joined", ownerId: "other", name: "Joined" });
  put("workspaceMembers", { workspaceId: "joined", userId: "u" });
  assert.deepEqual(
    (await all("workspacesPage", {})).map((w) => w._id),
    ["w", "joined"],
  );
  rows.get("w").ownerId = "other";
  assert.equal((await all("projectsPage", { workspaceId: "w" })).length, 0);
  await assert.rejects(() => all("workspaceMembersPage", { workspaceId: "w" }));
  rows.delete("u");
  assert.deepEqual(await all("workspacesPage", {}), []);
  assert.deepEqual(await all("projectsPage", {}), []);
});

test("project order uses the real adjacent project, without renumbering unseen projects", async () => {
  const { ctx, rows, put } = fixture();
  rows.get("b").order = 100;
  put("boards", { _id: "anchor", workspaceId: "w", userId: "u", order: 10 });
  put("boards", { _id: "unseen", workspaceId: "w", userId: "u", order: 11 });
  const order = await load("convex/lib/projectOrder.ts").projectOrder(
    ctx,
    rows.get("b"),
    "anchor",
    true,
  );
  assert.equal(order, 10.5);
  assert.equal(rows.get("unseen").order, 11);
  put("boards", {
    _id: "foreign",
    workspaceId: "elsewhere",
    userId: "u",
    order: 1,
  });
  await assert.rejects(() =>
    load("convex/lib/projectOrder.ts").projectOrder(
      ctx,
      rows.get("b"),
      "foreign",
      true,
    ),
  );
});

test("substring search traverses empty ranges, preserves all sort/filter arguments and never repeats tasks", async () => {
  const { ctx, put, pageReads } = fixture();
  const query = load("convex/tasks.ts").page.handler;
  const base = {
    boardId: "b",
    search: "iddle",
    sort: "manual",
    deadline: "all",
    today: 100,
    tomorrow: 200,
  };
  put("users", {
    _id: "author",
    name: "Middle Author",
    email: "author@example.invalid",
  });
  put("users", {
    _id: "assignee",
    name: "Person",
    email: "middle@example.invalid",
  });
  for (let i = 0; i < 65; i++)
    put("tasks", {
      _id: "scan" + i,
      boardId: "b",
      columnId: i % 2 ? "c" : "other",
      order: i,
      title:
        i === 40 ? "Middle title" : "Task " + String(65 - i).padStart(2, "0"),
      description: i === 45 ? "a middle description" : "",
      userId: i === 50 ? "author" : "u",
      assigneeId: i === 55 ? "assignee" : undefined,
      priority: i % 2 ? "high" : "low",
      deadline: 200 + i,
      storyPoints: i,
      createdAt: i,
    });
  async function scan(extra = {}) {
    let cursor = null;
    const pages = [];
    for (let n = 0; n < 100; n++) {
      const page = await query(ctx, {
        ...base,
        ...extra,
        paginationOpts: { cursor, numItems: 12 },
      });
      pages.push(page);
      if (page.isDone) return pages;
      cursor = page.continueCursor;
    }
    assert.fail("scan did not terminate");
  }
  const pages = await scan();
  assert.ok(pages.slice(0, 3).every((p) => p.page.length === 0 && !p.isDone));
  const ids = pages.flatMap((p) => p.page.map((t) => t._id));
  assert.deepEqual(ids, ["scan40", "scan45", "scan50", "scan55"]);
  assert.equal(new Set(ids).size, ids.length);
  const absent = await scan({ search: "not present anywhere" });
  assert.ok(absent.every((p) => p.page.length === 0));
  assert.equal(absent.at(-1).isDone, true);
  for (const [sort, expected] of [
    ["manual", ["scan45", "scan55"]],
    ["title", ["scan55", "scan45"]],
    ["created", ["scan55", "scan45"]],
    ["storyPoints", ["scan55", "scan45"]],
    ["deadline", ["scan45", "scan55"]],
    ["priority", ["scan45", "scan55"]],
  ]) {
    const pages = await scan({
      sort,
      columnId: "c",
      priority: "high",
      deadline: "upcoming",
    });
    const ids = pages.flatMap((p) => p.page.map((t) => t._id));
    assert.deepEqual(ids, expected, sort);
    assert.equal(new Set(ids).size, ids.length);
    // Terminal phase remains valid when Convex uses it as a split endCursor.
    assert.ok(JSON.parse(pages.at(-1).continueCursor).phase <= 4);
  }
  await query(ctx, {
    ...base,
    paginationOpts: { cursor: null, numItems: 10000 },
  });
  assert.equal(pageReads.at(-1).options.numItems, 50);
  assert.ok(
    pageReads.every(
      (r) =>
        r.options.maximumRowsRead === 500 &&
        r.options.maximumBytesRead === 1024 * 1024,
    ),
  );
});

test("task search authorizes each project and each continuation before reading tasks", async () => {
  const { ctx, put, rows, pageReads } = fixture();
  put("workspaces", { _id: "w", ownerId: "other" });
  put("workspaceMembers", { _id: "membership", workspaceId: "w", userId: "u" });
  put("boards", {
    _id: "private",
    workspaceId: "w",
    userId: "other",
    name: "Secret",
  });
  const query = load("convex/tasks.ts").page.handler;
  const args = {
    boardId: "private",
    search: "",
    sort: "manual",
    deadline: "all",
    today: 0,
    tomorrow: 1,
    paginationOpts: { cursor: null, numItems: 12 },
  };
  await assert.rejects(() => query(ctx, args));
  assert.equal(pageReads.length, 0);
  put("roles", {
    _id: "view",
    workspaceId: "w",
    permissions: ["task.view"],
    level: 1,
  });
  put("boardMembers", { boardId: "private", userId: "u", roleId: "view" });
  for (let i = 0; i < 20; i++)
    put("tasks", {
      _id: "private" + i,
      boardId: "private",
      title: "Task",
      order: i,
    });
  const first = await query(ctx, args);
  assert.equal(first.isDone, false);
  rows.delete("membership");
  const previousReads = pageReads.length;
  await assert.rejects(() =>
    query(ctx, {
      ...args,
      paginationOpts: { cursor: first.continueCursor, numItems: 12 },
    }),
  );
  assert.equal(pageReads.length, previousReads);
});
