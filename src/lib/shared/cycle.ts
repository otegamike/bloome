import type { DayKind, DayState, DayString, LogStatus } from "@/types";

/**
 * Work out whether a day is an active-pill day or a placebo day,
 * based on where it falls in the pack cycle. Bodies land in frontend.md.
 */
export function getDayKind(
  _packStart: DayString,
  _activeDays: number,
  _placeboDays: number,
  _day: DayString,
): DayKind {
  void _packStart;
  void _activeDays;
  void _placeboDays;
  void _day;
  throw new Error("not implemented");
}

export interface DayStateArgs {
  kind: DayKind;
  log?: LogStatus;
  day: DayString;
  today: DayString;
}

/**
 * Combine kind + log + today into the state used for rendering.
 * "missed" means a past active day with no log. Placebo days are never missed.
 */
export function getDayState(_args: DayStateArgs): DayState {
  void _args;
  throw new Error("not implemented");
}
