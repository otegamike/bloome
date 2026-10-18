import type { DayString } from "@/types";

// A period day is a separate overlay from a pill log: a day can be both
// "taken"/"skipped" and a period day. Only the overlay lives here.

export interface SharedPeriodDay {
  id: string;
  userId: string;
  day: DayString;
}
