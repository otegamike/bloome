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
  reminder: { enabled: boolean; time: string };
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
