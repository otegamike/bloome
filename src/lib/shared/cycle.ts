import type { DayKind, DayState, DayString } from "@/types";
import type { CalendarDay, LogLike, PackLike } from "@/types/api";

import { compareDays, diffInDays } from "@/lib/shared/dates";

// Pure cycle math. A pack is an anchor: days derive from the most recent pack
// with startDay <= day, repeating every (activeDays + placeboDays) days.
// No imports from server code, no database — the client reuses this too.

/** Position of `day` inside its cycle (0-based). Assumes day >= packStart. */
export function cyclePosition(
  packStart: DayString,
  activeDays: number,
  placeboDays: number,
  day: DayString,
): number {
  const length = activeDays + placeboDays;
  return diffInDays(packStart, day) % length;
}

export function getDayKind(
  packStart: DayString,
  activeDays: number,
  placeboDays: number,
  day: DayString,
): DayKind {
  if (compareDays(day, packStart) < 0) return "outside";
  return cyclePosition(packStart, activeDays, placeboDays, day) < activeDays ? "active" : "placebo";
}

/** The latest pack with startDay <= day, or null when the day predates every pack. */
export function resolveAnchor(packs: PackLike[], day: DayString): PackLike | null {
  let anchor: PackLike | null = null;
  for (const pack of packs) {
    if (compareDays(pack.startDay, day) <= 0) {
      if (!anchor || compareDays(anchor.startDay, pack.startDay) < 0) {
        anchor = pack;
      }
    }
  }
  return anchor;
}

export interface DayStateArgs {
  kind: DayKind;
  day: DayString;
  today: DayString;
  log?: LogLike | null;
}

export function getDayState({ kind, day, today, log }: DayStateArgs): DayState {
  if (kind === "outside") return "outside";
  if (kind === "placebo") return "placebo";
  if (log) return log.status;
  const cmp = compareDays(day, today);
  if (cmp > 0) return "upcoming";
  if (cmp === 0) return "today";
  return "missed";
}

export interface BuildDaysArgs {
  packs: PackLike[];
  logs: Record<string, LogLike | undefined>;
  days: DayString[];
  today: DayString;
}

export function buildDays({ packs, logs, days, today }: BuildDaysArgs): CalendarDay[] {
  return days.map((day) => {
    const anchor = resolveAnchor(packs, day);
    if (!anchor) {
      return {
        day,
        kind: "outside" as DayKind,
        state: getDayState({ kind: "outside", day, today }),
        packId: null,
        packName: null,
        dayInPack: null,
        isPackStart: false,
        log: null,
      };
    }
    const kind = getDayKind(anchor.startDay, anchor.activeDays, anchor.placeboDays, day);
    const log = logs[day] ?? null;
    return {
      day,
      kind,
      state: getDayState({ kind, day, today, log }),
      packId: anchor.id,
      packName: anchor.name,
      dayInPack: cyclePosition(anchor.startDay, anchor.activeDays, anchor.placeboDays, day) + 1,
      isPackStart:
        cyclePosition(anchor.startDay, anchor.activeDays, anchor.placeboDays, day) === 0,
      log,
    };
  });
}
