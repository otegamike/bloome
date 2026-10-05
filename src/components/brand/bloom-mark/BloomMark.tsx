import styles from "./BloomMark.module.css";

interface BloomMarkProps {
  size?: number;
  className?: string;
  open?: boolean;
}

export function BloomMark({ size = 56, className, open }: BloomMarkProps) {
  const classes = className ? `${styles.bloom} ${className}` : styles.bloom;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={classes}
      data-open={open ? "true" : undefined}
    >
      <g transform="rotate(0 32 32)">
        <ellipse className={styles.petal} cx="32" cy="17" rx="9" ry="14" />
      </g>
      <g transform="rotate(72 32 32)">
        <ellipse className={styles.petal} cx="32" cy="17" rx="9" ry="14" />
      </g>
      <g transform="rotate(144 32 32)">
        <ellipse className={styles.petal} cx="32" cy="17" rx="9" ry="14" />
      </g>
      <g transform="rotate(216 32 32)">
        <ellipse className={styles.petal} cx="32" cy="17" rx="9" ry="14" />
      </g>
      <g transform="rotate(288 32 32)">
        <ellipse className={styles.petal} cx="32" cy="17" rx="9" ry="14" />
      </g>
      <circle className={styles.core} cx="32" cy="32" r="7" />
    </svg>
  );
}
