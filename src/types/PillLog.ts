import type { DayString, LogStatus } from "@/types";

// Plain shared shape for a pill log (string ids). Only "taken" and
// "skipped" are ever stored — "missed" is derived, never saved.

export interface SharedLog {
  id: string;
  userId: string;
  day: DayString;
  status: LogStatus;
  note: string | null;
  takenAt: string;
  loggedLate: boolean;
}
