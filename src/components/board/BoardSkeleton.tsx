import { Skeleton } from "../ui/kit";

const COLUMN_COUNT = 4;
const CARDS_PER_COLUMN = [3, 2, 2, 1];

export default function BoardSkeleton() {
  return (
    <>
      {Array.from({ length: COLUMN_COUNT }, (_, columnIndex) => (
        <div
          key={columnIndex}
          className="column-card w-72 shrink-0 space-y-3 rounded-xl border border-border bg-column p-3"
        >
          <Skeleton width="60%" height="1.25rem" />
          {Array.from({ length: CARDS_PER_COLUMN[columnIndex] }, (_, cardIndex) => (
            <div key={cardIndex} className="space-y-3 rounded-lg border border-border bg-card p-4">
              <Skeleton width="75%" />
              <Skeleton width="30%" height="1.5rem" />
              <Skeleton width="50%" />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
