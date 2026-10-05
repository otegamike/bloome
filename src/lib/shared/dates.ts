import type { DayString } from "@/types";

// Pure day-string helpers. A "day" is always YYYY-MM-DD in the user's own
// timezone, never a JS Date timestamp. Arithmetic runs on UTC midnight so
// daylight-saving changes can never shift a result by a day.

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Parse a YYYY-MM-DD string as a UTC-midnight timestamp. Throws on bad input. */
function toUtcMs(day: string): number {
  const m = DAY_RE.exec(day);
  if (!m) throw new Error(`Invalid day string (expected YYYY-MM-DD): ${day}`);
  const y = Number(m[1]);
  const month = Number(m[2]);
  const d = Number(m[3]);
  return Date.UTC(y, month - 1, d);
}

/** Format a UTC-midnight timestamp back to YYYY-MM-DD. */
function fromUtcMs(ms: number): DayString {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}` as DayString;
}

/** Format a moment in a given IANA timezone as YYYY-MM-DD. */
export function toDayString(date: Date, tz: string): DayString {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date) as DayString;
}

/** Today's date as YYYY-MM-DD in the given IANA timezone. */
export function todayInTz(tz: string, now: Date = new Date()): DayString {
  return toDayString(now, tz);
}

/** Local clock time as "HH:mm" (24h) in the given IANA timezone. */
export function localTimeInTz(tz: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

/** Add (or subtract) whole days to a day string. */
export function addDays(day: DayString, n: number): DayString {
  return fromUtcMs(toUtcMs(day) + n * 86_400_000);
}

/** Whole-day difference: diffInDays(a, b) = b - a in days. */
export function diffInDays(a: DayString, b: DayString): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/** Ordering for day strings: -1 when a < b, 0 when equal, 1 when a > b. */
export function compareDays(a: DayString, b: DayString): -1 | 0 | 1 {
  const d = diffInDays(a, b);
  if (d > 0) return -1;
  if (d < 0) return 1;
  return 0;
}

/** True for a real calendar date in YYYY-MM-DD form (2026-02-30 fails). */
export function isValidDay(str: string): str is DayString {
  const m = DAY_RE.exec(str);
  if (!m) return false;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const d = Number(m[3]);
  if (month < 1 || month > 12 || d < 1 || d > 31) return false;
  const check = new Date(Date.UTC(y, month - 1, d));
  return (
    check.getUTCFullYear() === y && check.getUTCMonth() === month - 1 && check.getUTCDate() === d
  );
}

/** True when tz names a real IANA timezone. */
export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** True for a YYYY-MM month string. */
export function isValidMonth(str: string): boolean {
  return MONTH_RE.test(str);
}

/** Every day string in a YYYY-MM month. */
export function monthDays(month: string): DayString[] {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Invalid month string (expected YYYY-MM): ${month}`);
  const year = Number(m[1]);
  const mon = Number(m[2]);
  const count = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const days: DayString[] = [];
  for (let d = 1; d <= count; d += 1) {
    days.push(`${year}-${pad(mon)}-${pad(d)}` as DayString);
  }
  return days;
}
