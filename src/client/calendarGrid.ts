import type { CalendarDay } from "@/types/api";
import type { DayString } from "@/types";

/** Pad the month's days with null spacers so the 1st lands in the right column. */
export function buildGridCells(
  days: CalendarDay[],
  weekStartsOn: 0 | 1,
): (CalendarDay | null)[] {
  if (days.length === 0) {
    return [];
  }
  const first = days[0]?.day;
  if (!first) {
    return [...days];
  }
  const [y, m, d] = first.split("-").map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const leading = (weekday - weekStartsOn + 7) % 7;
  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < leading; i += 1) {
    cells.push(null);
  }
  cells.push(...days);
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function weekdayLabels(weekStartsOn: 0 | 1): string[] {
  if (weekStartsOn === 0) {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function monthYear(month: string): { name: string; year: string } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(y, m - 1, 1));
  return {
    name: new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(date),
    year: new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "UTC" }).format(date),
  };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  const out = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return out;
}

export function currentMonthInTz(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
    }).format(new Date());
    return parts.slice(0, 7);
  } catch {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }
}

export function dayNumber(day: DayString): string {
  return String(Number(day.slice(8, 10)));
}

export function longDateLabel(day: DayString): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(new Date(`${day}T00:00:00Z`));
  } catch {
    return day;
  }
}
