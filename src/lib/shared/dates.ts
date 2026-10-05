import type { DayString } from "@/types";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDay(day: string): asserts day is DayString {
  if (!DAY_RE.test(day)) {
    throw new Error(`Invalid day string (expected YYYY-MM-DD): ${day}`);
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Format a calendar date in a given IANA timezone as YYYY-MM-DD. */
export function toDayString(date: Date, tz: string): DayString {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  assertDay(parts);
  return parts;
}

/** Today's date as YYYY-MM-DD in the given IANA timezone. */
export function todayInTz(tz: string): DayString {
  return toDayString(new Date(), tz);
}

/** Parse a YYYY-MM-DD string as a UTC-midnight timestamp. */
function toUtcMs(day: DayString): number {
  assertDay(day);
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** Format a UTC-midnight timestamp back to YYYY-MM-DD. */
function fromUtcMs(ms: number): DayString {
  const dt = new Date(ms);
  const out = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  assertDay(out);
  return out;
}

/** Add (or subtract) whole days to a day string. */
export function addDays(day: DayString, n: number): DayString {
  return fromUtcMs(toUtcMs(day) + n * 86_400_000);
}

/** Whole-day difference: diffInDays(a, b) = b - a in days. */
export function diffInDays(a: DayString, b: DayString): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/** All day strings for a calendar month (month is 1-12). */
export function daysInMonth(year: number, month: number): DayString[] {
  const days: DayString[] = [];
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= count; d += 1) {
    days.push(`${year}-${pad(month)}-${pad(d)}` as DayString);
  }
  return days;
}
