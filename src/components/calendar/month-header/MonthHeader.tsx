"use client";

import { ChevronLeft } from "@/components/icons/ChevronLeft";
import { ChevronRight } from "@/components/icons/ChevronRight";
import { monthYear } from "@/client/calendarGrid";
import styles from "./MonthHeader.module.css";

interface MonthHeaderProps {
  month: string;
  showToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function MonthHeader({ month, showToday, onPrev, onNext, onToday }: MonthHeaderProps) {
  const { name, year } = monthYear(month);
  return (
    <div className={styles.header}>
      <div className={styles.nav}>
        <button type="button" onClick={onPrev} aria-label="Previous month" className={styles.round}>
          <ChevronLeft size={20} />
        </button>
        <button type="button" onClick={onNext} aria-label="Next month" className={styles.round}>
          <ChevronRight size={20} />
        </button>
      </div>
      <h2 key={month} className={styles.title}>
        {name} <span className={styles.year}>{year}</span>
      </h2>
      {showToday ? (
        <button type="button" onClick={onToday} className={styles.todayPill}>
          Today
        </button>
      ) : (
        <span aria-hidden="true" className={styles.todaySlot} />
      )}
    </div>
  );
}
