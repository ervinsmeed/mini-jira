import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAction } from "../../../hooks/useAction";
import { Button, Input } from "../../ui/kit";

type TaskCommentsProps = {
  taskId: Id<"tasks">;
  canComment: boolean;
};

export default function TaskComments({ taskId, canComment }: TaskCommentsProps) {
  const { t, i18n } = useTranslation();
  const { pending, run } = useAction();
  const [text, setText] = useState("");
  const addComment = useMutation(api.tasks.addComment);
  const { results, status, loadMore } = usePaginatedQuery(
    api.tasks.commentsPage,
    { taskId },
    { initialNumItems: 20 },
  );

  const handleAdd = () =>
    run(async () => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await addComment({ taskId, text: trimmed });
      setText("");
    });

  return (
    <section>
      <h4 className="mb-3 text-sm font-medium text-foreground">
        {t("taskModal.comments")}
      </h4>

      <div className="space-y-3">
        {status === "LoadingFirstPage" ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("taskModal.noComments")}</p>
        ) : (
          results.map((comment) => (
            <article key={comment._id} className="rounded-lg border border-border bg-muted p-3">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                <p className="text-sm font-medium text-foreground">{comment.userName}</p>
                <time className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString(i18n.resolvedLanguage)}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {comment.text}
              </p>
            </article>
          ))
        )}
        {status === "CanLoadMore" && (
          <Button variant="ghost" size="sm" onClick={() => loadMore(20)}>
            {t("pagination.loadMore")}
          </Button>
        )}
      </div>

      <form
        className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAdd();
        }}
      >
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("taskModal.commentPlaceholder")}
          aria-label={t("taskModal.commentPlaceholder")}
          disabled={pending || !canComment}
          className="sm:flex-1"
        />
        <Button type="submit" disabled={pending || !canComment || !text.trim()}>
          {t("taskModal.addComment")}
        </Button>
      </form>
    </section>
  );
}
