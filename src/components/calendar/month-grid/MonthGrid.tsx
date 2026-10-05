"use client";

import { Bud } from "@/components/icons/Bud";
import { Moon } from "@/components/icons/Moon";
import { buildGridCells, dayNumber, longDateLabel, weekdayLabels } from "@/client/calendarGrid";
import type { CalendarDay } from "@/types/api";
import type { DayString } from "@/types";
import styles from "./MonthGrid.module.css";

interface MonthGridProps {
  days: CalendarDay[];
  weekStartsOn: 0 | 1;
  justChanged: Record<string, { kind: "marked" | "undone"; at: number } | undefined>;
  nudge: Record<string, number | undefined>;
  focusedDay: DayString | null;
  onFocusDay: (day: DayString) => void;
  onActivate: (day: CalendarDay) => void;
  slideDirection: "next" | "prev" | null;
}

function cellLabel(day: CalendarDay): string {
  const date = longDateLabel(day.day);
  switch (day.state) {
    case "taken":
      return `${date}, taken`;
    case "skipped":
      return `${date}, skipped`;
    case "missed":
      return `${date}, missed, tap to catch up`;
    case "today":
      return `${date}, today, not logged yet`;
    case "placebo":
      return `${date}, placebo day`;
    case "upcoming":
      return `${date}, upcoming`;
    default:
      return `${date}, ${day.state}`;
  }
}

export function MonthGrid({
  days,
  weekStartsOn,
  justChanged,
  nudge,
  focusedDay,
  onFocusDay,
  onActivate,
  slideDirection,
}: MonthGridProps) {
  const cells = buildGridCells(days, weekStartsOn);
  const labels = weekdayLabels(weekStartsOn);
  return (
    <div>
      <div aria-hidden="true" className={styles.weekdays}>
        {labels.map((label) => (
          <span key={label} className={styles.weekday}>
            {label}
          </span>
        ))}
      </div>
      <div
        role="grid"
        aria-label="Calendar"
        data-slide={slideDirection ?? undefined}
        className={styles.grid}
      >
        {cells.map((cell, index) =>
          cell === null ? (
            <span key={`spacer-${index}`} aria-hidden="true" className={styles.spacer} />
          ) : (
            <DayCell
              key={cell.day}
              day={cell}
              just={justChanged[cell.day]?.kind}
              nudged={nudge[cell.day] !== undefined}
              tabIndex={focusedDay === null ? undefined : focusedDay === cell.day ? 0 : -1}
              onFocusDay={onFocusDay}
              onActivate={onActivate}
            />
          ),
        )}
      </div>
    </div>
  );
}

function DayCell({
  day,
  just,
  nudged,
  tabIndex,
  onFocusDay,
  onActivate,
}: {
  day: CalendarDay;
  just: "marked" | "undone" | undefined;
  nudged: boolean;
  tabIndex: number | undefined;
  onFocusDay: (day: DayString) => void;
  onActivate: (day: CalendarDay) => void;
}) {
  const disabled = day.state === "outside";
  return (
    <button
      type="button"
      role="gridcell"
      aria-label={cellLabel(day)}
      aria-disabled={disabled || undefined}
      data-state={day.state}
      data-just={just}
      data-day={day.day}
      data-nudge={nudged ? "true" : undefined}
      tabIndex={disabled ? -1 : tabIndex}
      onClick={() => onActivate(day)}
      onFocus={() => onFocusDay(day.day)}
      className={styles.cell}
    >
      <span aria-hidden="true" className={styles.date}>
        {dayNumber(day.day)}
      </span>
      {day.isPackStart && day.state !== "outside" ? (
        <span title="New pack starts" className={styles.bud}>
          <Bud size={12} />
        </span>
      ) : null}
      <span aria-hidden="true" className={styles.glyph}>
        {day.state === "taken" ? (
          <svg viewBox="0 0 24 24" className={styles.checkSvg}>
            <path d="M6 12.5l4 4L18 7.5" pathLength={1} className={styles.check} />
          </svg>
        ) : null}
        {day.state === "skipped" ? <span className={styles.dash} /> : null}
        {day.state === "placebo" ? <Moon size={14} /> : null}
        {day.state === "taken" || day.state === "skipped" || day.state === "placebo" ? null : (
          <GlyphFallback state={day.state} />
        )}
        <span aria-hidden="true" className={styles.ripple} />
        <span aria-hidden="true" className={styles.ripple2} />
      </span>
    </button>
  );
}

function GlyphFallback({ state }: { state: string }) {
  if (state === "missed") {
    return <span className={styles.missedRing} />;
  }
  if (state === "today") {
    return <span className={styles.todayRing} />;
  }
  if (state === "upcoming") {
    return <span className={styles.upcomingDot} />;
  }
  return null;
}
