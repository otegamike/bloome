import type { DayKind } from "@/types";

// Pure reminder decision shared by every channel (push sweep, Shortcuts
// status). One function so the table below can't drift between callers.
//
// | Today is                        | onPlaceboDays=true | onPlaceboDays=false |
// |---------------------------------|--------------------|---------------------|
// | Active day, not logged          | remind             | remind              |
// | Active day, logged              | no reminder        | no reminder         |
// | Placebo day                     | remind             | no reminder         |
// | Outside any pack                | no reminder        | no reminder         |

export interface ShouldRemindTodayArgs {
  kind: DayKind;
  /** True when today already has a taken/skipped log. */
  hasLog: boolean;
  /** User preference; missing values resolve to true via resolveOnPlaceboDays. */
  onPlaceboDays: boolean;
}

export function shouldRemindToday({ kind, hasLog, onPlaceboDays }: ShouldRemindTodayArgs): boolean {
  if (kind === "outside") return false;
  if (kind === "placebo") return onPlaceboDays;
  return !hasLog;
}

/**
 * Existing user documents predate the setting, so a missing value means
 * "on". Use this everywhere the preference is read (including lean docs).
 */
export function resolveOnPlaceboDays(value: boolean | null | undefined): boolean {
  return value ?? true;
}
