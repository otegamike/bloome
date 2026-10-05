"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  currentMonthInTz,
  monthLabel,
  olderMonths,
  rangeMonths,
  shiftMonth,
} from "@/client/calendarGrid";
import { addDays } from "@/lib/shared/dates";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAlertStore } from "@/store/useAlertStore";
import { useCalendarStore, type MonthEntry } from "@/store/useCalendarStore";
import { usePackStore } from "@/store/usePackStore";
import { usePrefsStore } from "@/store/usePrefsStore";
import { useSheetStore } from "@/store/useSheetStore";
import { DaySheet } from "@/components/calendar/day-sheet/DaySheet";
import { MonthGrid } from "@/components/calendar/month-grid/MonthGrid";
import { MonthHeader } from "@/components/calendar/month-header/MonthHeader";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import type { CalendarDay } from "@/types/api";
import type { DayString } from "@/types";
import styles from "./CalendarBoard.module.css";

const BACKFILL_CHUNK = 5;
const MAX_PANES = 25;

export function CalendarBoard() {
  const timezone = useCalendarStore((s) => s.timezone);
  const serverToday = useCalendarStore((s) => s.today);
  const months = useCalendarStore((s) => s.months);
  const fetchMonth = useCalendarStore((s) => s.fetchMonth);
  const packs = usePackStore((s) => s.packs);
  const weekStartsOn = usePrefsStore((s) => s.weekStartsOn);
  const reducedMotion = useReducedMotion();
  const [userMonth, setUserMonth] = useState<string | null>(null);
  const sheetDay = useSheetStore((s) => s.day);
  const openSheet = useSheetStore((s) => s.open);
  const closeSheet = useSheetStore((s) => s.close);
  const [focusedDay, setFocusedDay] = useState<DayString | null>(null);
  const [nudge, setNudge] = useState<Record<string, number | undefined>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const paneRefs = useRef(new Map<string, HTMLElement>());
  const pendingScroll = useRef<string | null>(null);
  const announcedRef = useRef<string | null>(null);
  const edgeRef = useRef({ lo: "", width: 0 });

  // The visible month follows the server once it answers, until the user
  // picks a month themselves (by scrolling or with the buttons).
  const month = userMonth ?? serverToday?.slice(0, 7) ?? currentMonthInTz(timezone ?? "UTC");

  const loaded = Object.keys(months).sort();
  let lo = shiftMonth(month, -1);
  let hi = shiftMonth(month, 1);
  if (loaded.length > 0) {
    const first = loaded[0] as string;
    const last = loaded[loaded.length - 1] as string;
    if (first < lo) lo = first;
    if (last > hi) hi = last;
  }
  // Safety cap so a far-flung cache never renders an endless strip.
  const cap = Math.floor(MAX_PANES / 2);
  if (shiftMonth(month, -cap) > lo) lo = shiftMonth(month, -cap);
  if (shiftMonth(month, cap) < hi) hi = shiftMonth(month, cap);
  const panes = rangeMonths(lo, hi);

  const firstPackMonth = packs.reduce<string | null>(
    (earliest, pack) =>
      earliest === null || pack.startDay < earliest ? pack.startDay.slice(0, 7) : earliest,
    null,
  );

  const scrollBehavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";

  const scrollToMonth = useCallback(
    (target: string, behavior: ScrollBehavior) => {
      const container = containerRef.current;
      const pane = paneRefs.current.get(target);
      if (!container || !pane) {
        return;
      }
      container.scrollTo({
        left: pane.offsetLeft - (container.clientWidth - pane.clientWidth) / 2,
        behavior,
      });
    },
    [],
  );

  // Jump straight to the active pane on first paint, no animation.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const pane = paneRefs.current.get(month);
    if (container && pane && edgeRef.current.lo === "") {
      container.scrollLeft =
        pane.offsetLeft - (container.clientWidth - pane.clientWidth) / 2;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prepending older months pushes content right; hold the view steady.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const prev = edgeRef.current;
    if (prev.lo !== "" && lo < prev.lo) {
      container.scrollLeft += container.scrollWidth - prev.width;
    }
    edgeRef.current = { lo, width: container.scrollWidth };
  });

  // The snapped pane is the active month.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || panes.length === 0) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const seen = (entry.target as HTMLElement).dataset.month;
          if (seen) {
            setUserMonth(seen);
          }
        }
      },
      { root: container, threshold: 0.6 },
    );
    for (const pane of panes) {
      const el = paneRefs.current.get(pane);
      if (el) {
        observer.observe(el);
      }
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panes.join("|")]);

  // Announce month changes for screen readers (not the first paint).
  useEffect(() => {
    if (announcedRef.current === null) {
      announcedRef.current = month;
      return;
    }
    if (announcedRef.current !== month) {
      announcedRef.current = month;
      useAlertStore.getState().announce(monthLabel(month));
    }
  }, [month]);

  // Keep the active month loaded; backfill older chunks on reaching the edge.
  useEffect(() => {
    if (!months[month]) {
      void fetchMonth(month);
    }
    if (month <= lo) {
      const chunk = olderMonths(lo, BACKFILL_CHUNK).filter(
        (m) => !months[m] && (!firstPackMonth || m >= firstPackMonth),
      );
      const take = firstPackMonth ? chunk : chunk.slice(-1);
      for (const m of take) {
        void fetchMonth(m);
      }
    }
    if (month >= hi) {
      const next = shiftMonth(hi, 1);
      if (!months[next]) {
        void fetchMonth(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, lo, hi]);

  // Button or keyboard jumps that land outside the rendered strip wait a
  // frame for the pane to exist, then scroll to it.
  useEffect(() => {
    if (pendingScroll.current && paneRefs.current.has(pendingScroll.current)) {
      scrollToMonth(pendingScroll.current, scrollBehavior);
      pendingScroll.current = null;
    }
  });

  // Move DOM focus when keyboard navigation picks a day.
  useEffect(() => {
    if (!focusedDay) {
      return;
    }
    document.querySelector<HTMLElement>(`[data-day="${focusedDay}"]`)?.focus();
  }, [focusedDay, months]);

  const goTo = useCallback(
    (next: string) => {
      if (!paneRefs.current.has(next)) {
        pendingScroll.current = next;
      }
      setUserMonth(next);
      scrollToMonth(next, scrollBehavior);
    },
    [scrollBehavior, scrollToMonth],
  );

  const goToday = useCallback(() => {
    const tz = timezone ?? "UTC";
    const current = serverToday?.slice(0, 7) ?? currentMonthInTz(tz);
    if (!paneRefs.current.has(current)) {
      pendingScroll.current = current;
    }
    setUserMonth(current);
    scrollToMonth(current, scrollBehavior);
    if (serverToday) {
      setFocusedDay(serverToday);
    }
  }, [timezone, serverToday, scrollBehavior, scrollToMonth]);

  const nudgeDay = useCallback((day: DayString) => {
    setNudge((prev) => ({ ...prev, [day]: Date.now() }));
    window.setTimeout(() => {
      setNudge((prev) => {
        const next = { ...prev };
        delete next[day];
        return next;
      });
    }, 300);
  }, []);

  const activate = useCallback(
    (day: CalendarDay) => {
      switch (day.state) {
        case "today": {
          const markDay = useCalendarStore.getState().markDay;
          void markDay(day.day, "taken");
          break;
        }
        case "upcoming":
          nudgeDay(day.day);
          useAlertStore.getState().addAlert({
            kind: "info",
            message: "That day hasn't arrived yet",
          });
          break;
        case "outside":
          break;
        default:
          openSheet(day.day);
      }
    },
    [nudgeDay, openSheet],
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const days = months[month]?.days ?? [];
    if (days.length === 0) {
      return;
    }
    const current = focusedDay ?? serverToday ?? days[0]?.day;
    if (!current) {
      return;
    }
    const move = (delta: number) => {
      const target = addDays(current, delta);
      if (target.slice(0, 7) !== month) {
        goTo(target.slice(0, 7));
      }
      setFocusedDay(target);
    };
    const firstOfRow = (day: DayString) => {
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
      const offset = (weekday - weekStartsOn + 7) % 7;
      return addDays(day, -offset);
    };
    const lastOfRow = (day: DayString) => {
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
      const offset = (6 - ((weekday - weekStartsOn + 7) % 7)) % 7;
      return addDays(day, offset);
    };
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        move(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-7);
        break;
      case "ArrowDown":
        event.preventDefault();
        move(7);
        break;
      case "Home":
        event.preventDefault();
        setFocusedDay(firstOfRow(current));
        break;
      case "End":
        event.preventDefault();
        setFocusedDay(lastOfRow(current));
        break;
      case "PageUp":
        event.preventDefault();
        goTo(shiftMonth(month, -1));
        break;
      case "PageDown":
        event.preventDefault();
        goTo(shiftMonth(month, 1));
        break;
      default:
        break;
    }
  };

  const currentMonth = (serverToday ?? `${month}-01`).slice(0, 7);
  const justChanged = useCalendarStore((s) => s.justChanged);

  return (
    <section aria-label="Calendar" className={styles.board}>
      <MonthHeader
        month={month}
        showToday={month !== currentMonth}
        onPrev={() => goTo(shiftMonth(month, -1))}
        onNext={() => goTo(shiftMonth(month, 1))}
        onToday={goToday}
      />
      <div
        ref={containerRef}
        className={styles.viewport}
        role="region"
        aria-label="Months. Scroll sideways to move between months."
        onKeyDown={handleKeyDown}
      >
        <div className={styles.strip}>
          {panes.map((pane) => (
            <section
              key={pane}
              ref={(el) => {
                if (el) {
                  paneRefs.current.set(pane, el);
                } else {
                  paneRefs.current.delete(pane);
                }
              }}
              data-month={pane}
              aria-label={monthLabel(pane)}
              className={styles.pane}
            >
              <MonthPane
                entry={months[pane]}
                weekStartsOn={weekStartsOn}
                justChanged={justChanged}
                nudge={nudge}
                focusedDay={focusedDay}
                onFocusDay={setFocusedDay}
                onActivate={activate}
                onRetry={() => void fetchMonth(pane, { force: true })}
              />
            </section>
          ))}
        </div>
      </div>
      <DaySheet day={sheetDay} onClose={closeSheet} />
    </section>
  );
}

interface MonthPaneProps {
  entry: MonthEntry | undefined;
  weekStartsOn: 0 | 1;
  justChanged: Record<string, { kind: "marked" | "undone"; at: number } | undefined>;
  nudge: Record<string, number | undefined>;
  focusedDay: DayString | null;
  onFocusDay: (day: DayString) => void;
  onActivate: (day: CalendarDay) => void;
  onRetry: () => void;
}

function MonthPane({
  entry,
  weekStartsOn,
  justChanged,
  nudge,
  focusedDay,
  onFocusDay,
  onActivate,
  onRetry,
}: MonthPaneProps) {
  const status = entry?.status ?? "idle";
  if (status === "error") {
    return (
      <div className={styles.error}>
        <p>Couldn&apos;t load this month.</p>
        <button type="button" onClick={onRetry} className={styles.retry}>
          Try again
        </button>
      </div>
    );
  }
  if (status !== "ready") {
    return (
      <div aria-label="Loading calendar" className={styles.loading}>
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} variant="cell" />
        ))}
      </div>
    );
  }
  return (
    <MonthGrid
      days={entry?.days ?? []}
      weekStartsOn={weekStartsOn}
      justChanged={justChanged}
      nudge={nudge}
      focusedDay={focusedDay}
      onFocusDay={onFocusDay}
      onActivate={onActivate}
    />
  );
}
