import type { DayKind, DayState, DayString } from "@/types";
import type { CalendarDay, LogLike, PackLike } from "@/types/api";

import { addDays, compareDays, diffInDays } from "@/lib/shared/dates";

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

/**
 * 1-based position of `day` inside its cycle's placebo block (1 = first
 * placebo day), or null when `day` is not a placebo day.
 */
export function placeboIndex(
  packStart: DayString,
  activeDays: number,
  placeboDays: number,
  day: DayString,
): number | null {
  if (getDayKind(packStart, activeDays, placeboDays, day) !== "placebo") return null;
  return cyclePosition(packStart, activeDays, placeboDays, day) - activeDays + 1;
}

/**
 * The period a start on `startDay` covers: the start day plus up to the next
 * four days, clipped so every day stays inside the same pack's placebo block.
 * Returns [] when `startDay` is not a placebo day.
 */
export function periodDaysFor(
  packStart: DayString,
  activeDays: number,
  placeboDays: number,
  startDay: DayString,
): DayString[] {
  const index = placeboIndex(packStart, activeDays, placeboDays, startDay);
  if (index === null) return [];
  const following = Math.min(4, placeboDays - index);
  const days: DayString[] = [];
  for (let i = 0; i <= following; i += 1) {
    days.push(addDays(startDay, i));
  }
  return days;
}

export interface DayStateArgs {
  kind: DayKind;
  day: DayString;
  today: DayString;
  log?: LogLike | null;
}

export function getDayState({ kind, day, today, log }: DayStateArgs): DayState {
  if (kind === "outside") return "outside";
  if (kind === "placebo") {
    if (!log) return "placebo";
    return log.status === "taken" ? "placeboTaken" : "placeboSkipped";
  }
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
  periodDays: ReadonlySet<DayString>;
}

export function buildDays({ packs, logs, days, today, periodDays }: BuildDaysArgs): CalendarDay[] {
  return days.map((day) => {
    const isPeriod = periodDays.has(day);
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
        isPeriod,
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
      isPeriod,
      log,
    };
  });
}
