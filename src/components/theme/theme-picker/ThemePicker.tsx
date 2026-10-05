"use client";

import { Check } from "@/components/icons/Check";
import { useProfileStore } from "@/store/useProfileStore";
import { useThemeStore } from "@/store/useThemeStore";
import type { ThemeName } from "@/types";
import styles from "./ThemePicker.module.css";

const THEME_META: { name: ThemeName; title: string; mood: string }[] = [
  { name: "blush", title: "Blush", mood: "Soft pastels" },
  { name: "rose", title: "Rose", mood: "Rosy and romantic" },
  { name: "peach", title: "Peach", mood: "Fresh and airy" },
];

export function ThemePicker() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const me = useProfileStore((s) => s.me);

  return (
    <div role="radiogroup" aria-label="Theme" className={styles.row}>
      {THEME_META.map((entry) => (
        <ThemeCard
          key={entry.name}
          entry={entry}
          selected={theme === entry.name}
          onSelect={() => setTheme(entry.name, { persist: me !== null })}
        />
      ))}
    </div>
  );
}

function ThemeCard({
  entry,
  selected,
  onSelect,
}: {
  entry: { name: ThemeName; title: string; mood: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-theme={entry.name}
      data-selected={selected ? "true" : "false"}
      onClick={onSelect}
      className={styles.card}
    >
      <span aria-hidden="true" className={styles.preview}>
        <MiniCell state="taken" />
        <MiniCell state="today" />
        <MiniCell state="missed" />
        <MiniCell state="placebo" />
        <MiniCell state="upcoming" />
        <MiniCell state="skipped" />
        <MiniCell state="taken" />
        <MiniCell state="upcoming" />
        <MiniCell state="today" />
        <MiniCell state="taken" />
        <MiniCell state="placebo" />
        <MiniCell state="missed" />
        <MiniCell state="skipped" />
        <MiniCell state="upcoming" />
      </span>
      <span className={styles.name}>{entry.title}</span>
      <span className={styles.mood}>{entry.mood}</span>
      {selected ? (
        <span className={styles.badge}>
          <Check size={14} />
        </span>
      ) : null}
    </button>
  );
}

const PREVIEW_GLYPH: Record<string, React.ReactNode> = {
  taken: <Check size={8} />,
  missed: null,
  placebo: null,
  today: null,
  upcoming: null,
  skipped: null,
};

function MiniCell({ state }: { state: string }) {
  return (
    <span data-state={state} className={styles.mini}>
      {PREVIEW_GLYPH[state] ?? null}
    </span>
  );
}
