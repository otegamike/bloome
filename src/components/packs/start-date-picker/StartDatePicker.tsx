"use client";

import { addDays, todayInTz } from "@/lib/shared/dates";
import type { DayString } from "@/types";
import styles from "./StartDatePicker.module.css";

interface StartDatePickerProps {
  value: DayString;
  onChange: (day: DayString) => void;
  maxDay: DayString;
}

function browserToday(): DayString {
  try {
    return todayInTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return todayInTz("UTC");
  }
}

export function StartDatePicker({ value, onChange, maxDay }: StartDatePickerProps) {
  const today = browserToday();
  const yesterday = addDays(today, -1);

  return (
    <div className={styles.wrap}>
      <div className={styles.chips}>
        <button
          type="button"
          data-active={value === today ? "true" : "false"}
          onClick={() => onChange(today)}
          className={styles.chip}
        >
          Today
        </button>
        <button
          type="button"
          data-active={value === yesterday ? "true" : "false"}
          onClick={() => onChange(yesterday)}
          className={styles.chip}
        >
          Yesterday
        </button>
        <button
          type="button"
          data-active={value !== today && value !== yesterday ? "true" : "false"}
          onClick={() => {
            const input = document.getElementById("start-date-input");
            if (input instanceof HTMLInputElement && typeof input.showPicker === "function") {
              input.showPicker();
            } else {
              input?.focus();
            }
          }}
          className={styles.chip}
        >
          Pick a date
        </button>
      </div>
      <input
        id="start-date-input"
        type="date"
        value={value}
        max={maxDay}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
          }
        }}
        className={styles.input}
      />
    </div>
  );
}
