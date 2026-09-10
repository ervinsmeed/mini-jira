import { useEffect, useMemo } from "react";
import { usePaginatedQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "../../convex/_generated/api";

type Args = Omit<FunctionArgs<typeof api.tasks.page>, "paginationOpts">;

export function useTaskPages(args: Args | "skip") {
  const page = usePaginatedQuery(api.tasks.page, args, { initialNumItems: 12 });
  const { status, loadMore } = page;
  const results = useMemo(
    () => [...new Map(page.results.map((task) => [task._id, task])).values()],
    [page.results],
  );
  const queryKey = JSON.stringify(args);
  // Empty ranges are not an empty search. Yield between requests so typing or
  // leaving the board cancels the pending continuation. Convex owns the cursors
  // and resets its subscriptions when any search/filter/sort argument changes.
  useEffect(() => {
    if (status !== "CanLoadMore" || results.length !== 0) return;
    const timer = setTimeout(() => loadMore(12), 150);
    return () => clearTimeout(timer);
  }, [queryKey, status, results.length, loadMore]);
  return { ...page, results };
}
