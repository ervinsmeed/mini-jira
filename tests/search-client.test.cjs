const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");

// Run the installed Convex pagination hook and our wrapper. Only React's hook
// scheduler, timers and subscription transport are simulated; this is not a DOM test.
function client() {
  const slots = [],
    responses = new Map(),
    timers = new Map();
  let index = 0,
    dirty = false,
    sequence = 0,
    subscriptions = {};
  const effects = new Map();
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const key = index++;
      if (!(key in slots))
        slots[key] = typeof initial === "function" ? initial() : initial;
      return [
        slots[key],
        (value) => {
          slots[key] = typeof value === "function" ? value(slots[key]) : value;
          dirty = true;
        },
      ];
    },
    useMemo(fn, deps) {
      const key = index++;
      if (!same(slots[key]?.deps, deps)) slots[key] = { deps, value: fn() };
      return slots[key].value;
    },
    useEffect(fn, deps) {
      const key = index++;
      if (!same(slots[key]?.deps, deps)) {
        const cleanup = slots[key]?.cleanup;
        slots[key] = { deps, cleanup };
        effects.set(key, () => {
          cleanup?.();
          slots[key].cleanup = fn();
        });
      }
    },
  };
  const nativePath = path.resolve(
    "node_modules/convex/dist/cjs/react/use_paginated_query.js",
  );
  const nativeRequire = createRequire(nativePath);
  const module = { exports: {} };
  const logger = { warn() {} };
  Function(
    "require",
    "module",
    "exports",
    fs.readFileSync(nativePath, "utf8"),
  )(
    (name) => {
      if (name === "react") return react;
      if (name === "./client.js") return { useConvex: () => ({ logger }) };
      if (name === "./use_queries.js")
        return {
          useQueries: (queries) => {
            subscriptions = queries;
            return Object.fromEntries(
              Object.entries(queries).map(([key, request]) => [
                key,
                responses.get(JSON.stringify(request.args)),
              ]),
            );
          },
        };
      return nativeRequire(name);
    },
    module,
    module.exports,
  );
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync("src/lib/useTaskPages.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  Function(
    "require",
    "exports",
    "setTimeout",
    "clearTimeout",
    code,
  )(
    (name) => {
      if (name === "react") return react;
      if (name === "convex/react") return module.exports;
      if (name.endsWith("_generated/api"))
        return { api: { tasks: { page: "tasks:page" } } };
      throw Error(name);
    },
    exports,
    (fn) => {
      timers.set(++sequence, fn);
      return sequence;
    },
    (id) => timers.delete(id),
  );
  return {
    render(args) {
      let result,
        attempts = 0;
      do {
        dirty = false;
        index = 0;
        result = exports.useTaskPages(args);
        assert.ok(++attempts < 20, "render loop");
      } while (dirty);
      for (const effect of effects.values()) effect();
      effects.clear();
      return result;
    },
    requests: () => Object.values(subscriptions),
    respond(request, page, isDone = false, cursor = "next") {
      responses.set(JSON.stringify(request.args), {
        page,
        isDone,
        continueCursor: cursor,
      });
    },
    tick() {
      const scheduled = [...timers.values()];
      timers.clear();
      scheduled.forEach((fn) => fn());
    },
    timerCount: () => timers.size,
  };
}

test("empty ranges continue automatically; only an exhausted search is empty", () => {
  const c = client(),
    args = { boardId: "b", search: "needle", sort: "title" };
  assert.equal(c.render(args).status, "LoadingFirstPage");
  for (let i = 0; i < 3; i++) {
    c.respond(c.requests().at(-1), [], false, "cursor" + i);
    assert.equal(c.render(args).status, "CanLoadMore");
    assert.equal(c.timerCount(), 1);
    c.tick();
    assert.equal(c.render(args).status, "LoadingMore");
  }
  c.respond(c.requests().at(-1), [{ _id: "match" }]);
  const found = c.render(args);
  assert.deepEqual(
    found.results.map((t) => t._id),
    ["match"],
  );
  assert.equal(c.timerCount(), 0);
  found.loadMore(12);
  found.loadMore(12);
  c.render(args);
  assert.equal(c.requests().length, 5, "duplicate clicks load one range");
  c.respond(c.requests().at(-1), [{ _id: "match" }, { _id: "second" }], true);
  assert.deepEqual(
    c.render(args).results.map((t) => t._id),
    ["match", "second"],
  );
  assert.equal(c.render(args).status, "Exhausted");
});

test("query change cancels continuation and ignores late results from old subscriptions", () => {
  const c = client(),
    oldArgs = { boardId: "b", search: "old", sort: "title", priority: "high" };
  c.render(oldArgs);
  const first = c.requests()[0];
  c.respond(first, []);
  c.render(oldArgs);
  c.tick();
  c.render(oldArgs);
  const inFlight = c.requests().at(-1);
  const newArgs = {
    ...oldArgs,
    search: "new",
    sort: "deadline",
    priority: "low",
  };
  assert.equal(c.render(newArgs).status, "LoadingFirstPage");
  assert.equal(c.requests().length, 1);
  assert.equal(c.requests()[0].args.paginationOpts.cursor, null);
  c.respond(inFlight, [{ _id: "stale" }], true);
  assert.deepEqual(c.render(newArgs).results, []);
  const newFirst = c.requests()[0];
  c.respond(newFirst, [], false);
  c.render(newArgs);
  assert.equal(c.timerCount(), 1);
  c.render({ ...newArgs, search: "latest" });
  assert.equal(c.timerCount(), 0);
  c.tick();
  assert.equal(c.requests().length, 1);
  c.respond(c.requests()[0], [], true);
  assert.equal(c.render({ ...newArgs, search: "latest" }).status, "Exhausted");
  assert.equal(c.timerCount(), 0);
});
