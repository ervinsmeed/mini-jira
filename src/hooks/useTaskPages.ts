import { useEffect, useMemo } from "react";
import { usePaginatedQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "../../convex/_generated/api";

type Args = Omit<FunctionArgs<typeof api.tasks.page>, "paginationOpts">;

export function useTaskPages(args: Args | "skip", autoLoadLimit = 0) {
  const pageSize = autoLoadLimit > 0 ? 50 : 12;
  const page = usePaginatedQuery(api.tasks.page, args, {
    initialNumItems: pageSize,
  });
  const { status, loadMore } = page;
  const results = useMemo(
    () => [...new Map(page.results.map((task) => [task._id, task])).values()],
    [page.results],
  );
  const queryKey = JSON.stringify(args);
  useEffect(() => {
    if (status !== "CanLoadMore") return;
    if (results.length !== 0 && results.length >= autoLoadLimit) return;
    const timer = setTimeout(() => loadMore(pageSize), 150);
    return () => clearTimeout(timer);
  }, [queryKey, status, results.length, loadMore, autoLoadLimit, pageSize]);
  return { ...page, results };
}
