import type { CSSProperties } from "react";
import styles from "./Skeleton.module.scss";

type SkeletonProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
};

export function Skeleton({ width = "100%", height = "1rem", className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[styles.skeleton, className].filter(Boolean).join(" ")}
      style={{ width, height }}
    />
  );
}
