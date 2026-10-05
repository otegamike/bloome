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

// Every pane is exactly one viewport wide, so the scroll position IS the
// active month: index = round(scrollLeft / width). No observers, no parked
// scrolls, no navigation flags — the strip position is the single source of
// truth and everything else derives from it.
export function CalendarBoard() {
  const timezone = useCalendarStore((s) => s.timezone);
  const serverToday = useCalendarStore((s) => s.today);
  const months = useCalendarStore((s) => s.months);
  const fetchMonth = useCalendarStore((s) => s.fetchMonth);
  const packs = usePackStore((s) => s.packs);
  const weekStartsOn = usePrefsStore((s) => s.weekStartsOn);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const sheetDay = useSheetStore((s) => s.day);
  const openSheet = useSheetStore((s) => s.open);
  const closeSheet = useSheetStore((s) => s.close);
  const [focusedDay, setFocusedDay] = useState<DayString | null>(null);
  const [nudge, setNudge] = useState<Record<string, number | undefined>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const announcedRef = useRef<string | null>(null);
  const edgeRef = useRef({ lo: "", anchor: "__mount__" });
  // Chains rapid clicks: each press steps from the last requested index so
  // two fast clicks can never land on the same pane. Cleared on arrival.
  const pendingRef = useRef<number | null>(null);

  const fallbackMonth =
    anchor ?? serverToday?.slice(0, 7) ?? currentMonthInTz(timezone ?? "UTC");

  const loaded = Object.keys(months).sort();
  let lo = shiftMonth(fallbackMonth, -1);
  let hi = shiftMonth(fallbackMonth, 1);
  if (loaded.length > 0) {
    const first = loaded[0] as string;
    const last = loaded[loaded.length - 1] as string;
    if (first < lo) lo = first;
    if (last > hi) hi = last;
  }
  // Safety cap so a far-flung cache never renders an endless strip.
  const cap = Math.floor(MAX_PANES / 2);
  if (shiftMonth(fallbackMonth, -cap) > lo) lo = shiftMonth(fallbackMonth, -cap);
  if (shiftMonth(fallbackMonth, cap) < hi) hi = shiftMonth(fallbackMonth, cap);
  const panes = rangeMonths(lo, hi);

  const firstPackMonth = packs.reduce<string | null>(
    (earliest, pack) =>
      earliest === null || pack.startDay < earliest ? pack.startDay.slice(0, 7) : earliest,
    null,
  );

  const displayedMonth = panes[activeIndex] ?? fallbackMonth;
  const currentMonth = (serverToday ?? `${fallbackMonth}-01`).slice(0, 7);

  // Programmatic paging is always instant: the snap container makes each
  // press exactly one pane, with no mid-flight state to go stale. (Gliding
  // belongs to finger swipes, which stay native.) "auto" is deliberately
  // NOT used here — even when the browser would smooth it, a smooth flight
  // plus a mid-flight unmount lands a month off.
  const scrollToIndex = useCallback(
    (target: number) => {
      const container = containerRef.current;
      if (!container || panes.length === 0) {
        return;
      }
      const clamped = Math.max(0, Math.min(target, panes.length - 1));
      pendingRef.current = clamped;
      container.scrollLeft = clamped * container.clientWidth;
    },
    [panes.length],
  );

  // Track the active pane from the scroll position.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const onScroll = () => {
      const width = container.clientWidth;
      if (width === 0 || panes.length === 0) {
        return;
      }
      const index = Math.max(0, Math.min(Math.round(container.scrollLeft / width), panes.length - 1));
      if (pendingRef.current !== null && index === pendingRef.current) {
        pendingRef.current = null;
      }
      setActiveIndex(index);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [panes.length]);

  // Reconcile pixels with panes after every commit. Panes mounting or
  // unmounting at either end shifts content, so move the scroll position by
  // exactly the shift and keep the same month under the view. An explicit
  // recenter (Today) jumps straight to the anchor month instead. The scroll
  // listener then reports the corrected index — this effect never sets it.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || panes.length === 0) {
      return;
    }
    const width = container.clientWidth;
    const prev = edgeRef.current;
    if (prev.lo === "") {
      const start = panes.indexOf(fallbackMonth);
      container.scrollLeft = (start >= 0 ? start : 0) * width;
    } else if (anchor !== null && anchor !== prev.anchor) {
      const idx = panes.indexOf(anchor);
      if (idx >= 0) {
        container.scrollLeft = idx * width;
      }
    } else if (panes.includes(prev.lo)) {
      const k = panes.indexOf(prev.lo);
      if (k > 0) {
        container.scrollLeft += k * width;
      }
    } else {
      // Front unmounted: count the removed months and pull back.
      let k = 0;
      let m = prev.lo;
      while (m < lo && k < 40) {
        m = shiftMonth(m, 1);
        k += 1;
      }
      container.scrollLeft = Math.max(0, container.scrollLeft - k * width);
    }
    edgeRef.current = { lo: panes[0] as string, anchor: anchor ?? "" };
  });

  // Announce month changes for screen readers (not the first paint).
  useEffect(() => {
    if (announcedRef.current === null) {
      announcedRef.current = displayedMonth;
      return;
    }
    if (announcedRef.current !== displayedMonth) {
      announcedRef.current = displayedMonth;
      useAlertStore.getState().announce(monthLabel(displayedMonth));
    }
  }, [displayedMonth]);

  // Keep the visible month loaded; backfill older chunks at the left edge and
  // extend one month past the right edge.
  useEffect(() => {
    if (!months[displayedMonth]) {
      void fetchMonth(displayedMonth);
    }
    if (activeIndex === 0 && panes.length > 0) {
      const chunk = olderMonths(panes[0] as string, BACKFILL_CHUNK).filter(
        (m) => !months[m] && (!firstPackMonth || m >= firstPackMonth),
      );
      const take = firstPackMonth ? chunk : chunk.slice(-1);
      for (const m of take) {
        void fetchMonth(m);
      }
    }
    if (activeIndex === panes.length - 1 && panes.length > 0) {
      const next = shiftMonth(hi, 1);
      if (!months[next]) {
        void fetchMonth(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedMonth, activeIndex, lo, hi]);

  // Move DOM focus when keyboard navigation picks a day.
  useEffect(() => {
    if (!focusedDay) {
      return;
    }
    document.querySelector<HTMLElement>(`[data-day="${focusedDay}"]`)?.focus();
  }, [focusedDay, months]);

  // Step sideways from the last requested pane so rapid clicks chain
  // instead of all landing on the same one.
  const step = useCallback(
    (delta: -1 | 1) => {
      scrollToIndex((pendingRef.current ?? activeIndex) + delta);
    },
    [activeIndex, scrollToIndex],
  );

  const goToday = useCallback(() => {
    // The layout effect recenters on the anchor once its pane mounts.
    setAnchor(currentMonth);
    if (serverToday) {
      setFocusedDay(serverToday);
    }
  }, [currentMonth, serverToday]);

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
    const days = months[displayedMonth]?.days ?? [];
    if (days.length === 0) {
      return;
    }
    const current = focusedDay ?? serverToday ?? days[0]?.day;
    if (!current) {
      return;
    }
    const move = (delta: number) => {
      const target = addDays(current, delta);
      if (target.slice(0, 7) !== displayedMonth) {
        step(delta > 0 ? 1 : -1);
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
        step(-1);
        break;
      case "PageDown":
        event.preventDefault();
        step(1);
        break;
      default:
        break;
    }
  };

  const justChanged = useCalendarStore((s) => s.justChanged);

  return (
    <section aria-label="Calendar" className={styles.board}>
      <MonthHeader
        month={displayedMonth}
        showToday={displayedMonth !== currentMonth}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
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
