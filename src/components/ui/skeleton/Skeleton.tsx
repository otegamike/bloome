import styles from "./Skeleton.module.css";

type SkeletonVariant = "text" | "title" | "card" | "cell" | "dot" | "button" | "chip";

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

export function Skeleton({ variant = "text", className }: SkeletonProps) {
  const classes = [styles.skeleton, styles[variant], className].filter(Boolean).join(" ");
  return <span aria-hidden="true" className={classes} />;
}
