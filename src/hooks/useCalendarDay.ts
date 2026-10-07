"use client";

import { useCalendarStore } from "@/store/useCalendarStore";
import type { CalendarDay } from "@/types/api";
import type { DayString } from "@/types";

/**
 * Live subscription to a single calendar day.
 * Selecting through `months` (instead of the stable `getDay` function)
 * means optimistic mark/undo updates re-render every consumer instantly.
 */
export function useCalendarDay(day: DayString | null): CalendarDay | null {
  return useCalendarStore((s) => {
    if (!day) {
      return null;
    }
    return s.months[day.slice(0, 7)]?.days.find((d) => d.day === day) ?? null;
  });
}
