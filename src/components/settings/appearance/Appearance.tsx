"use client";

import { SegmentedTabs } from "@/components/ui/segmented-tabs/SegmentedTabs";
import { ThemePicker } from "@/components/theme/theme-picker/ThemePicker";
import { usePrefsStore } from "@/store/usePrefsStore";
import styles from "./Appearance.module.css";

export function Appearance() {
  const weekStartsOn = usePrefsStore((s) => s.weekStartsOn);
  const setWeekStartsOn = usePrefsStore((s) => s.setWeekStartsOn);

  return (
    <section aria-label="Appearance" className={styles.stack}>
      <div className={styles.card}>
        <h2 className={styles.heading}>Theme</h2>
        <ThemePicker />
      </div>
      <div className={styles.card}>
        <h2 className={styles.heading}>Week starts on</h2>
        <SegmentedTabs
          label="Week starts on"
          active={weekStartsOn === 0 ? "sun" : "mon"}
          onChange={(value) => setWeekStartsOn(value === "sun" ? 0 : 1)}
          options={[
            { value: "mon", label: "Mon" },
            { value: "sun", label: "Sun" },
          ]}
        />
      </div>
    </section>
  );
}
