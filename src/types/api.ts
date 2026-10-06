import type { DayKind, DayState, DayString, LogStatus, ThemeName } from "@/types";

// Frozen API response contract. A separate UI is built against these exact
// shapes: never rename them, and never add required fields or remove fields.
// CalendarDay's log shape is shared with the cycle helpers below.

export interface ApiErrorBody {
  error: string;
  fields?: Record<string, string[]>;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  image: string | null;
  providers: ("credentials" | "google")[];
  timezone: string;
  theme: ThemeName;
  reminder: { enabled: boolean; time: string; onPlaceboDays: boolean };
  pushDeviceCount: number;
}

export interface PackDTO {
  id: string;
  name: string;
  activeDays: number;
  placeboDays: number;
  startDay: DayString;
  isCurrent: boolean;
}

export interface CalendarDayLog {
  status: LogStatus;
  note: string | null;
  takenAt: string;
  loggedLate: boolean;
}

export interface CalendarDay {
  day: DayString;
  kind: DayKind;
  state: DayState;
  packId: string | null;
  packName: string | null;
  dayInPack: number | null;
  isPackStart: boolean;
  log: CalendarDayLog | null;
}

export interface CalendarResponse {
  month: string;
  today: DayString;
  timezone: string;
  days: CalendarDay[];
}

export interface LogDTO {
  day: DayString;
  status: LogStatus;
  note: string | null;
  takenAt: string;
  loggedLate: boolean;
}

/** Minimal pack shape the pure cycle helpers work with (ids stay strings). */
export interface PackLike {
  id: string;
  name: string;
  startDay: DayString;
  activeDays: number;
  placeboDays: number;
}

/** Minimal log shape the pure cycle helpers work with. */
export type LogLike = CalendarDayLog;

/**
 * Apple Shortcuts status response. `remind`/`marked` are 0|1 numbers because
 * Shortcuts compares numbers reliably in an If action ("Number is 1").
 * Test `remind`, never anything else, to decide whether to notify.
 */
export interface ShortcutStatusResponse {
  ok: true;
  /** The user's local "today" as YYYY-MM-DD. */
  date: DayString;
  /** 1 only when today is an active day (or an opted-in placebo day) and not yet logged. */
  remind: 0 | 1;
  /** 1 when today already has a taken/skipped log. */
  marked: 0 | 1;
  /** APP_NAME — use as the notification title. */
  title: string;
  /** Today's friendly, privacy-safe line — use as the notification body. */
  message: string;
}

export interface ShortcutTokenDTO {
  id: string;
  /** 1–40 chars, e.g. "My iPhone". */
  label: string;
  /** Last 4 chars of the secret, for recognition. */
  lastFour: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}
