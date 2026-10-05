"use client";

import styles from "./SegmentedTabs.module.css";

interface SegmentedTabsProps<T extends string> {
  options: readonly { value: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
  label: string;
}

export function SegmentedTabs<T extends string>({
  options,
  active,
  onChange,
  label,
}: SegmentedTabsProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === active),
  );
  return (
    <div
      role="tablist"
      aria-label={label}
      data-active={activeIndex}
      data-count={options.length}
      className={styles.container}
    >
      <span aria-hidden="true" className={styles.indicator} />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === active}
          data-active={option.value === active ? "true" : "false"}
          onClick={() => onChange(option.value)}
          className={styles.tab}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
