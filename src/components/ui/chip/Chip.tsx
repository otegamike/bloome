import styles from "./Chip.module.css";

interface ChipProps {
  children: React.ReactNode;
  tone?: "default" | "taken" | "missed" | "placebo" | "skipped" | "secondary";
  className?: string;
}

export function Chip({ children, tone = "default", className }: ChipProps) {
  const classes = [styles.chip, styles[tone], className].filter(Boolean).join(" ");
  return <span className={classes}>{children}</span>;
}
