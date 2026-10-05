"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { currentMonthInTz, shiftMonth } from "@/client/calendarGrid";
import { addDays } from "@/lib/shared/dates";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAlertStore } from "@/store/useAlertStore";
import { useCalendarStore } from "@/store/useCalendarStore";
import { usePrefsStore } from "@/store/usePrefsStore";
import { useSheetStore } from "@/store/useSheetStore";
import { DaySheet } from "@/components/calendar/day-sheet/DaySheet";
import { MonthGrid } from "@/components/calendar/month-grid/MonthGrid";
import { MonthHeader } from "@/components/calendar/month-header/MonthHeader";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import type { CalendarDay } from "@/types/api";
import type { DayString } from "@/types";
import styles from "./CalendarBoard.module.css";

export function CalendarBoard() {
  const timezone = useCalendarStore((s) => s.timezone);
  const serverToday = useCalendarStore((s) => s.today);
  const fetchMonth = useCalendarStore((s) => s.fetchMonth);
  const weekStartsOn = usePrefsStore((s) => s.weekStartsOn);
  const reducedMotion = useReducedMotion();
  const [userMonth, setUserMonth] = useState<string | null>(null);
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const sheetDay = useSheetStore((s) => s.day);
  const openSheet = useSheetStore((s) => s.open);
  const closeSheet = useSheetStore((s) => s.close);
  const [focusedDay, setFocusedDay] = useState<DayString | null>(null);
  const [nudge, setNudge] = useState<Record<string, number | undefined>>({});
  const swipe = useRef<{ x: number; y: number } | null>(null);

  // The visible month follows the server once it answers, until the user
  // picks a month themselves.
  const month = userMonth ?? serverToday?.slice(0, 7) ?? currentMonthInTz(timezone ?? "UTC");

  const entry = useCalendarStore((s) => s.months[month]);
  const justChanged = useCalendarStore((s) => s.justChanged);
  const markDay = useCalendarStore((s) => s.markDay);

  useEffect(() => {
    void fetchMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Move DOM focus when keyboard navigation picks a day.
  useEffect(() => {
    if (!focusedDay) {
      return;
    }
    document.querySelector<HTMLElement>(`[data-day="${focusedDay}"]`)?.focus();
  }, [focusedDay, entry?.days]);

  const goTo = useCallback(
    (next: string, dir: "next" | "prev") => {
      setDirection(reducedMotion ? null : dir);
      setUserMonth(next);
    },
    [reducedMotion],
  );

  const goToday = useCallback(() => {
    const tz = timezone ?? "UTC";
    goTo(currentMonthInTz(tz), "prev");
    if (serverToday) {
      setFocusedDay(serverToday);
    }
  }, [timezone, serverToday, goTo]);

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
        case "today":
          void markDay(day.day, "taken");
          break;
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
    [markDay, nudgeDay, openSheet],
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const days = entry?.days ?? [];
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
        goTo(target.slice(0, 7), delta > 0 ? "next" : "prev");
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
        goTo(shiftMonth(month, -1), "prev");
        break;
      case "PageDown":
        event.preventDefault();
        goTo(shiftMonth(month, 1), "next");
        break;
      default:
        break;
    }
  };

  const currentMonth = (serverToday ?? `${month}-01`).slice(0, 7);
  const status = entry?.status ?? "idle";

  return (
    <section aria-label="Calendar" className={styles.board}>
      <MonthHeader
        month={month}
        showToday={month !== currentMonth}
        onPrev={() => goTo(shiftMonth(month, -1), "prev")}
        onNext={() => goTo(shiftMonth(month, 1), "next")}
        onToday={goToday}
      />
      <div
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) {
            return;
          }
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            goTo(shiftMonth(month, dx < 0 ? 1 : -1), dx < 0 ? "next" : "prev");
          }
        }}
      >
        {status === "error" ? (
          <div className={styles.error}>
            <p>Couldn&apos;t load this month.</p>
            <button
              type="button"
              onClick={() => void fetchMonth(month, { force: true })}
              className={styles.retry}
            >
              Try again
            </button>
          </div>
        ) : status !== "ready" ? (
          <div aria-label="Loading calendar" className={styles.loading}>
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} variant="cell" />
            ))}
          </div>
        ) : (
          <MonthGrid
            key={month}
            days={entry?.days ?? []}
            weekStartsOn={weekStartsOn}
            justChanged={justChanged}
            nudge={nudge}
            focusedDay={focusedDay}
            onFocusDay={setFocusedDay}
            onActivate={activate}
            slideDirection={direction}
          />
        )}
      </div>
      <DaySheet day={sheetDay} onClose={closeSheet} />
    </section>
  );
}
